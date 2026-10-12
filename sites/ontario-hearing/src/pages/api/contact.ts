export const prerender = false;

import { env } from "cloudflare:workers";

const LEAD_TO   = "info@ontariohearing.com";
const LEAD_FROM = "noreply@bidview.net";
const LEAD_CC   = "local@bidviewmarketing.com";
const SITE      = "Ontario Hearing Center";
const THANK_YOU = "/thank-you-for-contacting-us/";
const RESEND_API = "https://api.resend.com/emails";

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
		await db.prepare(
			`CREATE TABLE IF NOT EXISTS contact_submissions (
				id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT,
				extra TEXT, message TEXT, created_at TEXT
			)`
		).run();
		await db
			.prepare(
				`INSERT INTO contact_submissions (id, name, email, phone, extra, message, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
			)
			.bind(crypto.randomUUID(), d.name, d.email, d.phone, d.extra || "", d.message)
			.run();
	} catch (err) {
		console.error("D1 save failed (non-fatal):", err);
	}
}

// ── Google Sheet log (non-fatal; the D1 save and the email are the source of truth) ──
const SHEET_ID = "1SDYTaJF-4i0M5ssBjk2eswp-vak-cSYQ_QmDSXrA1nQ";
const SHEET_RANGE = "Sheet1!A:G";
let sheetToken: { value: string; exp: number } | null = null;

function b64url(input: ArrayBuffer | string): string {
	const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function getSheetToken(saJson: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	if (sheetToken && sheetToken.exp > now + 60) return sheetToken.value;
	const sa = JSON.parse(saJson);
	const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const claim = b64url(JSON.stringify({
		iss: sa.client_email,
		scope: "https://www.googleapis.com/auth/spreadsheets",
		aud: "https://oauth2.googleapis.com/token",
		iat: now,
		exp: now + 3000,
	}));
	const pem = String(sa.private_key).replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
	const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
	const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
	const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claim}`));
	const res = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${head}.${claim}.${b64url(sig)}`,
		signal: AbortSignal.timeout(5000),
	});
	const j: any = await res.json();
	if (!j.access_token) throw new Error("token exchange failed: " + JSON.stringify(j).slice(0, 200));
	sheetToken = { value: j.access_token, exp: now + (j.expires_in || 3000) };
	return sheetToken.value;
}
async function appendToSheet(d: Record<string, string>): Promise<void> {
	const saJson = (env as any).GOOGLE_SA_KEY;
	if (!saJson) {
		console.error("GOOGLE_SA_KEY not configured — lead not added to sheet");
		return;
	}
	try {
		const token = await getSheetToken(saJson);
		const when = new Date().toLocaleString("en-US", {
			timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
			hour: "numeric", minute: "2-digit", hour12: true,
		}).replace(",", "");
		const res = await fetch(
			`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
			{
				method: "POST",
				headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
				body: JSON.stringify({ values: [[when, d.name, d.email, d.phone, d.extra || "", d.message, ""]] }),
				signal: AbortSignal.timeout(5000),
			},
		);
		if (!res.ok) console.error("Sheet append failed (lead in D1):", res.status, (await res.text()).slice(0, 300));
	} catch (err) {
		sheetToken = null;
		console.error("Sheet append error (lead in D1):", err);
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
			form.forEach((v, k) => { if (typeof v === "string") data[k] = v; });
		}
	} catch {
		return new Response("Bad request", { status: 400 });
	}

	// Honeypot: bots fill the hidden website field; real users leave it blank
	if (data.website && data.website.trim() !== "") {
		return redirectTo(THANK_YOU, request.url);
	}

	// Cloudflare Turnstile verification
	const turnstileToken = data["cf-turnstile-response"];
	const turnstileSecret = (env as any).TURNSTILE_SECRET;
	if (turnstileSecret && turnstileToken) {
		try {
			const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ secret: turnstileSecret, response: turnstileToken }),
			});
			const verifyData: any = await verifyRes.json();
			if (!verifyData.success) {
				return wantsJson
					? new Response(JSON.stringify({ ok: false, error: "Security check failed. Please try again." }), { status: 400, headers: { "content-type": "application/json" } })
					: new Response("Security check failed. Please go back and try again.", { status: 400 });
			}
		} catch (err) {
			console.error("Turnstile verify error (non-fatal, allowing submission):", err);
		}
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

	const ok   = () => wantsJson
		? new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })
		: redirectTo(THANK_YOU, request.url);
	const fail = (msg: string, status: number) => wantsJson
		? new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { "content-type": "application/json" } })
		: new Response(msg, { status });

	const firstName = get("firstName");
	const lastName  = get("lastName");
	const name      = [firstName, lastName].filter(Boolean).join(" ");
	const email     = get("email");
	const phone     = get("phone");
	const reason    = get("reason");
	const message   = getRaw("message");

	if (!firstName || !email || !message) {
		return fail("Please complete your name, email, and message.", 400);
	}

	await saveToD1({ name, email, phone, extra: reason, message });
	await appendToSheet({ name, email, phone, extra: reason, message });

	const textBody = [
		`Name:    ${name}`,
		`Email:   ${email}`,
		phone  ? `Phone:   ${phone}`  : null,
		reason ? `Topic:   ${reason}` : null,
		"",
		"Message:",
		message,
		"",
		`— Submitted via ${SITE} contact form`,
	].filter((l) => l !== null).join("\n");

	const resendKey = (env as any).RESEND_API_KEY;
	if (!resendKey) {
		console.error("RESEND_API_KEY not configured — lead saved to D1 only");
		return ok();
	}

	try {
		const res = await fetch(RESEND_API, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${resendKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: `${SITE} <${LEAD_FROM}>`,
				to: [LEAD_TO],
				cc: [LEAD_CC],
				reply_to: `${name} <${email}>`,
				subject: `New Lead — ${name}`,
				text: textBody,
			}),
		});
		if (!res.ok) {
			const err = await res.text();
			console.error("Resend send failed (lead in D1):", res.status, err);
		}
	} catch (err) {
		console.error("Resend fetch failed (lead in D1):", err);
	}

	return ok();
}

export function GET() {
	return new Response("Method not allowed", { status: 405 });
}
