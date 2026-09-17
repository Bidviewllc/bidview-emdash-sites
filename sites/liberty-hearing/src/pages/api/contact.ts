export const prerender = false;

import { env } from "cloudflare:workers";

/**
 * Liberty Hearing Center — appointment request handler.
 *
 * Same shape as the other Bidview emdash sites (Resend + Turnstile + honeypot +
 * D1 backup + 303 to thank-you), with the fixes learned on those builds folded in:
 *
 *  - Body parsing is decoupled from response format. A FormData POST that sends
 *    `Accept: application/json` is parsed as a form but answered with JSON.
 *    Keying both off content-type is what caused ABH's
 *    "Please check the form and try again".
 *  - Every lead is written to D1 BEFORE the email is attempted, so a Resend
 *    outage or quota problem can never lose a lead.
 *  - Bot checks (Turnstile + JS timing token) never DROP a lead: failing
 *    submissions are saved flagged `[BLOCKED: reason]` and just not emailed.
 *  - The spam filter deliberately does NOT reject on non-ASCII characters.
 *    The onePHG sites do, and it silently swallowed a legitimate submission
 *    that merely contained an em-dash. Accented names are normal.
 */

const SITE = "Liberty Hearing Center";
const LEAD_FROM = "noreply@bidview.net"; // bidview.net is the verified Resend domain
const LEAD_BCC = "local@bidviewmarketing.com"; // hidden monitoring copy
const THANK_YOU = "/thank-you/";
const RESEND_API = "https://api.resend.com/emails";

const FIELD_LABELS: Record<string, string> = {
	reason: "Reason for visit",
	time: "Preferred time of day",
};

function esc(s: string): string {
	return (s || "").replace(/[\r\n]+/g, " ").trim();
}

function redirectTo(path: string, base: string): Response {
	return new Response(null, {
		status: 303,
		headers: { Location: new URL(path, base).toString() },
	});
}

/**
 * Conservative spam heuristics, applied only to free-text.
 * Intentionally narrow: a false positive here is a lost patient.
 */
function looksLikeSpam(name: string, message: string): boolean {
	const blob = `${name}\n${message}`.toLowerCase();
	const linkCount = (blob.match(/https?:\/\/|www\.|\[url|<a\s/g) || []).length;
	if (linkCount >= 2) return true;
	if (/\b(?:seo services|backlinks?|crypto|casino|viagra|cialis|loan offer|bitcoin|forex|escort)\b/.test(blob)) return true;
	if (/\[url=|\[\/url\]|bb-?code/.test(blob)) return true;
	// a "message" that is one long unbroken token is almost always junk
	if (/\S{120,}/.test(message)) return true;
	return false;
}

const MIN_FILL_MS = 2000;
const TURNSTILE_ACTION = "contact";
const TURNSTILE_HOSTNAMES = new Set(["libertyhearingcentertx.com", "www.libertyhearingcentertx.com"]);

function botReason(raw: string | undefined): string {
	const v = String(raw ?? "").trim();
	if (v === "") return "no-js";
	const ms = Number(v);
	if (!Number.isFinite(ms) || ms < 0) return "bad-token";
	if (ms < MIN_FILL_MS) return `too-fast ${Math.round(ms)}ms`;
	return "";
}

async function turnstileReason(raw: string | undefined, request: Request): Promise<string> {
	const secret = (env as any).TURNSTILE_SECRET;
	if (!secret) return "";
	const token = String(raw ?? "").trim();
	if (token === "") return "turnstile-missing";
	if (token.length > 2048) return "turnstile-oversized";
	try {
		const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			signal: AbortSignal.timeout(10_000),
			body: new URLSearchParams({ secret, response: token, remoteip: request.headers.get("CF-Connecting-IP") || "" }),
		});
		const r: any = await res.json();
		if (!r.success) return `turnstile-failed ${(r["error-codes"] || []).join(",")}`.trim();
		if (r.action !== TURNSTILE_ACTION) return `turnstile-action ${r.action}`;
		if (!TURNSTILE_HOSTNAMES.has(r.hostname)) return `turnstile-hostname ${r.hostname}`;
		return "";
	} catch (err) {
		console.error("Turnstile siteverify unreachable (allowing):", err);
		return "";
	}
}

async function saveToD1(d: Record<string, string>): Promise<boolean> {
	const db = (env as any).DB;
	if (!db) return false;
	try {
		await db
			.prepare(
				`CREATE TABLE IF NOT EXISTS contact_submissions (
					id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT,
					extra TEXT, message TEXT, created_at TEXT
				)`,
			)
			.run();
		await db
			.prepare(
				`INSERT INTO contact_submissions (id, name, email, phone, extra, message, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
			)
			.bind(crypto.randomUUID(), d.name, d.email, d.phone, d.extra || "", d.message)
			.run();
		return true;
	} catch (err) {
		console.error("D1 save failed (non-fatal):", err);
		return false;
	}
}

export async function POST({ request }: { request: Request }) {
	const ct = request.headers.get("content-type") || "";
	const accept = request.headers.get("accept") || "";
	// parse by content-type, but REPLY in whatever the caller asked for
	const bodyIsJson = ct.includes("application/json");
	const wantsJson = bodyIsJson || accept.includes("application/json");

	const data: Record<string, string> = {};
	try {
		if (bodyIsJson) {
			Object.assign(data, await request.json());
		} else {
			const form = await request.formData();
			form.forEach((v, k) => {
				if (typeof v === "string") data[k] = v;
			});
		}
	} catch {
		return wantsJson
			? new Response(JSON.stringify({ ok: false, error: "Bad request" }), {
					status: 400,
					headers: { "content-type": "application/json" },
				})
			: new Response("Bad request", { status: 400 });
	}

	const ok = () =>
		wantsJson
			? new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "content-type": "application/json" },
				})
			: redirectTo(THANK_YOU, request.url);

	const fail = (msg: string, status: number) =>
		wantsJson
			? new Response(JSON.stringify({ ok: false, error: msg }), {
					status,
					headers: { "content-type": "application/json" },
				})
			: new Response(msg, { status });

	// 1. Honeypot — bots fill the hidden field, humans never see it.
	//    Answer exactly like success so the bot learns nothing.
	if (data.website && data.website.trim() !== "") {
		console.log("Honeypot tripped — dropping submission");
		return ok();
	}

	const get = (...ks: string[]) => {
		for (const k of ks) {
			const v = esc(data[k] || "");
			if (v) return v;
		}
		return "";
	};

	const name = get("name", "fullName");
	const email = get("email");
	const phone = get("phone", "tel");
	const reason = get("reason");
	const time = get("time");
	const message = (data.message || "").trim();

	// 3. Server-side validation (the HTML `required` attributes are only a hint)
	if (!name || !email || !message) {
		return fail("Please complete your name, email, and message.", 400);
	}
	if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
		return fail("Please enter a valid email address.", 400);
	}

	// 4. Spam — rejected BEFORE any email is sent, so junk can never burn quota
	if (looksLikeSpam(name, message)) {
		console.log("Spam filter tripped — dropping submission from", email);
		return ok();
	}

	// 5. Bot checks — FALLBACK COPY of forms-worker/src/index.ts (keep in sync).
	//    Live traffic is served by the `liberty-hearing-forms` Worker via a Workers
	//    Route; this only runs if that route is removed. Blocked = saved, not emailed.
	const blocked =
		(await turnstileReason(data["cf-turnstile-response"], request)) || botReason(data.lhc_fs);

	const extra = [
		blocked && `[BLOCKED: ${blocked}]`,
		reason && `${FIELD_LABELS.reason}: ${reason}`,
		time && `${FIELD_LABELS.time}: ${time}`,
	]
		.filter(Boolean)
		.join(" | ");

	// 6. D1 first — a lead saved here survives any email failure
	const saved = await saveToD1({ name, email, phone, extra, message });

	if (blocked) {
		console.log(`Bot check blocked email (${blocked}), saved=${saved}, from`, email);
		return ok();
	}

	const textBody = [
		`Name:    ${name}`,
		`Email:   ${email}`,
		phone ? `Phone:   ${phone}` : null,
		reason ? `${FIELD_LABELS.reason}: ${reason}` : null,
		time ? `${FIELD_LABELS.time}: ${time}` : null,
		"",
		"Message:",
		message,
		"",
		`— Submitted via the ${SITE} website`,
	]
		.filter((l) => l !== null)
		.join("\n");

	const resendKey = (env as any).RESEND_API_KEY;
	// LEAD_TO may hold several addresses, comma-separated, so recipients can be
	// changed with `wrangler secret put LEAD_TO` and no code change or redeploy.
	const leadTo = String((env as any).LEAD_TO || "")
		.split(",")
		.map((a) => a.trim())
		.filter(Boolean);

	if (!resendKey || leadTo.length === 0) {
		// Not an error the visitor should ever see — the lead is in D1.
		console.error(
			`Email not sent (lead ${saved ? "IS" : "is NOT"} in D1): ` +
				`${!resendKey ? "RESEND_API_KEY missing. " : ""}${leadTo.length === 0 ? "LEAD_TO missing." : ""}`,
		);
		return ok();
	}

	try {
		const res = await fetch(RESEND_API, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${resendKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: `${SITE} <${LEAD_FROM}>`,
				to: leadTo,
				bcc: [LEAD_BCC],
				reply_to: `${name} <${email}>`,
				subject: `New appointment request — ${name}`,
				text: textBody,
			}),
		});
		if (!res.ok) {
			console.error("Resend send failed (lead in D1):", res.status, await res.text());
		}
	} catch (err) {
		console.error("Resend fetch failed (lead in D1):", err);
	}

	return ok();
}

export function GET() {
	return new Response("Method not allowed", { status: 405 });
}
