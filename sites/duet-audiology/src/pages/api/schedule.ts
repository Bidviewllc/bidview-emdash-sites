// POST /api/schedule
// Receives the schedule popup form, validates server-side, and sends an email
// via Resend (https://resend.com) to info@duethearing.com.
//
// Required Worker secret:    RESEND_API_KEY
// Optional Worker variable:  RESEND_FROM   (defaults to "Duet Hearing <send@send.duethearing.com>")
// Optional Worker variable:  RESEND_TO     (defaults to "info@duethearing.com")
//
// Set the secret via:
//   npx wrangler secret put RESEND_API_KEY
//
// Set non-secret vars in wrangler.jsonc `vars: { RESEND_FROM: "...", RESEND_TO: "..." }`.

import type { APIRoute } from 'astro';
// Astro v6 + @astrojs/cloudflare 13: read bindings via cloudflare:workers
// @ts-ignore — virtual module provided by the runtime
import { env as cfEnv } from 'cloudflare:workers';

export const prerender = false;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function verifyMath(question: string, answer: string): boolean {
  if (!question || !answer) return false;
  const m = question.match(/^\s*(\d+)\s*\+\s*(\d+)\s*=?\s*$/);
  if (!m) return false;
  const expected = parseInt(m[1], 10) + parseInt(m[2], 10);
  const given = parseInt(String(answer).trim(), 10);
  return Number.isFinite(given) && given === expected;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Honeypot — bots fill the hidden "website" field; humans don't.
  if (body.website && String(body.website).trim() !== '') {
    // Silently accept so the bot thinks it worked.
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Required fields
  const firstName = (body.firstName || '').toString().trim();
  const lastName = (body.lastName || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const phone = (body.phone || '').toString().trim();
  const preferredDate = (body.preferredDate || '').toString().trim();
  const reason = (body.reason || '').toString().trim();
  const message = (body.message || '').toString().trim();
  const mathQuestion = (body.mathQuestion || '').toString();
  const mathAnswer = (body.mathAnswer || '').toString();

  if (!firstName || !lastName || !email || !phone) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_required_field' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!isEmail(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!verifyMath(mathQuestion, mathAnswer)) {
    return new Response(JSON.stringify({ ok: false, error: 'math_failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey: string = (cfEnv as any)?.RESEND_API_KEY || '';
  const from: string = (cfEnv as any)?.RESEND_FROM || 'Duet Hearing <appointments@duethearing.com>';
  const to: string = (cfEnv as any)?.RESEND_TO || 'info@duethearing.com';

  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_api_key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const subject = `New appointment request — ${firstName} ${lastName}`;
  const plain = [
    `New appointment request from duethearing.com`,
    ``,
    `Name:             ${firstName} ${lastName}`,
    `Email:            ${email}`,
    `Phone:            ${phone}`,
    `Preferred date:   ${preferredDate || '(none)'}`,
    `Reason for visit: ${reason || '(none)'}`,
    ``,
    `Message:`,
    message || '(none)',
    ``,
    `---`,
    `Reply directly to this email to respond to ${firstName}.`,
  ].join('\n');

  const html = `
<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; background:#F3FAFF; padding: 24px; color: #21273F;">
  <div style="max-width: 560px; margin: 0 auto; background:#fff; border-radius:16px; padding:32px; border:1px solid rgba(0,178,228,0.16);">
    <p style="margin:0 0 8px 0; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:#00B2E4;">Duet Hearing — Appointment Request</p>
    <h1 style="margin:0 0 20px 0; font-size:22px;">New request from ${escapeHtml(firstName)} ${escapeHtml(lastName)}</h1>
    <table style="border-collapse:collapse; width:100%; font-size:15px;">
      <tr><td style="padding:6px 0; color:#4E5779; width:140px;">Name</td><td style="padding:6px 0;"><strong>${escapeHtml(firstName)} ${escapeHtml(lastName)}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#4E5779;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#00B2E4;">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:6px 0; color:#4E5779;">Phone</td><td style="padding:6px 0;"><a href="tel:${escapeHtml(phone.replace(/[^0-9+]/g, ''))}" style="color:#00B2E4;">${escapeHtml(phone)}</a></td></tr>
      <tr><td style="padding:6px 0; color:#4E5779;">Preferred date</td><td style="padding:6px 0;">${escapeHtml(preferredDate) || '<em style="color:#9CA1C7;">(none)</em>'}</td></tr>
      <tr><td style="padding:6px 0; color:#4E5779;">Reason</td><td style="padding:6px 0;">${escapeHtml(reason) || '<em style="color:#9CA1C7;">(none)</em>'}</td></tr>
    </table>
    ${message ? `<div style="margin-top:20px;"><p style="margin:0 0 6px 0; font-size:13px; color:#4E5779; text-transform:uppercase; letter-spacing:1px;">Message</p><div style="background:#F3FAFF; border-left:3px solid #00B2E4; padding:12px 16px; border-radius:0 8px 8px 0; line-height:1.5;">${escapeHtml(message).replace(/\n/g, '<br>')}</div></div>` : ''}
    <p style="margin-top:24px; font-size:13px; color:#9CA1C7;">Reply directly to this email to respond to ${escapeHtml(firstName)}.</p>
  </div>
</body></html>`.trim();

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject,
      text: plain,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text().catch(() => '');
    return new Response(JSON.stringify({ ok: false, error: 'send_failed', detail: errText.slice(0, 200) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: 'server_error', detail: String(err && err.message || err).slice(0, 200) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
