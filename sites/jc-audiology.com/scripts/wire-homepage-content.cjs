const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const db = new Database('data.db');
const seedPath = 'seed/seed.json';
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const now = () => new Date().toISOString();
const COLLECTION = 'homepage';
const TABLE = 'ec_homepage';

function key(prefix = 'k') { return `${prefix}-${crypto.randomBytes(4).toString('hex')}`; }
function block(text, style = 'normal') {
  return { _type: 'block', _key: key('b'), style, markDefs: [], children: [{ _type: 'span', _key: key('s'), text, marks: [] }] };
}
function ptFromParagraphs(paragraphs) { return paragraphs.map((p) => block(p)); }
function field(slug, type, label) { return { name: slug, slug, type, label }; }
function collection() {
  return {
    name: COLLECTION,
    slug: COLLECTION,
    label: 'Homepage',
    fields: [
      field('hero_intro', 'text', 'Hero Intro'),
      field('hero_content', 'text', 'Hero Content'),
      field('appointment_cta_url', 'url', 'CTA'),
      field('intro_section_intro', 'string', 'Section Intro'),
      field('intro_h1_title', 'text', 'H1 Section Title'),
      field('intro_body_content', 'portableText', 'Body Content'),
      field('badge_1', 'image', 'Badge 1'),
      field('badge_2', 'image', 'Badge 2'),
      field('badge_3', 'image', 'Badge 3'),
      field('badge_4', 'image', 'Badge 4'),
      field('testimonial_eyebrow_text', 'text', 'Eyebrow Text'),
      field('testimonial_h2_title', 'string', 'H2 Section Title'),
      field('testimonial_body_content', 'portableText', 'Body Content'),
      field('faq_h2_title', 'string', 'FAQ H2 Section Title'),
      field('faq_body_content', 'portableText', 'FAQ Body Content'),
      field('faq_cta_url', 'url', 'FAQ CTA'),
      { name: 'faq_items', slug: 'faq_items', type: 'repeater', label: 'FAQ Items', validation: { subFields: [
        { slug: 'question', label: 'Question', type: 'text' },
        { slug: 'answer', label: 'Answer', type: 'text' },
      ] } },
    ],
  };
}
function imageObject({ id, filename, storageKey, mimeType, width, height, alt }) {
  return { id, provider: 'local', filename, mimeType, width, height, alt, meta: { storageKey, caption: null, blurhash: null, dominantColor: null }, src: `/_emdash/api/media/file/${storageKey}` };
}
function upsertMedia({ id, filename, storageKey, mimeType, width, height, alt, source }) {
  fs.mkdirSync(path.dirname(path.join('uploads', storageKey)), { recursive: true });
  if (source && fs.existsSync(source)) fs.copyFileSync(source, path.join('uploads', storageKey));
  const size = fs.existsSync(path.join('uploads', storageKey)) ? fs.statSync(path.join('uploads', storageKey)).size : null;
  const content_hash = fs.existsSync(path.join('uploads', storageKey)) ? crypto.createHash('sha256').update(fs.readFileSync(path.join('uploads', storageKey))).digest('hex') : id;
  db.prepare(`insert into media (id, filename, mime_type, size, width, height, alt, storage_key, content_hash, created_at, status)
    values (@id, @filename, @mime_type, @size, @width, @height, @alt, @storage_key, @content_hash, @created_at, 'ready')
    on conflict(id) do update set filename=excluded.filename, mime_type=excluded.mime_type, size=excluded.size, width=excluded.width, height=excluded.height, alt=excluded.alt, storage_key=excluded.storage_key, content_hash=excluded.content_hash, status='ready'`)
    .run({ id, filename, mime_type: mimeType, size, width, height, alt, storage_key: storageKey, content_hash, created_at: now() });
  return imageObject({ id, filename, storageKey, mimeType, width, height, alt });
}
function sourceAsset(name) { return path.join('public', 'assets', 'media', name); }
const badges = [
  upsertMedia({ id: 'media-homepage-badge-american-academy-of-audiology', filename: 'cf0c55f6-american-academy-of-audiology.webp', storageKey: 'homepage/cf0c55f6-american-academy-of-audiology.webp', mimeType: 'image/webp', width: 340, height: 240, alt: 'American Academy of Audiology logo', source: sourceAsset('cf0c55f6-american-academy-of-audiology.webp') }),
  upsertMedia({ id: 'media-homepage-badge-academy-of-doctors-of-audiology', filename: 'a717e552-academy-of-doctors-of-audiology.webp', storageKey: 'homepage/a717e552-academy-of-doctors-of-audiology.webp', mimeType: 'image/webp', width: 340, height: 240, alt: 'Academy of Doctors of Audiology logo', source: sourceAsset('a717e552-academy-of-doctors-of-audiology.webp') }),
  upsertMedia({ id: 'media-homepage-badge-asha', filename: '81b6f248-asha.webp', storageKey: 'homepage/81b6f248-asha.webp', mimeType: 'image/webp', width: 340, height: 240, alt: 'ASHA logo with face profiles and soundwave icon', source: sourceAsset('81b6f248-asha.webp') }),
  upsertMedia({ id: 'media-homepage-badge-ihs', filename: '90fe12a0-ihs.png', storageKey: 'homepage/90fe12a0-ihs.png', mimeType: 'image/png', width: 340, height: 240, alt: 'IHS logo with heartbeat line through letters', source: sourceAsset('90fe12a0-ihs.png') }),
];
const faqItems = [
  { question: 'How do I know if I need a hearing aid?', answer: 'If you're experiencing difficulty hearing in conversations, particularly in noisy environments, frequently turning up the volume on the TV or radio, or feeling isolated from social interactions, it may be time to consider a hearing test. An audiologist can evaluate your hearing and help determine if a hearing aid is necessary.' },
  { question: 'What is the difference between hearing aids and personal sound amplification products (PSAPs)?', answer: 'Hearing aids are FDA-approved devices specifically designed for people with hearing loss. They are customizable, programmed by an audiologist, and regulated for medical use. PSAPs, on the other hand, are general amplifiers intended for individuals without hearing loss and do not offer the same level of customization or professional support.' },
  { question: 'Can I get a hearing aid without a hearing test?', answer: 'Yes, you can purchase over-the-counter (OTC) hearing aids without a hearing test. However, these devices are typically intended for adults with mild to moderate hearing loss. A hearing test with an audiologist ensures that you get a personalized solution that addresses your specific needs, including identifying any underlying medical conditions.' },
  { question: 'How can hearing aids help with tinnitus?', answer: 'Hearing aids can help mask the ringing or buzzing associated with tinnitus by amplifying external sounds, making the internal noise less noticeable. Some hearing aids are specifically designed to include features that provide sound therapy to help alleviate tinnitus symptoms.' },
];
const data = {
  hero_intro: 'Hearing For Life',
  hero_content: 'Let's help you make meaningful connections with expert hearing care!',
  appointment_cta_url: '/schedule-appointment/',
  intro_section_intro: 'JC Audiology',
  intro_h1_title: 'LUTZ, FL AUDIOLOGIST, HEARING AID SPECIALIST & HEARING AIDS',
  intro_body_content: ptFromParagraphs([
    'At JC Audiology, we understand how hearing loss can creep up on you and affect your daily life in subtle, frustrating ways. Hearing loss can feel isolating, and over time, it can even affect your mental sharpness. The good news is that treating your hearing loss can help.',
    'Let us help you regain the joy of hearing and the quality of life you deserve.',
  ]),
  badge_1: badges[0],
  badge_2: badges[1],
  badge_3: badges[2],
  badge_4: badges[3],
  testimonial_eyebrow_text: 'What Our Patients Are Saying',
  testimonial_h2_title: 'Client Testimonials',
  testimonial_body_content: ptFromParagraphs(['Your hearing health is our top priority, and we are dedicated to providing compassionate care. Hear from our patients in Lutz, FL, about their experiences with our services!']),
  faq_h2_title: 'Frequently Asked Questions',
  faq_body_content: ptFromParagraphs([`Can't find the answers you're looking for?\nReach out us.`]),
  faq_cta_url: '/contact/',
  faq_items: faqItems,
};

function ensureCollection() {
  const col = collection();
  seed.collections = (seed.collections || []).filter((c) => c.slug !== COLLECTION);
  seed.collections.push(col);
  seed.entries = (seed.entries || []).filter((e) => !(e.collection === COLLECTION && e.id === 'home'));
  seed.entries.push({ collection: COLLECTION, id: 'home', status: 'published', data });
  fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

  const colId = `col_${COLLECTION}`;
  db.prepare(`insert into _emdash_collections (id, slug, label, created_at, updated_at) values (?, ?, ?, ?, ?)
    on conflict(slug) do update set label=excluded.label, updated_at=excluded.updated_at`).run(colId, COLLECTION, 'Homepage', now(), now());
  const dbCol = db.prepare('select id from _emdash_collections where slug=?').get(COLLECTION);
  db.prepare('delete from _emdash_fields where collection_id=?').run(dbCol.id);
  const stmt = db.prepare(`insert into _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
    values (?, ?, ?, ?, ?, ?, 0, 0, null, ?, null, null, ?, ?, 0, 1)`);
  col.fields.forEach((f, index) => {
    const type = f.type;
    const columnType = ['portableText', 'image', 'repeater'].includes(type) ? 'JSON' : 'TEXT';
    const validation = f.validation ? JSON.stringify(f.validation) : null;
    stmt.run(`fld_${COLLECTION}_${f.slug}`, dbCol.id, f.slug, f.label, type, columnType, validation, index, now());
  });
}
function ensureTable() {
  db.exec(`create table if not exists ${TABLE} (
    id TEXT PRIMARY KEY, slug TEXT, status TEXT, author_id TEXT, primary_byline_id TEXT, created_at TEXT, updated_at TEXT, published_at TEXT,
    scheduled_at TEXT, deleted_at TEXT, version INTEGER default 1, live_revision_id TEXT, draft_revision_id TEXT, locale TEXT, translation_group TEXT
  )`);
  const cols = new Set(db.prepare(`pragma table_info(${TABLE})`).all().map((col) => col.name));
  for (const f of collection().fields) {
    if (!cols.has(f.slug)) db.prepare(`alter table ${TABLE} add column ${f.slug} ${['portableText','image','repeater'].includes(f.type) ? 'JSON' : 'TEXT'}`).run();
  }
}
function upsertHomepage() {
  const cols = ['id','slug','status','created_at','updated_at','published_at','version', ...collection().fields.map((f) => f.slug)];
  const placeholders = cols.map(() => '?').join(',');
  const update = ['status','updated_at','published_at','version', ...collection().fields.map((f) => f.slug)].map((col) => `${col}=excluded.${col}`).join(',');
  const values = cols.map((col) => {
    if (col === 'id' || col === 'slug') return 'home';
    if (col === 'status') return 'published';
    if (['created_at','updated_at','published_at'].includes(col)) return now();
    if (col === 'version') return 1;
    const value = data[col];
    return Array.isArray(value) || (value && typeof value === 'object') ? JSON.stringify(value) : value ?? null;
  });
  db.prepare(`insert into ${TABLE} (${cols.join(',')}) values (${placeholders}) on conflict(id) do update set ${update}`).run(...values);
}
const tx = db.transaction(() => { ensureCollection(); ensureTable(); upsertHomepage(); });
tx();
db.close();
console.log('Homepage content type, media, and default entry are wired.');
