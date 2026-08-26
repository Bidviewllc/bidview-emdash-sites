import type { APIRoute } from 'astro';
import { TIERS, FINANCING, DISCLAIMER, CONTACT, MEMBERSHIP } from '../../data/pricing';

// Price-calculator lead capture. Sends two plain-text emails via Resend (the
// same provider the site's login emails use — RESEND_API_KEY is a secret on
// the staging and production workers, sending from the verified bidview.net):
//   1. the estimate overview to the patient
//   2. a lead notification to the practice
// Local dev has no key, so sends are logged instead and the route returns ok.

const FROM = 'New Leaf Hearing Care <noreply@bidview.net>';
const PRACTICE_EMAIL = CONTACT.leadEmail;
const BOOKING_URL = 'https://newleafhearing.com/schedule-appointment/';
const MEMBERSHIP_URL = 'https://newleafhearing.com/give-back/hear-it-forward/';

interface LeadBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  estimate?: {
    tierName?: string;
    priceRange?: string | null;
    ears?: string | null;
    answers?: Record<string, string> | null;
  };
}

// Quiz answer values → plain words for the practice notification
const ANSWER_WORDS: Record<string, Record<string, string>> = {
  lifestyle: { '1': 'Mostly quiet', '2': 'Moderately busy', '3': 'Very active (restaurants, meetings, groups)' },
  ears: { one: 'One ear', two: 'Two ears', unsure: 'Not sure yet' },
  priority: { '1': 'Keeping the cost as low as possible', '2': 'A balance of performance and price', '3': 'The best possible technology' },
  care: { '1': 'Just get me set up', '2': 'Some follow-up support', '3': 'Unlimited follow-up care for years' },
};

function allTiersText(): string {
  return TIERS.map(t =>
    `  ${t.name}: $${(t.perEarLow * 2).toLocaleString('en-US')} – $${(t.perEarHigh * 2).toLocaleString('en-US')} per pair`
  ).join('\n');
}

function patientEmailText(firstName: string, est: LeadBody['estimate']): string {
  const hasRec = est?.priceRange && est?.tierName && est.tierName !== 'Browsed all pricing';
  const estimateBlock = hasRec
    ? `Your recommended option: ${est!.tierName}\nEstimated range: ${est!.priceRange}`
    : `Our current pricing:\n${allTiersText()}`;

  return `Hi ${firstName},

Thanks for using our pricing calculator. Here's a copy of your estimate.

${estimateBlock}

Every price includes professional fitting and programming, real-ear measurement verification, follow-up visits per your care plan, cleanings and maintenance, a charger, and a starter supply of domes and wax guards. You're also covered by a 60-day trial period, fully refundable minus $600 in fitting fees. A hearing evaluation ($50–$175) is billed separately.

${FINANCING} Prefer a monthly payment instead? Our ${MEMBERSHIP.name} is $${MEMBERSHIP.onboardingFee.toLocaleString('en-US')} onboarding, then $${MEMBERSHIP.monthly}/month — details at ${MEMBERSHIP_URL}

Next step: a hearing evaluation confirms what your hearing actually needs, and this estimate becomes a real treatment plan.

${DISCLAIMER}

---

**New Leaf Hearing Care**
Book online: ${BOOKING_URL}
Arvada: (303) 639-5323
Littleton: (720) 689-7989`;
}

function practiceEmailText(body: LeadBody): string {
  const est = body.estimate;
  const hasRec = est?.priceRange && est?.tierName && est.tierName !== 'Browsed all pricing';
  const answers = est?.answers;
  const answerLines = answers
    ? ['lifestyle', 'ears', 'priority', 'care']
        .map(q => {
          const label = { lifestyle: 'Listening lifestyle', ears: 'One ear or two', priority: 'Priority', care: 'Ongoing care' }[q];
          return `  ${label}: ${ANSWER_WORDS[q]?.[answers[q]] ?? answers[q] ?? '—'}`;
        })
        .join('\n')
    : '  (skipped the quiz — browsed all pricing)';

  return `New lead from the website pricing calculator.

Name: ${body.firstName} ${body.lastName}
Email: ${body.email}
Phone: ${body.phone || 'not provided'}

${hasRec ? `Recommended option: ${est!.tierName} — ${est!.priceRange}` : 'Browsed all pricing (no recommendation shown)'}

Their quiz answers:
${answerLines}

A copy of the estimate was emailed to them.`;
}

// Minimal HTML twin of the plain-text email: same words, default-looking type,
// with leading "Label:" phrases bolded and URLs clickable. The plain-text
// version is still sent as the fallback part.
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function textToHtml(text: string): string {
  const paragraphs = text.split('\n\n').map(para => {
    // A paragraph that is just "---" renders as a divider line
    if (para.trim() === '---') {
      return '<hr style="border:none;border-top:1px solid #cccccc;margin:1.2em 0;">';
    }
    const lines = para.split('\n').map(line => {
      let html = escapeHtml(line);
      // **text** renders bold (the plain-text part strips the asterisks)
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Bold a leading "Label:" phrase — colon must be followed by a space or
      // end the line, so URLs (://) never match.
      html = html.replace(/^(\s*)([A-Za-z][^:]{0,48}):(\s|$)/, '$1<strong>$2:</strong>$3');
      html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
      return html;
    });
    return '<p style="margin:0 0 1em;">' + lines.join('<br>') + '</p>';
  });
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222222;">'
    + paragraphs.join('') + '</div>';
}

async function getResendApiKey(): Promise<{ key?: string; inWorkers: boolean }> {
  try {
    const mod = await import('cloudflare:workers');
    const key = (mod as { env?: Record<string, unknown> }).env?.RESEND_API_KEY;
    return { key: typeof key === 'string' && key ? key : undefined, inWorkers: true };
  } catch {
    return { key: undefined, inWorkers: false };
  }
}

async function sendViaResend(apiKey: string, to: string, replyTo: string | undefined, subject: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, text: text.replace(/\*\*/g, ''), html: textToHtml(text), ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
}

export const POST: APIRoute = async ({ request }) => {
  let body: LeadBody;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { firstName, lastName, email } = body;
  if (!firstName || !lastName || !email) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email' }, { status: 400 });
  }

  const practiceText = practiceEmailText(body);
  const patientText = patientEmailText(firstName, body.estimate);

  const { key, inWorkers } = await getResendApiKey();
  if (!key) {
    if (inWorkers) {
      // Deployed but the secret is missing — fail loudly rather than pretend.
      console.error('[pricing-lead] RESEND_API_KEY missing on this worker');
      return Response.json({ error: 'Email unavailable' }, { status: 500 });
    }
    // Local dev: log instead of sending so the flow stays testable.
    console.log('[pricing-lead] DEV — practice email:\n' + practiceText);
    console.log('[pricing-lead] DEV — patient email:\n' + patientText);
    return Response.json({ ok: true, dev: true });
  }

  const [practiceResult, patientResult] = await Promise.allSettled([
    sendViaResend(key, PRACTICE_EMAIL, email, `Price calculator lead: ${firstName} ${lastName}`, practiceText),
    sendViaResend(key, email, PRACTICE_EMAIL, 'Your hearing aid estimate from New Leaf Hearing Care', patientText),
  ]);

  // The practice notification is the one that must not be lost silently.
  if (practiceResult.status === 'rejected') {
    console.error('[pricing-lead] practice send failed:', practiceResult.reason);
    return Response.json({ error: 'Email unavailable' }, { status: 500 });
  }
  if (patientResult.status === 'rejected') {
    console.error('[pricing-lead] patient send failed (lead still captured):', patientResult.reason);
  }

  return Response.json({ ok: true });
};
