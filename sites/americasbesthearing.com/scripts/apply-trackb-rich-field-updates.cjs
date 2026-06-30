const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const richFields = {
  homepages: ['intro_body', 'about_body', 'locations_body', 'faq_body', 'news_body'],
  audiology_services: ['body'],
  hearing_aid_services: ['body'],
  faqs: ['answer'],
  testimonials: ['quote'],
};

function textToPortableText(value) {
  if (!value) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {}
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  return JSON.stringify(String(value)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => ({
      _type: 'block',
      _key: `block-${index + 1}`,
      style: 'normal',
      children: [{ _type: 'span', _key: `span-${index + 1}`, text: paragraph, marks: [] }],
      markDefs: [],
    })));
}

function apply(dbPath) {
  const db = new Database(dbPath);
  const updateFields = db.transaction(() => {
    for (const [collectionSlug, fields] of Object.entries(richFields)) {
      const collection = db.prepare('SELECT id FROM _emdash_collections WHERE slug = ?').get(collectionSlug);
      if (!collection) continue;
      for (const field of fields) {
        db.prepare('UPDATE _emdash_fields SET type = ? WHERE collection_id = ? AND slug = ?').run('portableText', collection.id, field);
      }
    }
    for (const [collectionSlug, fields] of Object.entries(richFields)) {
      const table = `ec_${collectionSlug}`;
      const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
      if (!exists) continue;
      const rows = db.prepare(`SELECT id, ${fields.map((field) => `"${field}"`).join(', ')} FROM ${table}`).all();
      for (const row of rows) {
        for (const field of fields) {
          if (row[field]) db.prepare(`UPDATE ${table} SET "${field}" = ? WHERE id = ?`).run(textToPortableText(row[field]), row.id);
        }
      }
    }
  });
  updateFields();
  db.close();
}

apply('data.db');
const d1Dir = path.join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
if (fs.existsSync(d1Dir)) {
  for (const file of fs.readdirSync(d1Dir)) {
    if (file.endsWith('.sqlite') && file !== 'metadata.sqlite') apply(path.join(d1Dir, file));
  }
}
console.log('Applied portable text field updates to local databases.');
