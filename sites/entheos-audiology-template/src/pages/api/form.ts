// Form submissions (SiteForm.astro). Built on Liberty's form handler, the
// lessons in its header comment kept:
//  - Every submission is saved BEFORE any email, so an email problem never loses a lead.
//  - Nothing is dropped: one that fails a check is saved as "Archived" with the reason
//    in "Spam check", and not emailed. A real lead caught by mistake can be found in
//    Plugins → Submissions (Archived) and moved back.
//  - Bots get the same "thank you" as people, so they learn nothing.
//  - No rejecting non-English letters: accented names and em dashes are normal.
// Checks, in order: hidden "website" trap field, time on the page (the page script
// sends it), Cloudflare Turnstile when TURNSTILE_SECRET is set, spam words and
// links, then an AI check (Workers AI) that only flags, never deletes.
// Email: Resend (RESEND_API_KEY secret) to the form's "Notify emails" in the
// admin, else the practice email on Practice details, with a hidden copy to
// Bidview (LEAD_BCC, default local@bidviewmarketing.com).
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { fieldsOf, getForm, saveSubmission, TRACKING_FIELDS, type FormField } from "../../lib/forms";

export const prerender = false;

type Env = {
	AI?: { run(model: string, input: unknown): Promise<unknown> };
	RESEND_API_KEY?: string;
	LEAD_BCC?: string;
	TURNSTILE_SECRET?: string;
};
const E = env as unknown as Env;

const LEAD_FROM = "noreply@bidview.net"; // bidview.net is Bidview's verified Resend domain
const MIN_FILL_MS = 2000;
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Spam words and link stuffing in the free text. Narrow on purpose: a false positive is a lost patient. */
function ruleReason(text: string): string {
	const blob = text.toLowerCase();
	if ((blob.match(/https?:\/\/|www\.|\[url|<a\s/g) || []).length >= 2) return "two or more links";
	const word = blob.match(/\b(seo services|backlinks?|crypto|casino|viagra|cialis|loan offer|bitcoin|forex|escort|web design services|guest post)\b/);
	if (word) return `spam word "${word[1]}"`;
	if (/\[url=|\[\/url\]/.test(blob)) return "BBCode links";
	if (/\S{120,}/.test(text)) return "one very long unbroken string";
	return "";
}

function timingReason(raw: string): string {
	const v = raw.trim();
	if (!v) return "no JavaScript timing (bot or JavaScript off)";
	const ms = Number(v);
	if (!Number.isFinite(ms) || ms < 0) return "bad timing value";
	if (ms < MIN_FILL_MS) return `sent ${Math.round(ms)} ms after the page opened`;
	return "";
}

async function turnstileReason(token: string, request: Request): Promise<string> {
	if (!E.TURNSTILE_SECRET) return "";
	if (!token) return "Turnstile token missing";
	try {
		const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			signal: AbortSignal.timeout(10_000),
			body: new URLSearchParams({ secret: E.TURNSTILE_SECRET, response: token, remoteip: request.headers.get("CF-Connecting-IP") || "" }),
		});
		const r = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
		return r.success ? "" : `Turnstile failed ${(r["error-codes"] || []).join(",")}`.trim();
	} catch {
		return ""; // Cloudflare unreachable: let it through, the other checks still run
	}
}

/**
 * Workers AI reads the free text and says whether it's spam. Only flags; any
 * error or slow answer counts as "not spam", so the AI can never lose a lead.
 */
let aiNote = "";
async function aiReason(practice: string, text: string): Promise<string> {
	if (!text.trim()) return "";
	if (!E.AI) {
		aiNote = "AI check not set up";
		return "";
	}
	try {
		const out = (await Promise.race([
			E.AI.run(AI_MODEL, {
				messages: [
					{
						role: "system",
						content:
							"You check website form messages sent to a hearing care clinic. Real messages are from patients or family: appointments, hearing tests, hearing aids, repairs, insurance, questions, even short or oddly written ones. Spam is selling something to the clinic (SEO, marketing, web design, leads, software, loans), scams, gibberish, links, or bots. When unsure, say not spam. Answer only JSON: {\"spam\": true|false, \"reason\": \"few words\"}.",
					},
					{ role: "user", content: `Clinic: ${practice}\n\nMessage:\n${text.slice(0, 2000)}` },
				],
				max_tokens: 60,
			}),
			new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
		])) as { response?: unknown };
		// Some models hand back the JSON already parsed, others as text.
		type Verdict = { spam?: boolean | string; reason?: string };
		let v: Verdict | null = null;
		if (out?.response && typeof out.response === "object") v = out.response as Verdict;
		else {
			const m = String(out?.response ?? "").match(/\{[\s\S]*\}/);
			if (m) v = JSON.parse(m[0]) as Verdict;
		}
		if (!v) {
			aiNote = `AI check gave no answer: ${JSON.stringify(out?.response ?? "").slice(0, 60)}`;
			return "";
		}
		v.spam = v.spam === true || v.spam === "true";
		return v.spam ? `AI: ${String(v.reason || "looks like spam").slice(0, 80)}` : "";
	} catch (err) {
		console.error("AI spam check skipped:", err);
		aiNote = `AI check didn't run: ${String(err).slice(0, 80)}`;
		return "";
	}
}

const valueText = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));

export const POST: APIRoute = async ({ request, locals }) => {
	const wantsJson = (request.headers.get("accept") || "").includes("application/json");
	const done = (redirect = "/thank-you") => (wantsJson ? json({ ok: true, redirect }) : Response.redirect(new URL(redirect, request.url), 303));
	const fail = (error: string, status = 400) => (wantsJson ? json({ ok: false, error }, status) : new Response(error, { status }));

	let body: FormData;
	try {
		body = await request.formData();
	} catch {
		return fail("Bad request");
	}
	const one = (k: string) => String(body.get(k) ?? "").trim();
	const slug = one("_form");
	if (!slug) return fail("Unknown form");
	const { id: formId, form } = await getForm(slug).catch(() => ({ id: "", form: null as never }));
	if (!form) return fail("Unknown form", 404);

	// Only the form's own fields are kept (as the Forms plugin does).
	const fields = fieldsOf(form).filter((f) => f.type !== "file");
	const data: Record<string, unknown> = {};
	const missing: FormField[] = [];
	for (const f of fields) {
		const vals = body.getAll(f.name).map((v) => String(v).trim()).filter(Boolean);
		const v = f.type === "checkbox-group" ? vals : (vals[0] ?? "");
		const empty = Array.isArray(v) ? !v.length : !v;
		if (f.required && empty) missing.push(f);
		if (!empty) data[f.name] = v;
	}
	const practice = locals.site?.practice;
	const practiceName = practice?.name ?? "Website";

	// Checks. A missing required field from a person is caught in the browser first,
	// so here it's either a bot or JavaScript off: still saved, flagged.
	aiNote = "";
	const freeText = fields.filter((f) => f.type === "textarea" || f.type === "text").map((f) => valueText(data[f.name])).join("\n");
	const reason =
		(one("website") && "hidden trap field filled in") ||
		(missing.length ? `required field missing (${missing.map((f) => f.label).join(", ")})` : "") ||
		timingReason(one("_fs")) ||
		(await turnstileReason(one("cf-turnstile-response"), request)) ||
		ruleReason(freeText) ||
		(await aiReason(practiceName, freeText));
	if (fields.some((f) => f.name === "spam_check")) data.spam_check = reason ? `Likely spam: ${reason}` : aiNote ? `Passed (${aiNote})` : "Passed";

	// 1. Save first.
	const createdAt = new Date().toISOString();
	let saved = false;
	try {
		await saveSubmission(formId, form, {
			formId,
			data,
			status: reason ? "archived" : "new",
			starred: false,
			createdAt,
			meta: {
				ip: request.headers.get("CF-Connecting-IP"),
				userAgent: request.headers.get("user-agent"),
				referer: request.headers.get("referer"),
				country: request.headers.get("CF-IPCountry"),
			},
		});
		saved = true;
	} catch (err) {
		console.error("Form submission NOT saved:", err);
	}
	if (reason) {
		console.log(`Form "${slug}" flagged (${reason}), saved=${saved}`);
		return done(form.settings.redirectUrl);
	}

	// 2. Email the practice.
	const to = (form.settings.notifyEmails?.length ? form.settings.notifyEmails : [practice?.email ?? ""]).map((a) => a.trim()).filter((a) => /@/.test(a) && !/\.example$/.test(a));
	const name = [data.first, data.last].filter(Boolean).join(" ") || valueText(data.name) || "a website visitor";
	if (!E.RESEND_API_KEY || !to.length) {
		console.error(`Form email not sent (saved=${saved}): ${!E.RESEND_API_KEY ? "RESEND_API_KEY missing. " : ""}${!to.length ? "no recipient." : ""}`);
		if (!saved) return fail("Sorry, that didn't send.", 500);
		return done(form.settings.redirectUrl);
	}
	const lines = [
		`New ${form.name.toLowerCase()} from the ${practiceName} website`,
		"",
		...fields.filter((f) => f.type !== "hidden" && data[f.name] !== undefined).map((f) => `${f.label}: ${valueText(data[f.name])}`),
		"",
		...fields.filter((f) => (TRACKING_FIELDS as readonly string[]).includes(f.name) && f.name !== "spam_check" && data[f.name]).map((f) => `${f.label}: ${valueText(data[f.name])}`),
		saved ? "" : "NOTE: this submission could not be saved in the admin; this email is the only copy.",
	];
	let emailed = false;
	try {
		const email = valueText(data.email);
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: { Authorization: `Bearer ${E.RESEND_API_KEY}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				from: `${practiceName} <${LEAD_FROM}>`,
				to,
				bcc: [E.LEAD_BCC || "local@bidviewmarketing.com"],
				...(/@/.test(email) ? { reply_to: `${name} <${email}>` } : {}),
				subject: `New ${form.name.toLowerCase()}: ${name}`,
				text: lines.join("\n").trim(),
			}),
		});
		emailed = res.ok;
		if (!res.ok) console.error("Resend send failed:", res.status, await res.text());
	} catch (err) {
		console.error("Resend fetch failed:", err);
	}
	return saved || emailed ? done(form.settings.redirectUrl) : fail("Sorry, that didn't send.", 500);
};
