const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const fields = [
  ['audiology_services_heading_continuation', 'Audiology Services H2 Continuation', 17, 'in Michigan, Minnesota, and Florida'],
  ['hearing_aid_services_heading_continuation', 'Hearing Aid Services H2 Continuation', 19, 'in Michigan, Minnesota, and Florida'],
];

function apply(dbPath) {
  const db = new Database(dbPath);
  const tx = db.transaction(() => {
    const collection = db.prepare("SELECT id FROM _emdash_collections WHERE slug='homepages'").get();
    if (!collection) return;
    const columns = db.prepare('PRAGMA table_info(ec_homepages)').all().map((row) => row.name);
    for (const [slug, label, sortOrder, value] of fields) {
      const existing = db.prepare('SELECT id FROM _emdash_fields WHERE collection_id=? AND slug=?').get(collection.id, slug);
      if (!existing) {
        db.prepare(`INSERT INTO _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, searchable, translatable)
          VALUES (?, ?, ?, ?, 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, ?, 0, 1)`).run(crypto.randomUUID(), collection.id, slug, label, sortOrder);
      }
      if (!columns.includes(slug)) db.prepare(`ALTER TABLE ec_homepages ADD COLUMN "${slug}" TEXT`).run();
      db.prepare(`UPDATE ec_homepages SET "${slug}" = COALESCE(NULLIF("${slug}", ''), ?) WHERE slug='home'`).run(value);
    }
    db.prepare(`UPDATE ec_homepages SET audiology_services_heading=? WHERE slug='home' AND audiology_services_heading LIKE '% in Michigan,%'`).run("Audiology Services Offered at America's Best Hearing");
    db.prepare(`UPDATE ec_homepages SET hearing_aid_services_heading=? WHERE slug='home' AND hearing_aid_services_heading LIKE '% in Michigan,%'`).run("Our Hearing Aids & Protection Solutions Offered at America's Best Hearing");
  });
  tx();
  db.close();
}

apply('data.db');
const d1Dir = path.join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
if (fs.existsSync(d1Dir)) {
  for (const file of fs.readdirSync(d1Dir)) {
    if (file.endsWith('.sqlite') && file !== 'metadata.sqlite') apply(path.join(d1Dir, file));
  }
}
console.log('Applied homepage continuation fields.');

