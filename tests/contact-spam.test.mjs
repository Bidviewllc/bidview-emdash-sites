import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Stub `cloudflare:workers` so every site's `src/pages/api/contact.ts` can be
// imported and exercised end-to-end in Node with an in-memory D1 double + Resend mock.
const mockWorkerEnv = {
	RESEND_API_KEY: "re_test_dummy_key",
	TURNSTILE_SECRET_KEY: "",
	DB: null,
};
globalThis.__mockWorkerEnv = mockWorkerEnv;

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "cloudflare:workers") {
			return { url: "data:text/javascript,export const env = globalThis.__mockWorkerEnv;", shortCircuit: true };
		}
		return nextResolve(specifier, context);
	},
});

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Every Resend + D1 contact handler across the monorepo, with its real form field names.
const SITES = [
	{
		site: "americasbesthearing.com",
		fields: ({ first, last, email, phone, message }) => ({
			"input_1.3": first,
			"input_1.6": last,
			input_3: email,
			input_4: phone,
			input_5: "10086",
			input_6: message,
		}),
	},
	{
		site: "audiologyandhearingcenters",
		fields: ({ first, last, email, phone, message }) => ({
			first_name: first,
			last_name: last,
			email,
			phone,
			clinic: "8514",
			message,
		}),
	},
	{
		site: "campbellhearingsolutions",
		fields: ({ name, email, phone, message }) => ({ name, email, phone, message }),
	},
	{
		site: "jc-audiology.com",
		fields: ({ name, email, phone, message }) => ({ name, email, phone, subject: "Appointment", message }),
	},
	{
		site: "maicoaudio",
		fields: ({ first, last, email, phone, message }) => ({
			input_1: first,
			input_3: last,
			input_4: email,
			input_5: phone,
			input_6: "9769",
			input_7: message,
		}),
	},
	{
		site: "raleighhearingandtinnituscenter.com",
		fields: ({ name, email, phone, message }) => ({ name, email, phone, message }),
	},
	{
		site: "robertshearingclinic-emdash",
		fields: ({ first, last, email, phone, message }) => ({
			first_name: first,
			last_name: last,
			email,
			phone,
			message,
		}),
	},
	{
		site: "rosehearinghealthcarecenters.com",
		fields: ({ first, last, email, phone, message }) => ({
			first_name: first,
			last_name: last,
			email,
			phone,
			clinic: "Algonquin",
			message,
		}),
	},
	{
		site: "wncaudiology.com",
		fields: ({ name, email, phone, message }) => ({ name, email, phone, subject: "Hearing Test", message }),
	},
];

function createMockD1() {
	const rows = [];
	return {
		rows,
		prepare(sql) {
			return {
				async run() {
					return { success: true };
				},
				bind(...args) {
					return {
						async run() {
							if (/INSERT INTO contact_submissions/i.test(sql)) {
								const [id, name, email, phone, extra, message] = args;
								rows.push({ id, name, email, phone, extra, message });
							}
							return { success: true };
						},
					};
				},
			};
		},
	};
}

async function loadContactModule(site) {
	const file = path.join(ROOT, "sites", site, "src", "pages", "api", "contact.ts");
	return import(pathToFileURL(file).href);
}

test("looksLikeSpam allows accented Latin names, smart quotes, em-dashes, and emoji across all 9 sites", async () => {
	for (const { site } of SITES) {
		const mod = await loadContactModule(site);
		assert.equal(typeof mod.looksLikeSpam, "function", `${site} must export looksLikeSpam`);

		// Real patient inputs containing non-ASCII characters that used to be silently dropped:
		assert.equal(
			mod.looksLikeSpam(
				"José García-Muñoz",
				"jose.garcia@example.com",
				"Hello — my mother’s left hearing aid said “low battery” for 2–3 days! 🙏🙂"
			),
			false,
			`${site}: accented names, smart quotes, em/en-dashes, and emoji must NOT be flagged as spam`
		);
		assert.equal(
			mod.looksLikeSpam("Renée O’Connor", "renee@outlook.com", "Looking for a tinnitus evaluation — thank you!"),
			false,
			`${site}: Renée O’Connor + em-dash must pass`
		);

		// Genuine spam must still be flagged:
		assert.equal(
			mod.looksLikeSpam("Привет Борис", "user@gmail.com", "Бесплатные слуховые аппараты"),
			true,
			`${site}: Cyrillic bot text must be flagged`
		);
		assert.equal(
			mod.looksLikeSpam("John Doe", "promo@mail.ru", "Need help with my hearing test"),
			true,
			`${site}: disposable .ru domain must be flagged`
		);
		assert.equal(
			mod.looksLikeSpam("Marketing Bot", "seo@agency.com", "Check out https://spam.example for backlinks"),
			true,
			`${site}: URL in message must be flagged`
		);
		assert.equal(
			mod.looksLikeSpam("Crypto King", "king@gmail.com", "Invest in bitcoin and casino rewards today"),
			true,
			`${site}: crypto/casino keywords must be flagged`
		);
	}
});

test("POST /api/contact saves non-ASCII leads to D1 AND delivers via Resend across all 9 sites", async () => {
	const originalFetch = globalThis.fetch;
	try {
		for (const { site, fields } of SITES) {
			const mod = await loadContactModule(site);
			const db = createMockD1();
			mockWorkerEnv.DB = db;

			const emails = [];
			globalThis.fetch = async (url, init) => {
				if (String(url).includes("api.resend.com/emails")) {
					emails.push(JSON.parse(init.body));
					return new Response(JSON.stringify({ id: "re_123" }), { status: 200 });
				}
				throw new Error(`Unexpected fetch: ${url}`);
			};

			const payload = fields({
				first: "José",
				last: "O’Connor",
				name: "José O’Connor",
				email: "jose.oconnor@example.com",
				phone: "(555) 234-5678",
				message: "My wife’s Oticon aid stopped charging — hoping to book next week (“urgent” before travel) 🙏",
			});

			const req = new Request("https://clinic.example/api/contact", {
				method: "POST",
				headers: { "content-type": "application/json", accept: "application/json" },
				body: JSON.stringify(payload),
			});

			const res = await mod.POST({ request: req });
			assert.equal(res.status, 200, `${site}: expected 200 JSON response`);
			assert.equal(db.rows.length, 1, `${site}: lead must be saved to D1`);
			assert.equal(db.rows[0].name, "José O’Connor", `${site}: accented + curly-apostrophe name preserved in D1`);
			assert.ok(!db.rows[0].extra.startsWith("[SPAM]"), `${site}: real lead must not be marked [SPAM]`);
			assert.ok(db.rows[0].message.includes("—") && db.rows[0].message.includes("🙏"), `${site}: em-dash and emoji preserved in D1`);
			assert.equal(emails.length, 1, `${site}: Resend email must be sent`);
			assert.ok(emails[0].subject.includes("José O’Connor"), `${site}: Resend subject includes patient name`);
			if (site === "raleighhearingandtinnituscenter.com") {
				assert.deepEqual(emails[0].to, ["leads@proheargroup.com"], "Raleigh routes to leads@proheargroup.com (non-bouncing inbox)");
			}
		}
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("POST /api/contact NEVER drops submissions before saveToD1 even when flagged as spam", async () => {
	const originalFetch = globalThis.fetch;
	try {
		for (const { site, fields } of SITES) {
			const mod = await loadContactModule(site);
			const db = createMockD1();
			mockWorkerEnv.DB = db;

			let resendCalls = 0;
			globalThis.fetch = async () => {
				resendCalls++;
				return new Response(JSON.stringify({ id: "re_spam" }), { status: 200 });
			};

			const payload = fields({
				first: "Spam",
				last: "Bot",
				name: "Spam Bot",
				email: "bot@mail.ru",
				phone: "555-000-0000",
				message: "Buy cheap bitcoin at https://spam-casino.example right now",
			});

			const req = new Request("https://clinic.example/api/contact", {
				method: "POST",
				headers: { "content-type": "application/json", accept: "application/json" },
				body: JSON.stringify(payload),
			});

			const res = await mod.POST({ request: req });
			assert.equal(res.status, 200, `${site}: spam response still returns 200 decoy`);
			assert.equal(db.rows.length, 1, `${site}: spam submission is STILL saved to D1 first (never lost before saveToD1)`);
			assert.ok(db.rows[0].extra.startsWith("[SPAM]"), `${site}: spam row tagged with [SPAM] in extra`);
			assert.equal(resendCalls, 0, `${site}: spam must NOT trigger Resend email`);
		}
	} finally {
		globalThis.fetch = originalFetch;
	}
});
