const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const parse5 = require('parse5');

const seedPath = 'seed/seed.json';
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const db = new Database('data.db');
const now = () => new Date().toISOString();
const COLLECTIONS = ['staff_profile_pages', 'about_page', 'contact_page', 'schedule_appointment_page'];
const STAFF_ROUTES = ['/judith-l-reese-ph-d/', '/ryan-nurge-has/', '/charlie-reese/', '/graciela-wentz/'];

function normalizeRoute(route) { if (!route || route === '/') return '/'; return `/${String(route).replace(/^\/+|\/+$/g, '')}/`; }
function slugFromRoute(route) { return normalizeRoute(route).replace(/^\/+|\/+$/g, '').replace(/\//g, '__') || 'home'; }
function shellPath(route) { const rel = normalizeRoute(route).replace(/^\//, '').replace(/\/$/, '') || 'index'; return rel === 'index' ? 'src/shells/pages/index.html' : `src/shells/pages/${rel}/index.html`; }
function fixText(input = '') {
  let value = String(input);
  if (/[ÃÂâ]|ï¿½|�/.test(value)) {
    try { const decoded = Buffer.from(value, 'latin1').toString('utf8'); if ((decoded.match(/[ÃÂâ]|ï¿½|�/g) || []).length <= (value.match(/[ÃÂâ]|ï¿½|�/g) || []).length) value = decoded; } catch {}
  }
  const reps = new Map([['â€™','’'],['â€˜','‘'],['â€œ','“'],['â€','”'],['â€','”'],['â€“','–'],['â€”','—'],['â€º','›'],['Â»','»'],['Â©','©'],['Â ', ' '],['Â',''],['Ã©','é'],['ï¿½',''],['�','']]);
  for (const [from,to] of reps) value = value.split(from).join(to);
  return value.replace(/\u00a0/g, ' ').replace(/&nbsp;/g, ' ');
}
function key(prefix='k') { return `${prefix}-${crypto.randomBytes(4).toString('hex')}`; }
function attr(node, name) { return node.attrs?.find((a) => a.name === name)?.value || ''; }
function hasClass(node, cls) { return attr(node, 'class').split(/\s+/).includes(cls); }
function textContent(node) { if (!node) return ''; if (node.nodeName === '#text') return fixText(node.value || ''); return (node.childNodes || []).map(textContent).join(''); }
function serializeNode(node) { return parse5.serialize({ childNodes: [node] }); }
function serializeChildren(node) { return (node.childNodes || []).map(serializeNode).join(''); }
function findFirst(node, predicate) { if (predicate(node)) return node; for (const child of node.childNodes || []) { const found = findFirst(child, predicate); if (found) return found; } return null; }
function findAll(node, predicate, out = []) { if (predicate(node)) out.push(node); for (const child of node.childNodes || []) findAll(child, predicate, out); return out; }
function makeSpan(text, marks = []) { return { _type: 'span', _key: key('s'), text: fixText(text), marks }; }
function compactSpans(spans) { return spans.filter((span) => span.text && span.text.replace(/\s+/g, '').length > 0); }
function inlineChildren(node, marks = [], markDefs = []) {
  if (!node) return [];
  if (node.nodeName === '#text') return [makeSpan(node.value || '', marks)];
  if (!node.childNodes) return [];
  const tag = node.tagName;
  if (tag === 'br') return [makeSpan('\n', marks)];
  let nextMarks = [...marks];
  if (tag === 'strong' || tag === 'b') nextMarks.push('strong');
  if (tag === 'em' || tag === 'i') nextMarks.push('em');
  if (tag === 'a') {
    const href = attr(node, 'href');
    if (href) { const mKey = key('link'); markDefs.push({ _key: mKey, _type: 'link', href }); nextMarks.push(mKey); }
  }
  return node.childNodes.flatMap((child) => inlineChildren(child, nextMarks, markDefs));
}
function blockFromNode(node, style='normal', listItem, level=1) {
  const markDefs = [];
  const children = compactSpans(inlineChildren(node, [], markDefs));
  if (!children.length) return null;
  const block = { _type: 'block', _key: key('b'), style, markDefs, children };
  if (listItem) { block.listItem = listItem; block.level = level; }
  return block;
}
function parseListItem(li, listItem, level) {
  const pseudo = { ...li, childNodes: [] };
  const nested = [];
  for (const child of li.childNodes || []) { if (child.tagName === 'ul' || child.tagName === 'ol') nested.push(child); else pseudo.childNodes.push(child); }
  const blocks = [];
  const main = blockFromNode(pseudo, 'normal', listItem, level);
  if (main) blocks.push(main);
  for (const list of nested) blocks.push(...htmlNodesToPortableText(list.childNodes || [], list.tagName === 'ol' ? 'number' : 'bullet', level + 1));
  return blocks;
}
function htmlNodesToPortableText(nodes, currentListItem = null, level = 1) {
  const blocks = [];
  for (const node of nodes || []) {
    if (node.nodeName === '#text') { if (fixText(node.value || '').trim()) { const b = blockFromNode({ childNodes: [node] }, 'normal', currentListItem, level); if (b) blocks.push(b); } continue; }
    const tag = node.tagName;
    if (!tag || tag === 'script' || tag === 'style') continue;
    if (/^h[1-6]$/.test(tag)) { const b = blockFromNode(node, tag); if (b) blocks.push(b); }
    else if (tag === 'p') { const b = blockFromNode(node, 'normal', currentListItem, level); if (b) blocks.push(b); }
    else if (tag === 'ul' || tag === 'ol') { const type = tag === 'ol' ? 'number' : 'bullet'; for (const li of (node.childNodes || []).filter((n) => n.tagName === 'li')) blocks.push(...parseListItem(li, type, level)); }
    else if (tag === 'li') blocks.push(...parseListItem(node, currentListItem || 'bullet', level));
    else if (tag === 'blockquote') { const b = blockFromNode(node, 'blockquote'); if (b) blocks.push(b); }
    else blocks.push(...htmlNodesToPortableText(node.childNodes || [], currentListItem, level));
  }
  return blocks;
}
function htmlToPortableText(html) { return htmlNodesToPortableText(parse5.parseFragment(html || '').childNodes || []); }
function shellDoc(route) { return parse5.parse(fs.readFileSync(shellPath(route), 'utf8')); }
function extractHead(route) {
  const html = fs.readFileSync(shellPath(route), 'utf8');
  const title = fixText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const meta = fixText(html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i)?.[1] || '');
  return { title, meta_description: meta };
}
function extractHeroTitle(route) { const h1 = findFirst(shellDoc(route), (n) => n.tagName === 'h1'); return fixText(textContent(h1)).trim(); }
function extractWidgetBody(route, className) { const root = findFirst(shellDoc(route), (n) => hasClass(n, className)); return root ? htmlNodesToPortableText(root.childNodes || []) : []; }
function extractFirstImage(route, className) {
  const root = findFirst(shellDoc(route), (n) => hasClass(n, className));
  const img = root ? findFirst(root, (n) => n.tagName === 'img') : null;
  if (!img) return null;
  const src = attr(img, 'src');
  const alt = fixText(attr(img, 'alt'));
  const width = Number(attr(img, 'width')) || null;
  const height = Number(attr(img, 'height')) || null;
  const cleanSrc = src.replace(/^\.\.\//, 'public/').replace(/^\//, 'public/');
  const source = fs.existsSync(cleanSrc) ? cleanSrc : src;
  const fileName = path.basename(source);
  const storageKey = `page-assets/${fileName}`;
  fs.mkdirSync(path.join('uploads', 'page-assets'), { recursive: true });
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join('uploads', storageKey));
  const ext = fileName.toLowerCase().split('.').pop();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const id = `media-page-${fileName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`.slice(0, 120);
  const size = fs.existsSync(path.join('uploads', storageKey)) ? fs.statSync(path.join('uploads', storageKey)).size : null;
  upsertMedia({ id, filename: fileName, mime_type: mime, size, width, height, alt, storage_key: storageKey });
  return { id, provider: 'local', filename: fileName, mimeType: mime, width, height, alt, meta: { storageKey }, src: `/_emdash/api/media/file/${storageKey}` };
}
function extractStaffIntro(route) {
  const root = findFirst(shellDoc(route), (n) => hasClass(n, 'astro-element-ac2b506'));
  return root ? htmlNodesToPortableText(root.childNodes || []) : [];
}
function extractScheduleEmbed() {
  const root = findFirst(shellDoc('/schedule-appointment/'), (n) => hasClass(n, 'astro-element-eadc933'));
  const iframe = root ? findFirst(root, (n) => n.tagName === 'iframe') : null;
  return iframe ? serializeNode(iframe) : '<iframe id="ceschedule" src="https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-9083&amp;embed=true" width="100%" height="600px" frameborder="0" style="border: 0;"></iframe>';
}
function upsertMedia(row) {
  db.prepare(`insert into media (id, filename, mime_type, size, width, height, alt, storage_key, content_hash, created_at, status) values (@id, @filename, @mime_type, @size, @width, @height, @alt, @storage_key, @content_hash, @created_at, 'ready') on conflict(id) do update set filename=excluded.filename, mime_type=excluded.mime_type, size=excluded.size, width=excluded.width, height=excluded.height, alt=excluded.alt, storage_key=excluded.storage_key`).run({ ...row, content_hash: row.id, created_at: now() });
}
function field(slug, type, label) { return { name: slug, slug, type, label }; }
function collection(slug, label, fields) { return { name: slug, slug, label, fields }; }
function entry(collection, id, data) { return { collection, id, status: 'published', data }; }
function parseStoredJson(value) { if (value == null || value === '') return value; if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return value; } }
function readExistingRows(table) {
  try {
    const rows = db.prepare(`select * from ${table}`).all();
    return new Map(rows.map((row) => {
      const data = { ...row };
      for (const k of ['id','slug','status','author_id','primary_byline_id','created_at','updated_at','published_at','scheduled_at','deleted_at','version','live_revision_id','draft_revision_id','locale','translation_group']) delete data[k];
      for (const key of Object.keys(data)) data[key] = parseStoredJson(data[key]);
      return [row.slug || row.id, data];
    }));
  } catch { return new Map(); }
}
const existing = {
  staff_profile_pages: readExistingRows('ec_staff_profile_pages'),
  about_page: readExistingRows('ec_about_page'),
  contact_page: readExistingRows('ec_contact_page'),
  schedule_appointment_page: readExistingRows('ec_schedule_appointment_page'),
};
function mergeExisting(collection, id, defaults, fieldNames) {
  const prev = existing[collection]?.get(id);
  if (!prev) return defaults;
  const merged = { ...defaults };
  for (const f of fieldNames) {
    const v = prev[f];
    if (v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '')) merged[f] = v;
  }
  return merged;
}

const staffPageEntries = STAFF_ROUTES.map((route) => {
  const id = slugFromRoute(route);
  const h = extractHead(route);
  return entry('staff_profile_pages', id, mergeExisting('staff_profile_pages', id, {
    staff_profile_slug: id,
    route: normalizeRoute(route),
    meta_title: h.title.replace(/\s*\|\s*JC Audiology\s*$/i, '').trim() || extractHeroTitle(route),
    meta_description: h.meta_description || '',
    content_body: extractStaffIntro(route),
  }, ['staff_profile_slug','route','meta_title','meta_description','content_body']));
});
const aboutHead = extractHead('/about/');
const aboutEntries = [entry('about_page', 'about', mergeExisting('about_page', 'about', {
  page_title: extractHeroTitle('/about/') || 'About JC Audiology',
  route: '/about/',
  meta_title: aboutHead.title.replace(/\s*\|\s*JC Audiology\s*$/i, '').trim() || 'About JC Audiology',
  meta_description: aboutHead.meta_description || '',
  content_body: extractWidgetBody('/about/', 'astro-element-35a7487'),
  section_image: extractFirstImage('/about/', 'astro-element-ed5ce0d'),
}, ['page_title','route','meta_title','meta_description','content_body','section_image']))];
const contactHead = extractHead('/contact/');
const contactEntries = [entry('contact_page', 'contact', mergeExisting('contact_page', 'contact', {
  page_title: extractHeroTitle('/contact/') || 'Contact Us',
  route: '/contact/',
  meta_title: contactHead.title.replace(/\s*\|\s*JC Audiology\s*$/i, '').trim() || 'Contact Us',
  meta_description: contactHead.meta_description || '',
  content_body: htmlToPortableText('<p>Better Hearing Starts Here - Call or visit JC Audiology in Lutz, FL!</p>'),
}, ['page_title','route','meta_title','meta_description','content_body']))];
const scheduleHead = extractHead('/schedule-appointment/');
const scheduleEntries = [entry('schedule_appointment_page', 'schedule-appointment', mergeExisting('schedule_appointment_page', 'schedule-appointment', {
  page_title: extractHeroTitle('/schedule-appointment/') || 'Schedule Appointment',
  route: '/schedule-appointment/',
  meta_title: scheduleHead.title.replace(/\s*\|\s*JC Audiology\s*$/i, '').trim() || 'Schedule Appointment',
  meta_description: scheduleHead.meta_description || '',
  scheduler_embed: extractScheduleEmbed(),
}, ['page_title','route','meta_title','meta_description','scheduler_embed']))];

const collections = [
  collection('staff_profile_pages', 'Staff Profile Pages', [field('staff_profile_slug','string','Staff Profile Slug'), field('route','string','Route'), field('meta_title','string','Meta Title'), field('meta_description','text','Meta Description'), field('content_body','portableText','Content Body')]),
  collection('about_page', 'About Page', [field('page_title','string','Page Title'), field('route','string','Route'), field('meta_title','string','Meta Title'), field('meta_description','text','Meta Description'), field('content_body','portableText','Content Body'), field('section_image','image','Section Image')]),
  collection('contact_page', 'Contact Page', [field('page_title','string','Page Title'), field('route','string','Route'), field('meta_title','string','Meta Title'), field('meta_description','text','Meta Description'), field('content_body','portableText','Content Body')]),
  collection('schedule_appointment_page', 'Schedule Appointment Page', [field('page_title','string','Page Title'), field('route','string','Route'), field('meta_title','string','Meta Title'), field('meta_description','text','Meta Description'), field('scheduler_embed','text','Scheduler Iframe Embed')]),
];
const entries = [...staffPageEntries, ...aboutEntries, ...contactEntries, ...scheduleEntries];

seed.collections = seed.collections.filter((c) => !COLLECTIONS.includes(c.slug) && c.slug !== 'contact_form_visual');
seed.collections.push(...collections);
seed.entries = seed.entries.filter((e) => !COLLECTIONS.includes(e.collection) && e.collection !== 'contact_form_visual');
seed.entries.push(...entries);
fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

function sqlType(type) { return ['portableText','image','repeater'].includes(type) ? 'JSON' : 'TEXT'; }
function ensureCollection(slug, label) {
  const id = `col_${slug}`;
  db.prepare(`insert into _emdash_collections (id, slug, label, created_at, updated_at) values (?, ?, ?, ?, ?) on conflict(slug) do update set label=excluded.label, updated_at=excluded.updated_at`).run(id, slug, label, now(), now());
  return db.prepare('select id from _emdash_collections where slug=?').get(slug).id;
}
function resetFields(collectionId, fields) {
  db.prepare('delete from _emdash_fields where collection_id=?').run(collectionId);
  const stmt = db.prepare(`insert into _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable) values (?, ?, ?, ?, ?, ?, 0, 0, null, null, null, null, ?, ?, 0, 1)`);
  fields.forEach((f, i) => stmt.run(`fld_${collectionId}_${f.slug}`, collectionId, f.slug, f.label, f.type, sqlType(f.type), i, now()));
}
function ensureTable(table, fields) {
  db.exec(`create table if not exists ${table} (id TEXT PRIMARY KEY, slug TEXT, status TEXT default 'draft', author_id TEXT, primary_byline_id TEXT, created_at TEXT default (datetime('now')), updated_at TEXT default (datetime('now')), published_at TEXT, scheduled_at TEXT, deleted_at TEXT, version INTEGER default 1, live_revision_id TEXT, draft_revision_id TEXT, locale TEXT default 'en', translation_group TEXT)`);
  const cols = new Set(db.prepare(`pragma table_info(${table})`).all().map((c) => c.name));
  for (const f of fields) if (!cols.has(f.slug)) db.prepare(`alter table ${table} add column ${f.slug} ${sqlType(f.type)}`).run();
}
function upsertRows(table, rows, fields) {
  const fieldNames = fields.map((f) => f.slug);
  const cols = ['id','slug','status','created_at','updated_at','published_at','version', ...fieldNames];
  const updates = ['status','updated_at','published_at','version', ...fieldNames].map((c) => `${c}=excluded.${c}`).join(',');
  const stmt = db.prepare(`insert into ${table} (${cols.join(',')}) values (${cols.map(() => '?').join(',')}) on conflict(id) do update set ${updates}`);
  for (const e of rows) stmt.run(e.id, e.id, e.status, now(), now(), now(), 1, ...fieldNames.map((f) => {
    const v = e.data[f];
    if (Array.isArray(v) || (v && typeof v === 'object')) return JSON.stringify(v);
    return v ?? null;
  }));
}
const tx = db.transaction(() => {
  for (const col of collections) {
    const colId = ensureCollection(col.slug, col.label);
    resetFields(colId, col.fields);
    ensureTable(`ec_${col.slug}`, col.fields);
    upsertRows(`ec_${col.slug}`, entries.filter((e) => e.collection === col.slug), col.fields);
  }
  const contactCol = db.prepare("select id from _emdash_collections where slug='contact_form_visual'").get();
  if (contactCol) db.prepare('delete from _emdash_fields where collection_id=?').run(contactCol.id);
  db.prepare("delete from _emdash_collections where slug='contact_form_visual'").run();
  db.prepare("delete from _emdash_fields where collection_id not in (select id from _emdash_collections)").run();
  db.exec('drop table if exists ec_contact_form_visual');
});
tx();
db.close();
console.log(`Wired ${staffPageEntries.length} staff profile pages plus about/contact/schedule content types.`);

