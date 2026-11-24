import { env } from "cloudflare:workers";
// @ts-ignore — Cloudflare Email Workers runtime module
import { EmailMessage } from "cloudflare:email";

const DEFAULT_NOTIFY = "vince@bidviewmarketing.com";
const FROM_ADDRESS = "hello@thechicagomarketingagency.com";
const FROM_NAME = "Chicago Marketing Agency";
const MIN_FILL_MS = 2000;
const MAX_FILL_MS = 1000 * 60 * 60 * 24;

export type LeadForm = "contact" | "seo-audit" | "subscribe";
export type LeadStatus = "success" | "saved" | "error";

export interface LeadResult {
	status: LeadStatus;
	message: string;
	/** True only for a real (not spam-flagged) submission. */
	track: boolean;
}

interface LeadFields {
	title: string;
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	service: string;
	website: string;
	message: string;
}

function runtimeEnv(): Record<string, unknown> {
	return env as unknown as Record<string, unknown>;
}

export function notifyRecipients(): string[] {
	const raw = runtimeEnv().LEAD_NOTIFY_EMAILS ?? runtimeEnv().LEAD_NOTIFY_EMAIL ?? DEFAULT_NOTIFY;
	const list = String(raw)
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.includes("@"));
	return list.length > 0 ? list : [DEFAULT_NOTIFY];
}

export function turnstileSiteKey(): string {
	return String(runtimeEnv().TURNSTILE_SITE_KEY || "").trim();
}

export function trackingIds(): { ga: string; gtm: string } {
	const ga = String(runtimeEnv().GA_MEASUREMENT_ID || "").trim();
	const gtm = String(runtimeEnv().GTM_CONTAINER_ID || "").trim();
	return {
		ga: /^G-[A-Z0-9]+$/i.test(ga) ? ga : "",
		gtm: /^GTM-[A-Z0-9]+$/i.test(gtm) ? gtm : "",
	};
}

function spamReason(form: FormData, now = Date.now()): string {
	const honeypot = String(form.get("bv_hp") || "").trim();
	if (honeypot) return "honeypot";
	const started = Number(form.get("form_started") || "");
	if (!Number.isFinite(started) || started <= 0) return "missing-time";
	const elapsed = now - started;
	if (elapsed < MIN_FILL_MS) return `too-fast ${Math.round(elapsed)}ms`;
	if (elapsed > MAX_FILL_MS) return "stale-time";
	return "";
}

async function turnstileReason(token: string, request: Request): Promise<string> {
	const secret = String(runtimeEnv().TURNSTILE_SECRET_KEY || "").trim();
	if (!secret) return "";
	if (!turnstileSiteKey()) {
		console.error("TURNSTILE_SECRET_KEY is set but TURNSTILE_SITE_KEY is empty; skipping Turnstile so leads are not blocked.");
		return "";
	}
	if (!token) return "turnstile-missing";
	if (token.length > 2048) return "turnstile-oversized";
	try {
		const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				secret,
				response: token,
				remoteip: request.headers.get("CF-Connecting-IP") || "",
			}),
		});
		const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
		if (!data.success) return `turnstile-failed ${(data["error-codes"] || []).join(",")}`.trim();
		return "";
	} catch (err) {
		console.error("Turnstile siteverify unreachable; allowing the lead through:", err);
		return "";
	}
}

function readFields(form: FormData, type: LeadForm): { fields?: LeadFields; error?: string } {
	const email = String(form.get("email") || "").trim();
	if (type === "subscribe") {
		if (!email || !email.includes("@") || !email.includes(".")) {
			return { error: "Please enter a valid email address." };
		}
		return {
			fields: {
				title: email,
				firstName: "",
				lastName: "",
				email,
				phone: "",
				service: "",
				website: "",
				message: "Blog newsletter subscription",
			},
		};
	}
	if (type === "seo-audit") {
		const name = String(form.get("name") || "").trim();
		const website = String(form.get("website") || "").trim();
		const phone = String(form.get("phone") || "").trim();
		if (!name || !email || !website) return { error: "Please fill in all required fields." };
		if (!email.includes("@") || !email.includes(".")) return { error: "Please enter a valid email address." };
		return {
			fields: {
				title: name,
				firstName: name,
				lastName: "",
				email,
				phone,
				service: "",
				website,
				message: "",
			},
		};
	}
	const firstName = String(form.get("firstName") || "").trim();
	const lastName = String(form.get("lastName") || "").trim();
	const phone = String(form.get("phone") || "").trim();
	const service = String(form.get("service") || "").trim();
	const message = String(form.get("message") || "").trim();
	if (!firstName || !email || !message) return { error: "Please fill in all required fields." };
	if (!email.includes("@") || !email.includes(".")) return { error: "Please enter a valid email address." };
	const title = [firstName, lastName].filter(Boolean).join(" ") || email;
	return {
		fields: { title, firstName, lastName, email, phone, service, website: "", message },
	};
}

async function saveSubmission(type: LeadForm, fields: LeadFields, blocked: string): Promise<string> {
	const db = runtimeEnv().DB as any;
	const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
	const revId = id + "r";
	const slug = `${type}-${id}`;
	const message = blocked ? `[BLOCKED: ${blocked}]\n${fields.message}` : fields.message;
	const data = JSON.stringify({
		title: fields.title,
		form_type: type,
		first_name: fields.firstName,
		last_name: fields.lastName,
		email: fields.email,
		phone: fields.phone,
		service: fields.service,
		website: fields.website,
		message,
		read_status: blocked ? "spam" : "unread",
	});
	await db.batch([
		db
			.prepare(`INSERT INTO revisions (id, collection, entry_id, data) VALUES (?, 'form_submissions', ?, ?)`)
			.bind(revId, id, data),
		db
			.prepare(
				`INSERT INTO ec_form_submissions (id, slug, status, title, form_type, first_name, last_name, email, phone, service, website, message, read_status, live_revision_id)
				 VALUES (?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				id,
				slug,
				fields.title,
				type,
				fields.firstName,
				fields.lastName,
				fields.email,
				fields.phone,
				fields.service,
				fields.website,
				message,
				blocked ? "spam" : "unread",
				revId,
			),
	]);
	return id;
}

function emailBody(type: LeadForm, fields: LeadFields, id: string): string {
	const lines = [
		`Form: ${type}`,
		`Name: ${fields.title}`,
		`Email: ${fields.email}`,
		fields.phone ? `Phone: ${fields.phone}` : null,
		fields.website ? `Website: ${fields.website}` : null,
		fields.service ? `Service: ${fields.service}` : null,
		fields.message ? "" : null,
		fields.message ? "Message:" : null,
		fields.message || null,
		"",
		`Submission id: ${id}`,
		`Admin: https://thechicagomarketingagency.com/_emdash`,
	];
	return lines.filter((l) => l !== null).join("\n");
}

async function sendNotification(subject: string, body: string, id: string, type: LeadForm): Promise<{ ok: boolean; error?: string }> {
	const recipients = notifyRecipients();
	const failures: string[] = [];
	for (const to of recipients) {
		const raw = [
			`From: ${FROM_NAME} <${FROM_ADDRESS}>`,
			`To: ${to}`,
			`Subject: ${subject}`,
			`MIME-Version: 1.0`,
			`Content-Type: text/plain; charset=UTF-8`,
			``,
			body,
		].join("\r\n");
		try {
			const binding = runtimeEnv().EMAIL as { send: (message: EmailMessage) => Promise<void> };
			await binding.send(new EmailMessage(FROM_ADDRESS, to, raw));
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			failures.push(`${to}: ${message}`);
			console.error(
				JSON.stringify({
					event: "lead_email_failed",
					form: type,
					id,
					recipient: to,
					error: message,
				}),
			);
		}
	}
	if (failures.length === 0) return { ok: true };
	if (failures.length < recipients.length) {
		console.error(
			JSON.stringify({
				event: "lead_email_partial",
				form: type,
				id,
				failures,
			}),
		);
		return { ok: true };
	}
	return { ok: false, error: failures.join("; ") };
}

const SUCCESS: Record<LeadForm, string> = {
	contact: "Thanks! We'll get back to you within 1 business day.",
	"seo-audit": "Your audit request is in. We'll follow up within one business day.",
	subscribe: "You're subscribed. We'll send occasional marketing notes, and you can unsubscribe any time.",
};

const SAVED_NOTE =
	"We saved your request, but the notification email did not send. If you don't hear back within one business day, email hello@thechicagomarketingagency.com.";

export async function handleLead(request: Request, type: LeadForm): Promise<LeadResult> {
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return { status: "error", message: "Something went wrong. Please try again.", track: false };
	}

	const parsed = readFields(form, type);
	if (!parsed.fields) {
		return { status: "error", message: parsed.error || "Please check the form and try again.", track: false };
	}

	const turnstile = await turnstileReason(String(form.get("cf-turnstile-response") || ""), request);
	if (turnstile) {
		console.warn(JSON.stringify({ event: "lead_turnstile_rejected", form: type, reason: turnstile }));
		return {
			status: "error",
			message: "Please complete the verification check and submit again.",
			track: false,
		};
	}

	const blocked = spamReason(form);
	try {
		const id = await saveSubmission(type, parsed.fields, blocked);
		if (blocked) {
			console.warn(JSON.stringify({ event: "lead_blocked", form: type, id, reason: blocked }));
			return { status: "success", message: SUCCESS[type], track: false };
		}
		const subject =
			type === "contact"
				? `New Contact Form: ${parsed.fields.title}`
				: type === "seo-audit"
					? `New SEO Audit Request: ${parsed.fields.title}`
					: `New newsletter subscriber: ${parsed.fields.email}`;
		const mailed = await sendNotification(subject, emailBody(type, parsed.fields, id), id, type);
		if (!mailed.ok) {
			return { status: "saved", message: SAVED_NOTE, track: true };
		}
		return { status: "success", message: SUCCESS[type], track: true };
	} catch (err) {
		console.error(JSON.stringify({ event: "lead_save_failed", form: type, error: err instanceof Error ? err.message : String(err) }));
		return {
			status: "error",
			message: "Something went wrong saving your request. Please email hello@thechicagomarketingagency.com.",
			track: false,
		};
	}
}
