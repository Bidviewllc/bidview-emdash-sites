export const prerender = false;

import { env } from 'cloudflare:workers';
// Cloudflare Email Workers — sends via the SEND_EMAIL binding (wrangler.jsonc)
import { EmailMessage } from 'cloudflare:email';

const LEAD_TO   = 'leads@proheargroup.com';
const LEAD_FROM = 'noreply@audiologyandhearingcenters.com';
const THANK_YOU = '/thank-you/';

// Gravity-Forms field name → friendly label (the static contact form keeps
// the original WP field names; see public/contact-us/index.html)
const FIELD_LABELS: Record<string, string> = {
  'input_1.3': 'First Name',
  'input_1.6': 'Last Name',
  'input_2':   'Email',
  'input_4':   'Phone',
  'input_10':  'Clinic',
  'input_3':   'Message',
};

function esc(s: string): string {
  return (s || '').replace(/[\r\n]+/g, ' ').trim();
}

// Mutable 303 redirect (Response.redirect() is immutable and breaks
// Astro's response post-processing).
function redirectTo(path: string, base: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: new URL(path, base).toString() },
  });
}

export async function POST({ request }: { request: Request }) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Honeypot — input_11 must stay empty (Gravity Forms anti-spam field).
  // If a bot filled it, pretend success without emailing.
  if ((form.get('input_11') as string)?.trim()) {
    return redirectTo(THANK_YOU, request.url);
  }

  const get = (k: string) => esc((form.get(k) as string) || '');
  const first   = get('input_1.3');
  const last    = get('input_1.6');
  const email   = get('input_2');
  const phone   = get('input_4');
  const clinic  = get('input_10');
  const message = ((form.get('input_3') as string) || '').trim();

  // Minimal validation at the boundary
  if (!first || !last || !email || !phone || !message) {
    return new Response('Missing required fields', { status: 400 });
  }

  const fullName = `${first} ${last}`;
  const lines = [
    `Name:    ${fullName}`,
    `Email:   ${email}`,
    `Phone:   ${phone}`,
    clinic && clinic !== 'Clinic (required)' ? `Clinic:  ${clinic}` : null,
    '',
    'Message:',
    message,
    '',
    '— Submitted via audiologyandhearingcenters.com contact form',
  ].filter((l) => l !== null).join('\r\n');

  // Build a minimal RFC-822 message
  const boundary = `New Contact Form Lead — ${fullName}`;
  const date = new Date().toUTCString();
  const msgId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@audiologyandhearingcenters.com>`;
  const raw = [
    `From: Audiology & Hearing Centers <${LEAD_FROM}>`,
    `To: ${LEAD_TO}`,
    `Reply-To: ${fullName} <${email}>`,
    `Subject: ${boundary}`,
    `Message-ID: ${msgId}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    lines,
  ].join('\r\n');

  try {
    const sendBinding = (env as any).SEND_EMAIL;
    if (!sendBinding) {
      console.error('SEND_EMAIL binding not configured');
      return new Response('Email service not configured', { status: 503 });
    }
    await sendBinding.send(new EmailMessage(LEAD_FROM, LEAD_TO, raw));
  } catch (err) {
    console.error('Contact form send failed:', err);
    return new Response('Could not send your message. Please call us instead.', { status: 502 });
  }

  // Success → redirect to the thank-you page
  return redirectTo(THANK_YOU, request.url);
}

// Reject non-POST
export function GET() {
  return new Response('Method not allowed', { status: 405 });
}
