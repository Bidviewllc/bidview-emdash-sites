const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database('data.db');
const layouts = {};
for (const row of db.prepare('select slug, content_layout from ec_services where content_layout is not null').all()) {
  try {
    layouts[row.slug] = JSON.parse(row.content_layout || '[]');
  } catch {
    layouts[row.slug] = [];
  }
}
fs.mkdirSync(path.join('src', 'data'), { recursive: true });
fs.writeFileSync(path.join('src', 'data', 'service-layouts.json'), `${JSON.stringify(layouts, null, 2)}\n`);

const cols = db.prepare('pragma table_info(ec_services)').all().map((r) => r.name);
if (cols.includes('content_layout')) {
  db.exec('ALTER TABLE ec_services DROP COLUMN content_layout');
}

db.close();

const seedPath = path.join('seed', 'seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
for (const entry of seed.entries || []) {
  if (entry.collection === 'services' && entry.data) delete entry.data.content_layout;
}
fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

const envPath = 'emdash-env.d.ts';
let env = fs.readFileSync(envPath, 'utf8');
env = env.replace(/\n  content_layout\?: unknown\[];/, '');
fs.writeFileSync(envPath, env);

console.log(`Exported ${Object.keys(layouts).length} service layouts and removed content_layout from CMS data.`);
