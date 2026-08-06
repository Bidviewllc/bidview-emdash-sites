// Hearing Wellness (HHIE-S) scoring engine + ActiveCampaign push.
//
// Handled by the /hearing-wellness/ PAGE (not an /api/ endpoint): in this
// emdash + Cloudflare setup the root [...slug] catch-all intercepts POSTs to
// /api/* before the endpoint route is reached, so the submission is processed
// in the page frontmatter instead (Astro SSR pages run for POST reliably).

// ── Scoring engine (server-side only — never sent to client) ─────────────────
const QUESTIONS = [
  {id:1,type:'E'},{id:2,type:'E'},{id:3,type:'S'},{id:4,type:'E'},{id:5,type:'S'},
  {id:6,type:'S'},{id:7,type:'E'},{id:8,type:'S'},{id:9,type:'E'},{id:10,type:'S'},
];

function calcScore(answers: Record<number, string>) {
  const VAL: Record<string, number> = { yes: 4, sometimes: 2, no: 0 };
  let total = 0, e = 0, s = 0;
  QUESTIONS.forEach(q => {
    const v = VAL[answers[q.id]] ?? 0;
    total += v;
    q.type === 'E' ? (e += v) : (s += v);
  });
  return { total, e, s };
}

function getGrade(total: number) {
  if (total <= 2)  return { grade: 1, label: 'Excellent', color: '#2D6A35', desc: 'Your responses suggest little to no hearing-related difficulty. Your hearing appears to be functioning well in everyday situations.' };
  if (total <= 6)  return { grade: 2, label: 'Good',      color: '#5DB83A', desc: 'Your responses suggest a mild degree of hearing-related difficulty. Most everyday situations are manageable, though some environments may be challenging.' };
  if (total <= 14) return { grade: 3, label: 'Fair',      color: '#C8B400', desc: 'Your responses indicate a moderate degree of hearing difficulty. You may experience noticeable challenges in several common listening situations.' };
  if (total <= 22) return { grade: 4, label: 'Poor',      color: '#E07B00', desc: 'Your responses indicate significant hearing difficulty that may be impacting your social and emotional wellbeing.' };
  return               { grade: 5, label: 'Very Poor', color: '#C0392B', desc: 'Your responses suggest severe hearing difficulty. We strongly recommend a comprehensive hearing evaluation as soon as possible.' };
}

function getHandicap(total: number) {
  if (total <= 8)  return 'No Referral Indicated';
  if (total <= 24) return 'Moderate Difficulty';
  return 'Referral Recommended';
}

function getRecs(grade: number) {
  const all: Record<number, Array<{icon:string,bg:string,h:string,p:string}>> = {
    1: [
      {icon:'check',  bg:'#E8F5E0',h:'No immediate action needed',p:'Your screening results are reassuring! We recommend an annual hearing check to monitor your hearing health over time.'},
      {icon:'shield', bg:'#E8F5E0',h:'Protect your hearing',p:'Use hearing protection in loud environments (concerts, power tools) to preserve your excellent hearing.'},
      {icon:'cal',    bg:'#F0EBF8',h:'Schedule a baseline audiogram',p:'A baseline hearing test gives us a reference point to track any future changes in your hearing.'},
      {icon:'micro',  bg:'#F0EBF8',h:'Ear hygiene assessment',p:'Video otoscopy allows us to assess the health of your outer ear and determine if earwax removal is needed.'},
      {icon:'salad',  bg:'#E8F5E0',h:'Attention to nutrition & lifestyle',p:'A healthy diet and regular physical activity are important to your hearing health.'},
    ],
    2: [
      {icon:'ear',    bg:'#F0EBF8',h:'Consider a comprehensive hearing evaluation',p:'A full audiological assessment can identify any early changes and help us monitor your progress.'},
      {icon:'shield', bg:'#E8F5E0',h:'Protect your hearing',p:'Use hearing protection in noisy situations to prevent further changes to your hearing health.'},
      {icon:'chat',   bg:'#FFF8E1',h:'Communication strategies',p:'Simple strategies like positioning yourself closer to speakers and reducing background noise can significantly improve communication.'},
      {icon:'micro',  bg:'#F0EBF8',h:'Ear hygiene assessment',p:'Video otoscopy allows us to assess the health of your outer ear and determine if earwax removal is needed.'},
      {icon:'salad',  bg:'#E8F5E0',h:'Attention to nutrition & lifestyle',p:'A healthy diet and regular physical activity are important to your hearing health.'},
    ],
    3: [
      {icon:'hosp',   bg:'#FFF3E0',h:'Schedule a hearing evaluation soon',p:'We recommend a comprehensive audiological evaluation to understand the nature and degree of your hearing difficulty.'},
      {icon:'ear',    bg:'#F0EBF8',h:'Hearing aid evaluation',p:'You may benefit from hearing technology. Modern hearing aids are discreet and can greatly improve your quality of life.'},
      {icon:'chat',   bg:'#E8F5E0',h:'Aural rehabilitation',p:'We offer programs to help you and your family communicate more effectively despite hearing challenges.'},
      {icon:'micro',  bg:'#F0EBF8',h:'Ear hygiene assessment',p:'Video otoscopy allows us to assess the health of your outer ear and determine if earwax removal is needed.'},
      {icon:'salad',  bg:'#E8F5E0',h:'Attention to nutrition & lifestyle',p:'A healthy diet and regular physical activity are important to your hearing health.'},
    ],
    4: [
      {icon:'alert',  bg:'#FFF3E0',h:'Prompt evaluation strongly recommended',p:'Your responses indicate significant hearing difficulty. Please contact us to schedule a comprehensive assessment as soon as possible.'},
      {icon:'ear',    bg:'#F0EBF8',h:'Hearing aid fitting',p:'Hearing technology is very likely to provide meaningful benefit. We will discuss options tailored to your lifestyle and budget.'},
      {icon:'chat',   bg:'#E8F5E0',h:'Aural rehabilitation',p:'We offer aural rehabilitation programs to help you and your family communicate more effectively and get the most out of your hearing.'},
      {icon:'micro',  bg:'#F0EBF8',h:'Ear hygiene assessment',p:'Video otoscopy allows us to assess the health of your outer ear and determine if earwax removal is needed.'},
      {icon:'salad',  bg:'#E8F5E0',h:'Attention to nutrition & lifestyle',p:'A healthy diet and regular physical activity are important to your hearing health.'},
    ],
    5: [
      {icon:'alert',  bg:'#FFEBEE',h:'Comprehensive evaluation urgently recommended',p:'Your results indicate severe hearing difficulty. We urge you to schedule an appointment immediately for a full audiological workup.'},
      {icon:'ear',    bg:'#F0EBF8',h:'Advanced hearing technology evaluation',p:'Significant hearing loss may benefit from advanced hearing aids or other assistive devices. We will find the right solution for you.'},
      {icon:'chat',   bg:'#E8F5E0',h:'Aural rehabilitation',p:'We offer aural rehabilitation programs to help you rebuild communication confidence and develop listening strategies.'},
      {icon:'micro',  bg:'#F0EBF8',h:'Ear hygiene assessment',p:'Video otoscopy allows us to assess the health of your outer ear and determine if earwax removal is needed.'},
      {icon:'salad',  bg:'#E8F5E0',h:'Attention to nutrition & lifestyle',p:'A healthy diet and regular physical activity are important to your hearing health.'},
    ],
  };
  return all[grade];
}

// ── ActiveCampaign integration ────────────────────────────────────────────────
const AC_URL = 'https://5keyscommunication.api-us1.com/api/3';
const AC_KEY = 'ca2187cceeb7dda7c4b9cd624ecb94bb2c5a7ebed39428b2eccfc2a3714173f345d81688';
// New (no-space) HWA fields — replaced old HHIE fields 69-73 whose spaced
// personalization tags did not resolve in AC templates (2026-07-13).
const AC_FIELDS = { total: 75, e: 76, s: 77, grade: 78, handicap: 79 };
const TAG_WELLNESS_PAGE = 113;
const TAG_NEW_LEAF = 108;

async function pushToAC({ firstName, lastName, email, total, e, s, grade, label, handicap }: {
  firstName: string; lastName: string; email: string;
  total: number; e: number; s: number; grade: number; label: string; handicap: string;
}) {
  const headers = { 'Api-Token': AC_KEY, 'Content-Type': 'application/json' };
  const syncRes = await fetch(`${AC_URL}/contact/sync`, {
    method: 'POST', headers,
    body: JSON.stringify({ contact: { email, firstName, lastName } }),
  });
  if (!syncRes.ok) return;
  const { contact } = await syncRes.json() as { contact: { id: number } };
  const contactId = contact.id;

  await Promise.all([
    [AC_FIELDS.total, String(total)],
    [AC_FIELDS.e, String(e)],
    [AC_FIELDS.s, String(s)],
    [AC_FIELDS.grade, label],
    [AC_FIELDS.handicap, handicap],
  ].map(([field, value]) =>
    fetch(`${AC_URL}/fieldValues`, {
      method: 'POST', headers,
      body: JSON.stringify({ fieldValue: { contact: contactId, field, value } }),
    })
  ));

  await Promise.all([TAG_WELLNESS_PAGE, TAG_NEW_LEAF].map(tag =>
    fetch(`${AC_URL}/contactTags`, {
      method: 'POST', headers,
      body: JSON.stringify({ contactTag: { contact: contactId, tag } }),
    })
  ));
}

// ── Submission handler ────────────────────────────────────────────────────────
// Called from the /hearing-wellness/ page frontmatter on POST. Returns a JSON
// Response with the scored report. AC push runs via waitUntil so it completes
// after the response is sent (Cloudflare cancels un-awaited promises).
const json = (o: unknown, status = 200): Response =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

type WellnessBody = { answers?: Record<number, string>; firstName?: string; lastName?: string; email?: string };

// Score only — no side effects. Returns the report object or an { error } object.
export function scoreWellness(body: WellnessBody) {
  if (!body || typeof body !== 'object') return { error: 'Invalid JSON' as const, status: 400 };
  const { answers } = body;
  if (!answers || !body.firstName || !body.lastName || !body.email) return { error: 'Missing fields' as const, status: 400 };
  if (Object.keys(answers).length < 10) return { error: 'Incomplete answers' as const, status: 400 };
  const { total, e, s } = calcScore(answers);
  const wellness = getGrade(total);
  const handicap = getHandicap(total);
  const recs = getRecs(wellness.grade);
  return { total, e, s, grade: wellness.grade, label: wellness.label, color: wellness.color, desc: wellness.desc, handicap, recs };
}

export async function handleWellnessSubmit(
  body: WellnessBody,
  waitUntil?: (p: Promise<unknown>) => void,
  skipAc = false
): Promise<Response> {
  const report = scoreWellness(body);
  if ('error' in report) return json({ error: report.error }, report.status);

  // AC push is best-effort and must never affect the response.
  if (!skipAc) {
    try {
      const acPromise = pushToAC({
        firstName: body.firstName!, lastName: body.lastName!, email: body.email!,
        total: report.total, e: report.e, s: report.s, grade: report.grade, label: report.label, handicap: report.handicap,
      }).catch(() => {/* silent */});
      if (waitUntil) waitUntil(acPromise);
      else await acPromise;
    } catch { /* ignore */ }
  }

  return json(report);
}
