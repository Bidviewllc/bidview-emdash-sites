const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');

const root = process.cwd();
const seedPath = path.join(root, 'seed', 'seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const headingValues = {
  audiology_services_heading: "Audiology Services Offered at America's Best Hearing",
  audiology_services_heading_continuation: 'in Michigan, Minnesota, and Florida',
  hearing_aid_services_heading: "Our Hearing Aids & Protection Solutions Offered at America's Best Hearing",
  hearing_aid_services_heading_continuation: 'in Michigan, Minnesota, and Florida',
};
function randomKey(){ return Math.random().toString(36).slice(2,10); }
function textToPortableText(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return null;
  return [{ _type: 'block', style: 'normal', _key: randomKey(), children: [{ _type: 'span', text: value, _key: randomKey() }] }];
}
function locationRawName(slug){ return `audiologist-hearing-aids-${slug}`; }
function introBodyForLocation(slug) {
  const raw = path.join(root, 'src', 'components', 'raw-pages', `${locationRawName(slug)}.html`);
  if (!fs.existsSync(raw)) return null;
  const $ = cheerio.load(fs.readFileSync(raw, 'utf8'), { decodeEntities: false });
  const firstIntro = $('.astro-element-3585eba .astro-widget-container').first().text().replace(/\s+/g, ' ').trim();
  if (firstIntro) return textToPortableText(firstIntro);
  const fallback = $('.astro-widget-text-editor .astro-widget-container').first().text().replace(/\s+/g, ' ').trim();
  return textToPortableText(fallback);
}
function ensureSeedContent(collectionSlug) {
  for (const item of seed.content?.[collectionSlug] || []) {
    item.status = 'published';
    item.data ||= {};
    Object.assign(item.data, headingValues);
    if (collectionSlug === 'location_pages' && !item.data.intro_body) {
      item.data.intro_body = introBodyForLocation(item.slug || item.id);
    }
  }
}
function dbPaths(){
 const paths=[path.join(root,'data.db')];
 const d=path.join(root,'.wrangler','state','v3','d1','miniflare-D1DatabaseObject');
 if(fs.existsSync(d)){ for(const f of fs.readdirSync(d)) if(f.endsWith('.sqlite') && f!=='metadata.sqlite') paths.push(path.join(d,f)); }
 return paths.filter(fs.existsSync);
}
function tableInfo(db, table){ return db.prepare(`PRAGMA table_info("${table}")`).all(); }
function hasTable(db, table){ return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table); }
function hasColumn(db, table, column){ return tableInfo(db, table).some(c=>c.name===column); }
function normalize(value){ if(value == null) return null; return typeof value === 'string' ? value : JSON.stringify(value); }
function syncDb(dbPath){
 const db=new Database(dbPath);
 const now=new Date().toISOString();
 const tx=db.transaction(()=>{
  for (const [table, collectionSlug] of [['ec_staff_pages','staff_pages'], ['ec_location_pages','location_pages']]) {
    if (!hasTable(db, table)) continue;
    for (const item of seed.content?.[collectionSlug] || []) {
      const slug = item.slug || item.id;
      const data = item.data || {};
      const assignments = { status: 'published', updated_at: now, published_at: now };
      for (const [key, value] of Object.entries(headingValues)) if (hasColumn(db, table, key)) assignments[key] = value;
      if (collectionSlug === 'location_pages' && hasColumn(db, table, 'intro_body')) assignments.intro_body = normalize(data.intro_body || introBodyForLocation(slug));
      if (collectionSlug === 'staff_pages' && hasColumn(db, table, 'intro_body') && data.intro_body) assignments.intro_body = normalize(data.intro_body);
      const sets = Object.keys(assignments).map(k=>`"${k}"=@${k}`).join(', ');
      db.prepare(`UPDATE "${table}" SET ${sets} WHERE slug=@slug`).run({ ...assignments, slug });
    }
  }
 });
 tx(); db.close();
}
ensureSeedContent('staff_pages');
ensureSeedContent('location_pages');
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
for (const dbPath of dbPaths()) syncDb(dbPath);
console.log('Published and filled shared fields for staff_pages and location_pages.');
console.log('Location intro bodies filled:', (seed.content.location_pages||[]).filter(i=>i.data?.intro_body).length);
