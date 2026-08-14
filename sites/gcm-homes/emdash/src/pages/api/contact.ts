// Contact / inquiry form backend for Grant C. Meyer Homes.
// Saves every lead to D1 (contact_submissions) and emails it via Resend. Modeled
// on the proven onePHG/Ontario handler. Email is best-effort: if Resend fails the
// lead is still saved to D1, so nothing is ever lost.
//
// Sender is `noreply@bidview.net` (verified on Resend) — NOT Grant's domain, which
// isn't verified. Reply-To is set to the visitor so Grant replies straight to them.
// Destination (LEAD_TO) is a worker var so it can be pointed at Grant's real inbox
// without a code change; until then it goes to the bidview monitoring address.
export const prerender = false;

import { env } from "cloudflare:workers";

const SITE       = "Grant C. Meyer Homes";
const LEAD_FROM  = "noreply@bidview.net";
const LEAD_BCC   = "local@bidviewmarketing.com"; // hidden monitoring copy
const RESEND_API = "https://api.resend.com/emails";

function esc(s: string): string {
	return (s || "").replace(/[\r\n]+/g, " ").trim();
}
function leadTo(): string {
	return (env as any).LEAD_TO || "local@bidviewmarketing.com";
}
async function saveToD1(d: Record<string, string>): Promise<string | null> {
	const db = (env as any).DB;
	if (!db) return "no DB binding";
	try {
		await db.prepare(
			`CREATE TABLE IF NOT EXISTS contact_submissions (
				id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT,
				extra TEXT, message TEXT, created_at TEXT
			)`
		).run();
		await db.prepare(
			`INSERT INTO contact_submissions (id, name, email, phone, extra, message, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
		).bind(crypto.randomUUID(), d.name || "", d.email || "", d.phone || "", d.extra || "", d.message || "").run();
		return null;
	} catch (err: any) {
		console.error("D1 save failed (non-fatal):", err?.message || err);
		return String(err?.message || err);
	}
}

export async function POST({ request }: { request: Request }) {
	const ct = request.headers.get("content-type") || "";
	const accept = request.headers.get("accept") || "";
	const wantsJson = ct.includes("application/json") || accept.includes("application/json");
	const data: Record<string, string> = {};

	try {
		if (ct.includes("application/json")) {
			Object.assign(data, await request.json());
		} else {
			const form = await request.formData();
			form.forEach((v, k) => { if (typeof v === "string") data[k] = v; });
		}
	} catch {
		return new Response("Bad request", { status: 400 });
	}

	const ok = () => wantsJson
		? new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })
		: new Response(null, { status: 303, headers: { Location: new URL("/contact/?sent=1", request.url).toString() } });
	const fail = (msg: string, status: number) => wantsJson
		? new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { "content-type": "application/json" } })
		: new Response(msg, { status });

	// Honeypot — bots fill the hidden `website` field; humans leave it blank.
	if (data.website && data.website.trim() !== "") return ok();

	// Turnstile (optional): only enforced if a secret + token are both present.
	const tsToken = data["cf-turnstile-response"];
	const tsSecret = (env as any).TURNSTILE_SECRET;
	if (tsSecret && tsToken) {
		try {
			const vr = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ secret: tsSecret, response: tsToken }),
			});
			const vd: any = await vr.json();
			if (!vd.success) return fail("Security check failed. Please try again.", 400);
		} catch (err) {
			console.error("Turnstile verify error (non-fatal, allowing):", err);
		}
	}

	const name    = esc(data.name || [data.firstName, data.lastName].filter(Boolean).join(" "));
	const email   = esc(data.email || "");
	const phone   = esc(data.phone || "");
	const reason  = esc(data.reason || data.subject || "");
	const message = (data.message || "").trim();

	if (!name || !email || !message) {
		return fail("Please complete your name, email, and message.", 400);
	}

	await saveToD1({ name, email, phone, extra: reason, message });

	const textBody = [
		`Name:    ${name}`,
		`Email:   ${email}`,
		phone  ? `Phone:   ${phone}`  : null,
		reason ? `Topic:   ${reason}` : null,
		"",
		"Message:",
		message,
		"",
		`— Submitted via ${SITE} website`,
	].filter((l) => l !== null).join("\n");

	const resendKey = (env as any).RESEND_API_KEY;
	if (!resendKey) {
		console.error("RESEND_API_KEY not configured — lead saved to D1 only");
		return ok();
	}
	try {
		const res = await fetch(RESEND_API, {
			method: "POST",
			headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				from: `${SITE} <${LEAD_FROM}>`,
				to: [leadTo()],
				bcc: [LEAD_BCC],
				reply_to: `${name} <${email}>`,
				subject: `New Inquiry — ${name}`,
				text: textBody,
			}),
		});
		if (!res.ok) console.error("Resend send failed (lead in D1):", res.status, await res.text());
	} catch (err) {
		console.error("Resend fetch failed (lead in D1):", err);
	}

	return ok();
}

export function GET() {
	return new Response("Method not allowed", { status: 405 });
}
