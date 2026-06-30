const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const parse5 = require('parse5');

const seedPath = 'seed/seed.json';
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const db = new Database('data.db');
const now = () => new Date().toISOString();
const COLLECTION_SLUGS = ['services', 'hearing_aid_brands', 'utility_pages', 'blog_posts'];

const SERVICE_ROUTES = new Set([
  '/audiology-services/',
  '/audiology-services/hearing-aid-fittings/',
  '/audiology-services/hearing-aid-services/',
  '/audiology-services/hearing-tests/',
  '/audiology-services/real-ear-measurement/',
  '/audiology-services/sensorineural-hearing-loss/',
  '/audiology-services/tinnitus-evaluation-support/',
  '/custom-hearing-protection/',
  '/hearing-aids-products/',
  '/hearing-aids-products/hearing-aid-alternatives/',
  '/hearing-aids-products/hearing-aid-batteries/',
]);
const UTILITY_ROUTES = new Set(['/resources/insurance/', '/privacy-policy/', '/terms-of-service/']);
const BRAND_ROUTES = new Set(['/hearing-aids/phonak/', '/hearing-aids/oticon/', '/hearing-aids/resound/', '/hearing-aids/signia/', '/hearing-aids/starkey/', '/hearing-aids/unitron/', '/hearing-aids/widex/']);
const BLOG_ROUTES = new Set(['/crackling-in-ear/', '/hearing-aids-for-tinnitus/', '/hearing-test-online-helpful-or-risky/', '/in-the-canal-hearing-aids-a-practical-guide/', '/rechargeable-hearing-aids/', '/swimmers-ear-causes-symptoms-treatment-prevention/']);

function normalizeRoute(route) {
  if (!route || route === '/') return '/';
  return `/${String(route).replace(/^\/+|\/+$/g, '')}/`;
}
function slugFromRoute(route) {
  return normalizeRoute(route).replace(/^\/+|\/+$/g, '').replace(/\//g, '__') || 'home';
}
function shellPath(route) {
  const rel = normalizeRoute(route).replace(/^\//, '').replace(/\/$/, '') || 'index';
  return rel === 'index' ? 'src/shells/pages/index.html' : `src/shells/pages/${rel}/index.html`;
}
function titleFromPageTitle(title = '') {
  return fixText(String(title).replace(/\s*\|\s*JC Audiology\s*$/i, '').replace(/^JC Audiology\s*\|\s*/i, '').trim());
}
function cleanMetaTitle(title = '') { return titleFromPageTitle(title); }
function fixText(input = '') {
  let value = String(input);
  if (/[ÃÂâ][\s\S]*|ï¿½|�/.test(value)) {
    try {
      const decoded = Buffer.from(value, 'latin1').toString('utf8');
      if ((decoded.match(/[ÃÂâ]|ï¿½|�/g) || []).length < (value.match(/[ÃÂâ]|ï¿½|�/g) || []).length || /[’“”–—›©é]/.test(decoded)) value = decoded;
    } catch {}
  }
  const replacements = new Map([
    ['â€™', '’'], ['â€˜', '‘'], ['â€œ', '“'], ['â€', '”'], ['â€', '”'], ['â€“', '–'], ['â€”', '—'], ['â€º', '›'], ['Â»', '»'], ['Â©', '©'], ['Â ', ' '], ['Â', ''], ['Ã©', 'é'], ['ï¿½', ''], ['�', ''],
  ]);
  for (const [from, to] of replacements) value = value.split(from).join(to);
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
function blockFromText(text, style='normal') {
  const clean = fixText(text).trim();
  if (!clean) return null;
  return { _type: 'block', _key: key('b'), style, markDefs: [], children: [makeSpan(clean)] };
}
function parseListItem(li, listItem, level) {
  const pseudo = { ...li, childNodes: [] };
  const nested = [];
  for (const child of li.childNodes || []) {
    if (child.tagName === 'ul' || child.tagName === 'ol') nested.push(child);
    else pseudo.childNodes.push(child);
  }
  const blocks = [];
  const main = blockFromNode(pseudo, 'normal', listItem, level);
  if (main) blocks.push(main);
  for (const list of nested) blocks.push(...htmlNodesToPortableText(list.childNodes || [], list.tagName === 'ol' ? 'number' : 'bullet', level + 1));
  return blocks;
}
function htmlNodesToPortableText(nodes, currentListItem = null, level = 1) {
  const blocks = [];
  for (const node of nodes || []) {
    if (node.nodeName === '#text') {
      if (fixText(node.value || '').trim()) { const b = blockFromNode({ childNodes: [node] }, 'normal', currentListItem, level); if (b) blocks.push(b); }
      continue;
    }
    const tag = node.tagName;
    if (!tag) continue;
    if (hasClass(node, 'astro-widget-divider') || tag === 'style' || tag === 'script') continue;
    if (tag === 'details') {
      const title = findFirst(node, (n) => hasClass(n, 'e-n-accordion-item-title-text'));
      const answer = findFirst(node, (n) => hasClass(n, 'astro-widget-text-editor'));
      const headingStyle = /^h[1-6]$/.test(title?.tagName || '') ? title.tagName : 'h3';
      const heading = blockFromText(textContent(title), headingStyle);
      if (heading) blocks.push(heading);
      if (answer) blocks.push(...htmlNodesToPortableText(answer.childNodes || [], currentListItem, level));
      continue;
    }
    if (tag === 'summary') continue;
    if (/^h[1-6]$/.test(tag)) { const b = blockFromNode(node, tag); if (b) blocks.push(b); }
    else if (tag === 'p') { const b = blockFromNode(node, 'normal', currentListItem, level); if (b) blocks.push(b); }
    else if (tag === 'div') { blocks.push(...htmlNodesToPortableText(node.childNodes || [], currentListItem, level)); }
    else if (tag === 'ul' || tag === 'ol') { const type = tag === 'ol' ? 'number' : 'bullet'; for (const li of (node.childNodes || []).filter((n) => n.tagName === 'li')) blocks.push(...parseListItem(li, type, level)); }
    else if (tag === 'li') blocks.push(...parseListItem(node, currentListItem || 'bullet', level));
    else if (tag === 'blockquote') { const b = blockFromNode(node, 'blockquote'); if (b) blocks.push(b); }
    else blocks.push(...htmlNodesToPortableText(node.childNodes || [], currentListItem, level));
  }
  return blocks;
}
function htmlToPortableText(html) { return htmlNodesToPortableText(parse5.parseFragment(html || '').childNodes || []); }
function shellDoc(route) { return parse5.parse(fs.readFileSync(shellPath(route), 'utf8')); }
function extractHeroTitle(route) {
  const doc = shellDoc(route);
  const h1 = findFirst(doc, (n) => n.tagName === 'h1');
  return titleFromPageTitle(textContent(h1));
}
function extractHead(route) {
  const html = fs.readFileSync(shellPath(route), 'utf8');
  const title = fixText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const meta = fixText(html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i)?.[1] || '');
  return { title, meta_description: meta };
}
function extractStandardBody(route) {
  const doc = shellDoc(route);
  const root = findFirst(doc, (n) => hasClass(n, 'astro-element-69dc79d'));
  return root ? htmlNodesToPortableText(root.childNodes || []) : [];
}
function extractBlogBody(route) {
  const doc = shellDoc(route);
  const root = findFirst(doc, (n) => hasClass(n, 'astro-element-273f23b')) || findFirst(doc, (n) => hasClass(n, 'astro-widget-theme-post-content'));
  return root ? htmlNodesToPortableText(root.childNodes || []) : [];
}
function extractFeaturedImage(route) {
  const doc = shellDoc(route);
  const widget = findFirst(doc, (n) => hasClass(n, 'astro-widget-theme-post-featured-image'));
  const imgs = findAll(doc, (n) => n.tagName === 'img');
  const img = widget ? findFirst(widget, (n) => n.tagName === 'img') : imgs.find((candidate) => !attr(candidate, 'src').includes('jcaudiology-logo') && Number(attr(candidate, 'width')) >= 600) || null;
  if (!img) return null;
  const src = attr(img, 'src');
  const alt = fixText(attr(img, 'alt'));
  const width = Number(attr(img, 'width')) || null;
  const height = Number(attr(img, 'height')) || null;
  const cleanSrc = src.replace(/^\.\.\//, 'public/').replace(/^\//, 'public/');
  const source = fs.existsSync(cleanSrc) ? cleanSrc : src;
  const fileName = path.basename(source);
  const storageKey = `blog/${fileName}`;
  fs.mkdirSync(path.join('uploads', 'blog'), { recursive: true });
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join('uploads', storageKey));
  const id = `media-blog-${fileName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`.slice(0, 120);
  const mime = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const size = fs.existsSync(path.join('uploads', storageKey)) ? fs.statSync(path.join('uploads', storageKey)).size : null;
  upsertMedia({ id, filename: fileName, mime_type: mime, size, width, height, alt, storage_key: storageKey });
  return { id, src: `/_emdash/api/media/file/${storageKey}`, alt, width, height, provider: 'local', meta: { storageKey } };
}
function extractBlogMeta(route) {
  const doc = shellDoc(route);
  const root = findFirst(doc, (n) => hasClass(n, 'astro-element-962d9b9')) || findFirst(doc, (n) => hasClass(n, 'astro-widget-post-info'));
  const categoryNode = root ? findFirst(root, (n) => hasClass(n, 'astro-post-info__terms-list')) : null;
  return {
    category: fixText(textContent(categoryNode)).replace(/\s+/g, ' ').trim(),
  };
}
function upsertMedia(row) {
  db.prepare(`insert into media (id, filename, mime_type, size, width, height, alt, storage_key, content_hash, created_at, status) values (@id, @filename, @mime_type, @size, @width, @height, @alt, @storage_key, @content_hash, @created_at, 'ready') on conflict(id) do update set filename=excluded.filename, mime_type=excluded.mime_type, size=excluded.size, width=excluded.width, height=excluded.height, alt=excluded.alt, storage_key=excluded.storage_key`).run({ ...row, content_hash: row.id, created_at: now() });
}
function collection(slug, label, fields) { return { name: slug, slug, label, fields }; }
function field(slug, type, label) { return { name: slug, slug, type, label }; }
function entry(collection, id, data) { return { collection, id, status: 'published', data }; }
function staticByRoute(route) { return seed.entries.find((e) => e.collection === 'static_pages' && normalizeRoute(e.data?.route) === normalizeRoute(route)); }

function parseStoredJson(value) {
  if (value == null || value === '') return value;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}
function readExistingRows(table) {
  try {
    const rows = db.prepare(`select * from ${table}`).all();
    return new Map(rows.map((row) => {
      const data = { ...row };
      delete data.id; delete data.slug; delete data.status; delete data.author_id; delete data.primary_byline_id;
      delete data.created_at; delete data.updated_at; delete data.published_at; delete data.scheduled_at; delete data.deleted_at;
      delete data.version; delete data.live_revision_id; delete data.draft_revision_id; delete data.locale; delete data.translation_group;
      for (const key of Object.keys(data)) data[key] = parseStoredJson(data[key]);
      return [row.slug || row.id, data];
    }));
  } catch {
    return new Map();
  }
}
const existingRows = {
  services: readExistingRows('ec_services'),
  hearing_aid_brands: readExistingRows('ec_hearing_aid_brands'),
  utility_pages: readExistingRows('ec_utility_pages'),
  blog_posts: readExistingRows('ec_blog_posts'),
};
function mergeExisting(collection, id, defaults, fields) {
  const existing = existingRows[collection]?.get(id);
  if (!existing) return defaults;
  const merged = { ...defaults };
  for (const fieldName of fields) {
    const value = existing[fieldName];
    if (value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '')) {
      merged[fieldName] = value;
    }
  }
  if (!merged.meta_title) merged.meta_title = defaults.meta_title;
  return merged;
}

const serviceEntries = [];
for (const route of SERVICE_ROUTES) {
  const sp = staticByRoute(route); if (!sp) continue;
  const h = extractHead(route);
  const id = slugFromRoute(route);
  const heroTitle = extractHeroTitle(route) || titleFromPageTitle(h.title || sp.data.title);
  serviceEntries.push(entry('services', id, mergeExisting('services', id, { title: heroTitle, route: normalizeRoute(route), meta_title: cleanMetaTitle(h.title || heroTitle), meta_description: h.meta_description || sp.data.meta_description || '', body_content: extractStandardBody(route) }, ['title','route','meta_title','meta_description','body_content'])));
}
const brandEntries = [];
for (const route of BRAND_ROUTES) {
  const sp = staticByRoute(route); if (!sp) continue;
  const h = extractHead(route);
  const id = slugFromRoute(route);
  const heroTitle = extractHeroTitle(route) || titleFromPageTitle(h.title || sp.data.title);
  brandEntries.push(entry('hearing_aid_brands', id, mergeExisting('hearing_aid_brands', id, { brand_name: heroTitle, route: normalizeRoute(route), meta_title: cleanMetaTitle(h.title || heroTitle), meta_description: h.meta_description || sp.data.meta_description || '', body_content: extractStandardBody(route) }, ['brand_name','route','meta_title','meta_description','body_content'])));
}
const utilityEntries = [];
for (const route of UTILITY_ROUTES) {
  const sp = staticByRoute(route); if (!sp) continue;
  const h = extractHead(route);
  const id = slugFromRoute(route);
  const heroTitle = extractHeroTitle(route) || titleFromPageTitle(h.title || sp.data.title);
  utilityEntries.push(entry('utility_pages', id, mergeExisting('utility_pages', id, { title: heroTitle, route: normalizeRoute(route), meta_title: cleanMetaTitle(h.title || heroTitle), meta_description: h.meta_description || sp.data.meta_description || '', body_content: extractStandardBody(route) }, ['title','route','meta_title','meta_description','body_content'])));
}
const blogEntries = [];
for (const route of BLOG_ROUTES) {
  const sp = staticByRoute(route); if (!sp) continue;
  const h = extractHead(route);
  const id = slugFromRoute(route);
  const heroTitle = extractHeroTitle(route) || titleFromPageTitle(h.title || sp.data.title);
  const blogMeta = extractBlogMeta(route);
  blogEntries.push(entry('blog_posts', id, mergeExisting('blog_posts', id, { title: heroTitle, route: normalizeRoute(route), meta_title: cleanMetaTitle(h.title || heroTitle), meta_description: h.meta_description || sp.data.meta_description || '', category: blogMeta.category, featured_image: extractFeaturedImage(route), body_content: extractBlogBody(route) }, ['title','route','meta_title','meta_description','category','featured_image','body_content'])));
}

seed.collections = seed.collections.filter((c) => !COLLECTION_SLUGS.includes(c.slug));
seed.collections.push(
  collection('services', 'Services', [field('title', 'string', 'Service Title'), field('route', 'string', 'Route'), field('meta_title', 'string', 'Meta Title'), field('meta_description', 'text', 'Meta Description'), field('body_content', 'portableText', 'Body Content')]),
  collection('hearing_aid_brands', 'Hearing Aid Brands', [field('brand_name', 'string', 'Brand Name'), field('route', 'string', 'Route'), field('meta_title', 'string', 'Meta Title'), field('meta_description', 'text', 'Meta Description'), field('body_content', 'portableText', 'Body Content')]),
  collection('utility_pages', 'Utility Pages', [field('title', 'string', 'Page Title'), field('route', 'string', 'Route'), field('meta_title', 'string', 'Meta Title'), field('meta_description', 'text', 'Meta Description'), field('body_content', 'portableText', 'Body Content')]),
  collection('blog_posts', 'Blog Posts', [field('title', 'string', 'Post Title'), field('route', 'string', 'Route'), field('meta_title', 'string', 'Meta Title'), field('meta_description', 'text', 'Meta Description'), field('category', 'string', 'Category'), field('featured_image', 'image', 'Featured Image'), field('body_content', 'portableText', 'Body Content')])
);
seed.entries = seed.entries.filter((e) => !COLLECTION_SLUGS.includes(e.collection));
seed.entries.push(...serviceEntries, ...brandEntries, ...utilityEntries, ...blogEntries);
fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

function ensureCollection(slug, label) {
  const id = `col_${slug}`;
  db.prepare(`insert into _emdash_collections (id, slug, label, created_at, updated_at) values (?, ?, ?, ?, ?) on conflict(slug) do update set label=excluded.label`).run(id, slug, label, now(), now());
  return db.prepare('select id from _emdash_collections where slug=?').get(slug).id;
}
function resetFields(collectionId, fields) {
  db.prepare('delete from _emdash_fields where collection_id=?').run(collectionId);
  const stmt = db.prepare(`insert into _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable) values (?, ?, ?, ?, ?, ?, 0, 0, null, null, null, null, ?, ?, 0, 1)`);
  fields.forEach((f, i) => stmt.run(`fld_${collectionId}_${f.slug}`, collectionId, f.slug, f.label, f.type, f.type === 'portableText' || f.type === 'image' ? 'JSON' : 'TEXT', i, now()));
}
function recreateTable(table, cols) {
  db.exec(`drop table if exists ${table}`);
  db.exec(`create table ${table} (id TEXT PRIMARY KEY, slug TEXT, status TEXT, author_id TEXT, primary_byline_id TEXT, created_at TEXT, updated_at TEXT, published_at TEXT, scheduled_at TEXT, deleted_at TEXT, version INTEGER default 1, live_revision_id TEXT, draft_revision_id TEXT, locale TEXT, translation_group TEXT, ${cols.map(([n,t])=>`${n} ${t}`).join(', ')})`);
}
function insertRows(table, rows, fieldNames) {
  const cols = ['id','slug','status','created_at','updated_at','published_at',...fieldNames];
  const stmt = db.prepare(`insert into ${table} (${cols.join(',')}) values (${cols.map(()=>'?').join(',')})`);
  for (const e of rows) stmt.run(e.id, e.id, e.status, now(), now(), now(), ...fieldNames.map((f)=> {
    const v=e.data[f];
    if (Array.isArray(v) || (v && typeof v === 'object')) return JSON.stringify(v);
    return v ?? null;
  }));
}
const tx = db.transaction(() => {
  for (const slug of COLLECTION_SLUGS) {
    const col = seed.collections.find((c)=>c.slug===slug);
    const colId = ensureCollection(slug, col.label);
    resetFields(colId, col.fields);
  }
  db.prepare("delete from _emdash_collections where slug in ('service_content_blocks','service_accordion_items')").run();
  db.prepare("delete from _emdash_fields where collection_id not in (select id from _emdash_collections)").run();
  recreateTable('ec_services', [['title','TEXT'],['route','TEXT'],['meta_title','TEXT'],['meta_description','TEXT'],['body_content','JSON']]);
  recreateTable('ec_hearing_aid_brands', [['brand_name','TEXT'],['route','TEXT'],['meta_title','TEXT'],['meta_description','TEXT'],['body_content','JSON']]);
  recreateTable('ec_utility_pages', [['title','TEXT'],['route','TEXT'],['meta_title','TEXT'],['meta_description','TEXT'],['body_content','JSON']]);
  recreateTable('ec_blog_posts', [['title','TEXT'],['route','TEXT'],['meta_title','TEXT'],['meta_description','TEXT'],['category','TEXT'],['featured_image','JSON'],['body_content','JSON']]);
  insertRows('ec_services', serviceEntries, ['title','route','meta_title','meta_description','body_content']);
  insertRows('ec_hearing_aid_brands', brandEntries, ['brand_name','route','meta_title','meta_description','body_content']);
  insertRows('ec_utility_pages', utilityEntries, ['title','route','meta_title','meta_description','body_content']);
  insertRows('ec_blog_posts', blogEntries, ['title','route','meta_title','meta_description','category','featured_image','body_content']);
});
tx();
db.close();
console.log(`Seeded ${serviceEntries.length} services, ${brandEntries.length} brands, ${utilityEntries.length} utility pages, ${blogEntries.length} blog posts.`);
