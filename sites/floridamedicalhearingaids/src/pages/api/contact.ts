export const prerender = false;

import { env } from "cloudflare:workers";
// Cloudflare Email Workers — sends via the SEND_EMAIL binding (wrangler.jsonc).
// Same pattern as sites/audiologyandhearingcenters.
import { EmailMessage } from "cloudflare:email";

const LEAD_TO = "leads@proheargroup.com";
// INTERIM FROM: floridamedicalhearingaids.com runs Google Workspace email (MX -> Google),
// so we do NOT enable Cloudflare Email Routing on it (would break the client's inbox).
// Cloudflare Email Workers only send FROM a domain configured for sending in the account,
// so we send FROM audiologyandhearingcenters.com (a ProHear domain already set up). Leads
// still go TO leads@proheargroup.com; subject/body note "Submitted via floridamedicalhearingaids.com",
// and Reply-To is the submitter. Switch to noreply@floridamedicalhearingaids.com once its
// sending (SPF/DKIM or send-only Email Routing keeping Google MX) is configured.
const LEAD_FROM = "noreply@audiologyandhearingcenters.com";
const THANK_YOU = "/thank-you/";

function esc(s: string): string {
	return (s || "").replace(/[\r\n]+/g, " ").trim();
}

// Mutable 303 redirect (Response.redirect() is immutable and breaks Astro post-processing).
function redirectTo(path: string, base: string): Response {
	return new Response(null, { status: 303, headers: { Location: new URL(path, base).toString() } });
}

export async function POST({ request }: { request: Request }) {
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return new Response("Bad request", { status: 400 });
	}

	// Gravity Forms field names for this site's contact form (public/contact page).
	const get = (k: string) => esc((form.get(k) as string) || "");
	const first = get("input_1");
	const last = get("input_3");
	const email = get("input_4");
	const phone = get("input_5");
	const clinic = get("input_6");
	const message = ((form.get("input_7") as string) || "").trim();

	if (!first || !last || !email || !phone || !message) {
		return new Response("Missing required fields", { status: 400 });
	}

	const fullName = `${first} ${last}`;
	const lines = [
		`Name:    ${fullName}`,
		`Email:   ${email}`,
		`Phone:   ${phone}`,
		clinic && !/required/i.test(clinic) ? `Clinic:  ${clinic}` : null,
		"",
		"Message:",
		message,
		"",
		"— Submitted via floridamedicalhearingaids.com contact form",
	]
		.filter((l) => l !== null)
		.join("\r\n");

	const subject = `New Contact Form Lead — ${fullName}`;
	const date = new Date().toUTCString();
	const msgId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@floridamedicalhearingaids.com>`;
	const raw = [
		`From: Florida Medical Hearing <${LEAD_FROM}>`,
		`To: ${LEAD_TO}`,
		`Reply-To: ${fullName} <${email}>`,
		`Subject: ${subject}`,
		`Message-ID: ${msgId}`,
		`Date: ${date}`,
		`MIME-Version: 1.0`,
		`Content-Type: text/plain; charset=utf-8`,
		``,
		lines,
	].join("\r\n");

	try {
		const sendBinding = (env as any).SEND_EMAIL;
		if (!sendBinding) {
			console.error("SEND_EMAIL binding not configured");
			return new Response("Email service not configured", { status: 503 });
		}
		await sendBinding.send(new EmailMessage(LEAD_FROM, LEAD_TO, raw));
	} catch (err) {
		console.error("Contact form send failed:", err);
		return new Response("Could not send your message. Please call us instead.", { status: 502 });
	}

	return redirectTo(THANK_YOU, request.url);
}

export function GET() {
	return new Response("Method not allowed", { status: 405 });
}
