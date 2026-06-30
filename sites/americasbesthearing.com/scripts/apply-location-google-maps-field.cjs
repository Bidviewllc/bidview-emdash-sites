const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

function apply(dbPath) {
  const db = new Database(dbPath);
  const tx = db.transaction(() => {
    const collection = db.prepare("SELECT id FROM _emdash_collections WHERE slug='locations'").get();
    if (!collection) return;
    const field = db.prepare('SELECT id FROM _emdash_fields WHERE collection_id=? AND slug=?').get(collection.id, 'google_maps_query');
    if (!field) {
      db.prepare(`INSERT INTO _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, searchable, translatable)
        VALUES (?, ?, 'google_maps_query', 'Google Maps Query', 'text', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 5, 0, 1)`).run(crypto.randomUUID(), collection.id);
    }
    const columns = db.prepare('PRAGMA table_info(ec_locations)').all().map((row) => row.name);
    if (!columns.includes('google_maps_query')) db.prepare('ALTER TABLE ec_locations ADD COLUMN google_maps_query TEXT').run();
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
console.log('Ensured locations.google_maps_query field and column.');
