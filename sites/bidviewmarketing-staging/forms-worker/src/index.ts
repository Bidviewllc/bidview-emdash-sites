/**
 * Bidview Marketing — lead form handler (standalone Worker).
 *
 * Ported from the Liberty Hearing forms Worker (sites/liberty-hearing/forms-worker),
 * which carries the lessons learned on the other Bidview sites. Kept separate from
 * the emdash Worker for the same reason: this imports nothing and cold-starts in
 * milliseconds, where the emdash bundle takes seconds.
 *
 * Handles BOTH forms on the site:
 *  - the service-page form (Name, Phone, Email, Website) — no message field
 *  - the /contact-us/ form (Name, Phone, Email, Website, Message)
 *
 * Rules kept from Liberty (do not "simplify" them):
 *  - Every lead is written to D1 BEFORE the email is attempted, so an email
 *    outage can never lose a lead.
 *  - Bot checks never DROP a lead: a failing submission is saved to D1 flagged
 *    `[BLOCKED: reason]` and simply not emailed.
 *  - No rejection on non-ASCII text. Accented names and em-dashes are normal.
 *  - Honeypot and spam hits are SAVED (flagged, not emailed) and answer like
 *    success so a bot learns nothing. Nothing is ever dropped without a D1 row.
 *  - Body parsing is decoupled from response format (FormData + Accept: JSON works).
 *
 * Differences from Liberty:
 *  - The honeypot is `bv_hp`, NOT `website` — `website` is a real field here.
 *  - While the site runs on workers.dev there is no custom domain to route
 *    /api/contact through, so the forms post cross-origin to this Worker's own
 *    URL. The thank-you redirect goes back to the site the visitor came from,
 *    but only if that site is in SITE_ORIGINS (never an open redirect).
 *  - Turnstile is optional: off until TURNSTILE_SECRET is set.
 */

interface Env {
	DB?: D1Database;
	RESEND_API_KEY?: string;
	LEAD_TO?: string;
	TURNSTILE_SECRET?: string;
}

const SITE = "Bidview Marketing";
const LEAD_FROM = "noreply@bidview.net"; // bidview.net is the verified Resend domain
const LEAD_BCC = "local@bidviewmarketing.com"; // hidden monitoring copy
const THANK_YOU = "/thank-you/";
const RESEND_API = "https://api.resend.com/emails";

/** Sites allowed to post here and be redirected back to. */
const SITE_ORIGINS = new Set([
	"https://www.bidviewmarketing.com",
	"https://bidviewmarketing.com",
	"https://bidviewmarketing-staging.cameron-239.workers.dev",
]);
const DEFAULT_ORIGIN = "https://www.bidviewmarketing.com";

function esc(s: string): string {
	return (s || "").replace(/[\r\n]+/g, " ").trim();
}

/** The site origin to send the visitor back to — allowlisted, never user-controlled. */
function siteOrigin(request: Request): string {
	const origin = request.headers.get("Origin");
	if (origin && SITE_ORIGINS.has(origin)) return origin;
	const referer = request.headers.get("Referer");
	if (referer) {
		try {
			const o = new URL(referer).origin;
			if (SITE_ORIGINS.has(o)) return o;
		} catch {
			/* ignore a malformed Referer */
		}
	}
	return DEFAULT_ORIGIN;
}

function sourcePage(request: Request, data: Record<string, string>): string {
	const fromField = esc(data.page || "");
	if (fromField.startsWith("/")) return fromField.slice(0, 300);
	try {
		return new URL(request.headers.get("Referer") || "").pathname.slice(0, 300);
	} catch {
		return "";
	}
}

/**
 * Conservative spam heuristics, applied only to free text.
 * Intentionally narrow: a false positive here is a lost lead.
 */
function looksLikeSpam(name: string, message: string): boolean {
	// Prospects of an SEO agency paste their own site and talk about links, so
	// URLs and SEO words are NOT spam signals here. One match per URL (a URL with
	// both "https://" and "www." used to count twice); only link-stuffing counts.
	const blob = `${name}\n${message}`.toLowerCase();
	const linkCount = (blob.match(/(?:https?:\/\/|www\.)\S+|\[url|<a\s/g) || []).length;
	if (linkCount >= 4) return true;
	if (/\b(?:casino|viagra|cialis|loan offer|escort)\b/.test(blob)) return true;
	if (/\[url=|\[\/url\]|bb-?code/.test(blob)) return true;
	return false;
}

/** Minimum time on the page before a submit counts as human. */
const MIN_FILL_MS = 2000;

/** Returns why a submission looks automated, or "" if it passes. */
function botReason(raw: string | undefined): string {
	const v = String(raw ?? "").trim();
	if (v === "") return "no-js";
	const ms = Number(v);
	if (!Number.isFinite(ms) || ms < 0) return "bad-token";
	if (ms < MIN_FILL_MS) return `too-fast ${Math.round(ms)}ms`;
	return "";
}

const TURNSTILE_ACTION = "lead";

/** Returns why the Turnstile token is NOT acceptable, or "" if it passes / is off. */
async function turnstileReason(env: Env, raw: string | undefined, request: Request): Promise<string> {
	const secret = env.TURNSTILE_SECRET;
	if (!secret) return "";
	const token = String(raw ?? "").trim();
	if (token === "") return "turnstile-missing";
	if (token.length > 2048) return "turnstile-oversized";
	try {
		const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			signal: AbortSignal.timeout(10_000),
			body: new URLSearchParams({
				secret,
				response: token,
				remoteip: request.headers.get("CF-Connecting-IP") || "",
			}),
		});
		const r: any = await res.json();
		if (!r.success) return `turnstile-failed ${(r["error-codes"] || []).join(",")}`.trim();
		if (r.action !== TURNSTILE_ACTION) return `turnstile-action ${r.action}`;
		return "";
	} catch (err) {
		console.error("Turnstile siteverify unreachable (allowing, timing check still applies):", err);
		return "";
	}
}

/**
 * One retry: during testing a single submission answered success but never
 * reached D1 (not reproducible — most likely a transient D1 error). A retry
 * after a short pause is cheap insurance for a lost lead.
 */
async function saveToD1(env: Env, d: Record<string, string>): Promise<boolean> {
	if (await saveOnce(env, d)) return true;
	await new Promise((r) => setTimeout(r, 300));
	return saveOnce(env, d);
}

async function saveOnce(env: Env, d: Record<string, string>): Promise<boolean> {
	const db = env.DB;
	if (!db) return false;
	try {
		await db
			.prepare(
				`CREATE TABLE IF NOT EXISTS contact_submissions (
					id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, website TEXT,
					page TEXT, extra TEXT, message TEXT, created_at TEXT
				)`,
			)
			.run();
		await db
			.prepare(
				`INSERT INTO contact_submissions (id, name, email, phone, website, page, extra, message, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
			)
			.bind(crypto.randomUUID(), d.name, d.email, d.phone, d.website, d.page, d.extra || "", d.message)
			.run();
		return true;
	} catch (err) {
		console.error("D1 save failed (non-fatal):", err);
		return false;
	}
}

async function handlePost(request: Request, env: Env): Promise<Response> {
	const ct = request.headers.get("content-type") || "";
	const accept = request.headers.get("accept") || "";
	const bodyIsJson = ct.includes("application/json");
	const wantsJson = bodyIsJson || accept.includes("application/json");
	const origin = siteOrigin(request);

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
		return wantsJson ? json({ ok: false, error: "Bad request" }, 400) : new Response("Bad request", { status: 400 });
	}

	const ok = () =>
		wantsJson
			? json({ ok: true }, 200)
			: new Response(null, { status: 303, headers: { Location: origin + THANK_YOU } });

	const fail = (msg: string, status: number) =>
		wantsJson ? json({ ok: false, error: msg }, status) : new Response(msg, { status });

	const name = esc(data.name || "");
	const email = esc(data.email || "");
	const phone = esc(data.phone || "");
	const website = esc(data.website || "");
	const message = (data.message || "").trim();
	const page = sourcePage(request, data);

	// 2. Server-side validation (the HTML `required` attributes are only a hint).
	//    Message is optional: the service-page form has no message field.
	if (!name || !email) {
		return fail("Please complete your name and email.", 400);
	}
	if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
		return fail("Please enter a valid email address.", 400);
	}

	// 3. Bot and spam checks. Blocked = saved to D1 but NOT emailed — never a lost
	//    lead. That includes the honeypot and the spam filter: autofill can fill a
	//    hidden field and a heuristic can misfire, so every row is kept for review.
	const blocked =
		(data.bv_hp && data.bv_hp.trim() !== "" ? "honeypot" : "") ||
		(looksLikeSpam(name, message) ? "spam" : "") ||
		(await turnstileReason(env, data["cf-turnstile-response"], request)) ||
		botReason(data.bv_fs);

	const extra = blocked ? `[BLOCKED: ${blocked}]` : "";

	// 4. D1 first — a lead saved here survives any email failure
	const saved = await saveToD1(env, { name, email, phone, website, page, extra, message });

	if (blocked) {
		console.log(`Bot check blocked email (${blocked}), saved=${saved}, from`, email);
		return ok();
	}

	const textBody = [
		`Name:    ${name}`,
		`Email:   ${email}`,
		phone ? `Phone:   ${phone}` : null,
		website ? `Website: ${website}` : null,
		page ? `Page:    ${page}` : null,
		message ? "" : null,
		message ? "Message:" : null,
		message || null,
		"",
		`— Submitted via the ${SITE} website (${origin})`,
	]
		.filter((l) => l !== null)
		.join("\n");

	const resendKey = env.RESEND_API_KEY;
	// LEAD_TO may hold several comma-separated addresses; change it with
	// `wrangler secret put LEAD_TO` — no code change or redeploy needed.
	const leadTo = String(env.LEAD_TO || "")
		.split(",")
		.map((a) => a.trim())
		.filter(Boolean);

	if (!resendKey || leadTo.length === 0) {
		console.error(
			`Email not sent (lead ${saved ? "IS" : "is NOT"} in D1): ` +
				`${!resendKey ? "RESEND_API_KEY missing. " : ""}${leadTo.length === 0 ? "LEAD_TO missing." : ""}`,
		);
		return ok();
	}

	try {
		const res = await fetch(RESEND_API, {
			method: "POST",
			headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				from: `${SITE} <${LEAD_FROM}>`,
				to: leadTo,
				bcc: [LEAD_BCC],
				// Bare address: a display name like "Smith, John" would break parsing.
				reply_to: email,
				subject: `New website lead — ${name}`,
				text: textBody,
			}),
		});
		if (!res.ok) console.error("Resend send failed (lead in D1):", res.status, await res.text());
	} catch (err) {
		console.error("Resend fetch failed (lead in D1):", err);
	}

	return ok();
}

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (!url.pathname.startsWith("/api/contact")) {
			return new Response("Not found", { status: 404 });
		}
		if (request.method === "POST") return handlePost(request, env);
		return new Response("Method not allowed", { status: 405 });
	},
} satisfies ExportedHandler<Env>;
