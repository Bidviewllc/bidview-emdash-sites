export const prerender = false;

import { env } from "cloudflare:workers";
import { EmailMessage } from "cloudflare:email";

const LEAD_TO = "leads@proheargroup.com";
const LEAD_FROM = "noreply@bidview.net";
const SITE = "Rose Hearing Healthcare Centers";
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
		await db.prepare(`CREATE TABLE IF NOT EXISTS contact_submissions (id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, clinic TEXT, message TEXT, created_at TEXT)`).run();
		await db.prepare(`INSERT INTO contact_submissions (id, name, email, phone, clinic, message, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`)
			.bind(crypto.randomUUID(), d.name, d.email, d.phone, d.clinic || "", d.message).run();
	} catch (err) {
		console.error("D1 save failed (non-fatal):", err);
	}
}

export async function POST({ request }: { request: Request }) {
	let form: FormData;
	try { form = await request.formData(); } catch { return new Response("Bad request", { status: 400 }); }

	const get = (...ks: string[]) => { for (const k of ks) { const v = esc((form.get(k) as string) || ""); if (v) return v; } return ""; };
	const getRaw = (...ks: string[]) => { for (const k of ks) { const v = ((form.get(k) as string) || "").trim(); if (v) return v; } return ""; };

	// Honeypot — input_10 must stay empty (Gravity Forms anti-spam). Silently succeed if filled.
	if (get("input_10")) return redirectTo(THANK_YOU, request.url);

	const first = get("first_name", "input_1.3", "input_1_3");
	const last = get("last_name", "input_1.6", "input_1_6");
	const name = [first, last].filter(Boolean).join(" ") || get("name");
	const email = get("email", "input_2");
	const phone = get("phone", "input_4");
	const message = getRaw("message", "input_3");
	const clinic = get("clinic", "input_8");
	if (!name || !email || !phone || !message) {
		return new Response("Please complete your name, email, phone, and message.", { status: 400 });
	}

	await saveToD1({ name, email, phone, clinic, message });

	const lines = [
		`Name:    ${name}`,
		`Email:   ${email}`,
		`Phone:   ${phone}`,
		clinic ? `Location: ${clinic}` : null,
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
		if (!sendBinding) { console.error("SEND_EMAIL not configured"); return new Response("Email service not configured", { status: 503 }); }
		await sendBinding.send(new EmailMessage(LEAD_FROM, LEAD_TO, raw));
	} catch (err) {
		console.error("Contact send failed:", err);
		return new Response("Could not send your message. Please call us instead.", { status: 502 });
	}

	return redirectTo(THANK_YOU, request.url);
}

export function GET() {
	return new Response("Method not allowed", { status: 405 });
}
