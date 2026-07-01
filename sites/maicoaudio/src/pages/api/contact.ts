export const prerender = false;

import { env } from "cloudflare:workers";
// Cloudflare Email Workers — sends via the SEND_EMAIL binding (wrangler.jsonc).
import { EmailMessage } from "cloudflare:email";

const LEAD_TO = "leads@proheargroup.com";
const LEAD_FROM = "noreply@bidview.net";
const SITE = "Maico Audiological Services";
const THANK_YOU = "/thank-you-for-contacting-us/";

function esc(s: string): string {
	return (s || "").replace(/[\r\n]+/g, " ").trim();
}
function redirectTo(path: string, base: string): Response {
	return new Response(null, { status: 303, headers: { Location: new URL(path, base).toString() } });
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
	const wantsJson = ct.includes("application/json");
	const data: Record<string, string> = {};
	try {
		if (wantsJson) {
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

	// (no dedicated honeypot field on this form)
	const first = get("input_1");
	const last = get("input_3");
	const name = `${first} ${last}`.trim();
	const email = get("input_4");
	const phone = get("input_5");
	const message = getRaw("input_7");
	const extra = get("input_6");
	if (!name || !email || !phone || !message) {
		return fail("Please complete your name, email, phone, and message.", 400);
	}

	await saveToD1({ name, email, phone, extra, message });

	const lines = [
		`Name:    ${name}`,
		`Email:   ${email}`,
		`Phone:   ${phone}`,
		extra && !/required/i.test(extra) ? `Clinic:  ${extra}` : null,
		"",
		"Message:",
		message,
		"",
		`— Submitted via ${SITE} contact form`,
	].filter((l) => l !== null).join("\r\n");

	const raw = [
		`From: ${SITE} <${LEAD_FROM}>`,
		`To: ${LEAD_TO}`,
		`Reply-To: ${name} <${email}>`,
		`Subject: New Contact Form Lead — ${name}`,
		`Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@bidview.net>`,
		`Date: ${new Date().toUTCString()}`,
		`MIME-Version: 1.0`,
		`Content-Type: text/plain; charset=utf-8`,
		``,
		lines,
	].join("\r\n");

	try {
		const sendBinding = (env as any).SEND_EMAIL;
		if (!sendBinding) {
			console.error("SEND_EMAIL binding not configured");
			return fail("Email service not configured", 503);
		}
		await sendBinding.send(new EmailMessage(LEAD_FROM, LEAD_TO, raw));
	} catch (err) {
		console.error("Contact form send failed:", err);
		return fail("Could not send your message. Please call us instead.", 502);
	}

	return ok();
}

export function GET() {
	return new Response("Method not allowed", { status: 405 });
}
