export const prerender = false;

import { env } from "cloudflare:workers";

const LEAD_TO = "leads@proheargroup.com"; // clinic inbox RaleighOffice@proheargroup.com bounces (mailbox not provisioned) — revert when onePHG creates it
const LEAD_BCC = "local@bidviewmarketing.com"; // BidView monitoring copy (hidden from primary recipient)
const LEAD_FROM = "noreply@bidview.net";
const LEAD_FROM_NAME = "Raleigh Hearing & Tinnitus Center";
const SITE = "Raleigh Hearing & Tinnitus Center";
const THANK_YOU = "/thank-you-for-contacting-us/";

function esc(s: string): string {
	return (s || "").replace(/[\r\n]+/g, " ").trim();
}
function redirectTo(path: string, base: string): Response {
	return new Response(null, { status: 303, headers: { Location: new URL(path, base).toString() } });
}
function hasNonAscii(s: string): boolean {
	for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 127) return true;
	return false;
}
function looksLikeSpam(name: string, email: string, message: string): boolean {
	if (hasNonAscii(name) || hasNonAscii(message)) return true;
	const dom = (email.split("@")[1] || "").toLowerCase();
	if (/(\.ru$|\.top$|\.xyz$|mail\.ru|inbox\.ru|bk\.ru|rambler\.ru|web-library\.net|legenmail\.com|fuhrenmail\.com)/.test(dom)) return true;
	if (/https?:\/\/|\[url|<a\s/i.test(message)) return true;
	if (/\b(btc|bitcoin|crypto|casino|viagra|porn|horny|darknet|escort)\b/i.test(name + " " + message)) return true;
	return false;
}
async function turnstileOk(data: Record<string, string>, request: Request): Promise<boolean> {
	const secret = (env as any).TURNSTILE_SECRET_KEY as string | undefined;
	if (!secret) return true;
	const token = data["cf-turnstile-response"] || data["cf_turnstile_response"] || "";
	if (!token) return true;
	try {
		const ip = request.headers.get("CF-Connecting-IP") || "";
		const body = new URLSearchParams({ secret, response: token });
		if (ip) body.set("remoteip", ip);
		const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
		const j = (await r.json()) as { success?: boolean };
		return !!j.success;
	} catch {
		return false;
	}
}
async function sendViaResend(subject: string, text: string, replyTo: string): Promise<boolean> {
	const key = (env as any).RESEND_API_KEY as string | undefined;
	if (!key) {
		console.error("RESEND_API_KEY not configured");
		return false;
	}
	try {
		const r = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
			body: JSON.stringify({ from: `${LEAD_FROM_NAME} <${LEAD_FROM}>`, to: [LEAD_TO], bcc: [LEAD_BCC], reply_to: replyTo, subject, text }),
		});
		if (!r.ok) {
			console.error("Resend send failed:", r.status, (await r.text()).slice(0, 200));
			return false;
		}
		return true;
	} catch (err) {
		console.error("Resend send error:", err);
		return false;
	}
}
async function saveToD1(d: Record<string, string>): Promise<void> {
	const db = (env as any).DB;
	if (!db) return;
	try {
		await db.prepare(`CREATE TABLE IF NOT EXISTS contact_submissions (id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, extra TEXT, message TEXT, created_at TEXT)`).run();
		await db.prepare(`INSERT INTO contact_submissions (id, name, email, phone, extra, message, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`)
			.bind(crypto.randomUUID(), d.name, d.email, d.phone, d.extra || "", d.message).run();
	} catch (err) {
		console.error("D1 save failed (non-fatal):", err);
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
			form.forEach((v, k) => {
				if (typeof v === "string") data[k] = v;
			});
		}
	} catch {
		return new Response("Bad request", { status: 400 });
	}

	const get = (...ks: string[]) => {
		for (const k of ks) {
			const v = esc((data[k] as string) || "");
			if (v) return v;
		}
		return "";
	};
	const getRaw = (...ks: string[]) => {
		for (const k of ks) {
			const v = ((data[k] as string) || "").trim();
			if (v) return v;
		}
		return "";
	};
	const ok = () =>
		wantsJson
			? new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })
			: redirectTo(THANK_YOU, request.url);
	const fail = (msg: string, status: number) =>
		wantsJson
			? new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { "content-type": "application/json" } })
			: new Response(msg, { status });

	if (get("honeypot", "input_16")) return ok();
	if (!(await turnstileOk(data, request))) return ok();

	const name = get("name", "input_3");
	const email = get("email", "input_5");
	const phone = get("phone", "input_11");
	const message = getRaw("message", "input_14");
	if (!name || !email || !phone || !message) {
		return fail("Please complete your name, email, phone, and message.", 400);
	}
	if (looksLikeSpam(name, email, message)) return ok();

	await saveToD1({ name, email, phone, extra: "", message });

	const text = [`Name:    ${name}`, `Email:   ${email}`, `Phone:   ${phone}`, "", "Message:", message, "", `— Submitted via ${SITE} contact form`].join("\n");
	if (!(await sendViaResend(`New Contact Form Lead — ${name}`, text, email))) {
		return fail("Could not send your message. Please call us instead.", 502);
	}
	return ok();
}

export function GET() {
	return new Response("Method not allowed", { status: 405 });
}
