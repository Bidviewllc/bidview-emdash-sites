const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database('data.db');
const seedPath = 'seed/seed.json';
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const itemCollections = new Set(['homepage_services_items', 'homepage_hearing_solutions_items']);
const sectionCollections = new Set(['homepage_services_section', 'homepage_hearing_solutions_section']);
const subFields = [
  { slug: 'service_title', label: 'H3 Service Title', type: 'text' },
  { slug: 'description', label: 'Description', type: 'text' },
  { slug: 'service_url', label: 'Service URL', type: 'string' },
];
const repeaterField = {
  name: 'services',
  slug: 'services',
  type: 'repeater',
  label: 'Services',
  validation: { subFields },
};

function readItems(table) {
  try {
    return db.prepare(`select service_title, description, service_url, sort_order from ${table} order by cast(sort_order as real), id`).all()
      .map(({ service_title, description, service_url }) => ({ service_title, description, service_url }));
  } catch {
    return [];
  }
}

const servicesItems = readItems('ec_homepage_services_items');
const hearingItems = readItems('ec_homepage_hearing_solutions_items');

seed.collections = (seed.collections || [])
  .filter((collection) => !itemCollections.has(collection.slug))
  .map((collection) => {
    if (!sectionCollections.has(collection.slug)) return collection;
    const fields = (collection.fields || []).filter((field) => field.slug !== 'services');
    const insertAfter = fields.findIndex((field) => field.slug === 'featured_image');
    if (insertAfter >= 0) fields.splice(insertAfter + 1, 0, repeaterField);
    else fields.push(repeaterField);
    return { ...collection, fields };
  });

seed.entries = (seed.entries || [])
  .filter((entry) => !itemCollections.has(entry.collection))
  .map((entry) => {
    if (entry.collection === 'homepage_services_section') {
      return { ...entry, data: { ...entry.data, services: servicesItems } };
    }
    if (entry.collection === 'homepage_hearing_solutions_section') {
      return { ...entry, data: { ...entry.data, services: hearingItems } };
    }
    return entry;
  });

fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');

const tx = db.transaction(() => {
  for (const { collection, items } of [
    { collection: 'homepage_services_section', items: servicesItems },
    { collection: 'homepage_hearing_solutions_section', items: hearingItems },
  ]) {
    const row = db.prepare('select id from _emdash_collections where slug = ?').get(collection);
    if (!row) continue;
    const table = `ec_${collection}`;
    const cols = db.prepare(`pragma table_info(${table})`).all().map((col) => col.name);
    if (!cols.includes('services')) db.prepare(`alter table ${table} add column services JSON`).run();
    const exists = db.prepare('select id from _emdash_fields where collection_id = ? and slug = ?').get(row.id, 'services');
    const maxSort = db.prepare('select coalesce(max(sort_order), -1) as maxSort from _emdash_fields where collection_id = ?').get(row.id).maxSort;
    const validation = JSON.stringify({ subFields });
    if (exists) {
      db.prepare(`update _emdash_fields set label = ?, type = ?, column_type = ?, validation = ?, options = null where id = ?`)
        .run('Services', 'repeater', 'JSON', validation, exists.id);
    } else {
      db.prepare(`insert into _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, searchable, translatable) values (?, ?, ?, ?, ?, ?, 0, 0, null, ?, null, null, ?, 0, 1)`)
        .run(`field_${collection}_services`, row.id, 'services', 'Services', 'repeater', 'JSON', validation, Number(maxSort) + 1);
    }
    db.prepare(`update ${table} set services = ?, updated_at = ? where id = ?`)
      .run(JSON.stringify(items), new Date().toISOString(), collection === 'homepage_services_section' ? 'our-services' : 'our-hearing-solutions');
  }

  for (const collection of itemCollections) {
    const table = `ec_${collection}`;
    db.prepare('delete from _emdash_fields where collection_id in (select id from _emdash_collections where slug = ?)').run(collection);
    db.prepare('delete from _emdash_collections where slug = ?').run(collection);
    try { db.prepare(`drop table if exists ${table}`).run(); } catch {}
  }
});

tx();
console.log('Migrated homepage section items into section-level repeater fields.');

