import type { APIRoute } from 'astro';

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
const AC_KEY = 'c38210b21984bbfe38779cf18e528f7259612f77964fe437ee46c0d2c96e71e0e28e05dd';
const AC_FIELDS = { total: 69, e: 70, s: 71, grade: 72, handicap: 73 };
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

// ── API Route ─────────────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  let body: { answers?: Record<number, string>; firstName?: string; lastName?: string; email?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { answers, firstName, lastName, email } = body;
  if (!answers || !firstName || !lastName || !email) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (Object.keys(answers).length < 10) {
    return Response.json({ error: 'Incomplete answers' }, { status: 400 });
  }

  const { total, e, s } = calcScore(answers);
  const wellness = getGrade(total);
  const handicap = getHandicap(total);
  const recs = getRecs(wellness.grade);

  // Fire-and-forget to ActiveCampaign
  const acPromise = pushToAC({ firstName, lastName, email, total, e, s, grade: wellness.grade, label: wellness.label, handicap });
  if (typeof (request as unknown as { cf?: unknown }).cf !== 'undefined') {
    // In Cloudflare Workers, use waitUntil via the runtime context if available
  }
  acPromise.catch(() => {/* silent */});

  return Response.json({ total, e, s, grade: wellness.grade, label: wellness.label, color: wellness.color, desc: wellness.desc, handicap, recs });
};
