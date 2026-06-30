const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = process.cwd();
const seedPath = path.join(root, 'seed', 'seed.json');
const dbPath = path.join(root, 'data.db');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const CONTENT_FIELD_COUNT = 8;
const ACCORDION_FIELD_COUNT = 16;

function field(slug, type, label) {
  return { name: slug, slug, type, label };
}

function pad(num) {
  return String(num).padStart(2, '0');
}

function now() {
  return new Date().toISOString();
}

function ensureColumn(db, table, name, type) {
  const cols = db.prepare(`pragma table_info(${table})`).all().map((row) => row.name);
  if (!cols.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
}

const services = seed.collections.find((collection) => collection.slug === 'services');
if (!services) throw new Error('Missing services collection');

const baseFields = [
  field('title', 'string', 'Title'),
  field('hero_title', 'string', 'Hero Title'),
  field('route', 'string', 'Route'),
  field('excerpt', 'text', 'Excerpt'),
  field('meta_description', 'text', 'Meta Description'),
  field('body_content', 'portableText', 'Content Section 01'),
];

const sectionFields = [];
for (let i = 2; i <= CONTENT_FIELD_COUNT; i += 1) {
  sectionFields.push(field(`content_section_${pad(i)}`, 'portableText', `Content Section ${pad(i)}`));
}

const accordionFields = [];
for (let i = 1; i <= ACCORDION_FIELD_COUNT; i += 1) {
  accordionFields.push(field(`accordion_${pad(i)}_question`, 'string', `Accordion ${pad(i)} Question`));
  accordionFields.push(field(`accordion_${pad(i)}_answer`, 'portableText', `Accordion ${pad(i)} Answer`));
}

services.fields = [...baseFields, ...sectionFields, ...accordionFields];
services.hasSeo = true;

const entries = seed.entries || [];
const serviceBlocks = entries.filter((entry) => entry.collection === 'service_content_blocks');
const accordionItems = entries.filter((entry) => entry.collection === 'service_accordion_items');
const blocksByService = new Map();
const accordionsByGroup = new Map();
for (const block of serviceBlocks) {
  const service = block.data.service_slug;
  if (!blocksByService.has(service)) blocksByService.set(service, []);
  blocksByService.get(service).push(block);
}
for (const item of accordionItems) {
  const key = `${item.data.service_slug}::${item.data.group_key}`;
  if (!accordionsByGroup.has(key)) accordionsByGroup.set(key, []);
  accordionsByGroup.get(key).push(item);
}
for (const list of blocksByService.values()) list.sort((a, b) => (a.data.sort_order ?? 0) - (b.data.sort_order ?? 0));
for (const list of accordionsByGroup.values()) list.sort((a, b) => (a.data.sort_order ?? 0) - (b.data.sort_order ?? 0));

for (const entry of entries.filter((item) => item.collection === 'services')) {
  const blocks = blocksByService.get(entry.id) || [];
  if (!blocks.length) continue;

  const layout = [];
  let contentIndex = 0;
  let accordionIndex = 0;

  for (const block of blocks) {
    if (block.data.block_type === 'divider') continue;

    if (block.data.block_type === 'rich_text') {
      contentIndex += 1;
      if (contentIndex > CONTENT_FIELD_COUNT) {
        throw new Error(`${entry.id} needs more than ${CONTENT_FIELD_COUNT} content section fields`);
      }
      const fieldName = contentIndex === 1 ? 'body_content' : `content_section_${pad(contentIndex)}`;
      entry.data[fieldName] = block.data.content || [];
      layout.push({ type: 'content', field: fieldName, source_element_id: block.data.source_element_id || 'service-text' });
      continue;
    }

    if (block.data.block_type === 'accordion_group') {
      const groupItems = accordionsByGroup.get(`${entry.id}::${block.data.accordion_group_key}`) || [];
      const items = [];
      for (const item of groupItems) {
        accordionIndex += 1;
        if (accordionIndex > ACCORDION_FIELD_COUNT) {
          throw new Error(`${entry.id} needs more than ${ACCORDION_FIELD_COUNT} accordion fields`);
        }
        const questionField = `accordion_${pad(accordionIndex)}_question`;
        const answerField = `accordion_${pad(accordionIndex)}_answer`;
        entry.data[questionField] = item.data.question || '';
        entry.data[answerField] = item.data.answer_content || [];
        items.push({
          question_field: questionField,
          answer_field: answerField,
          source_element_id: item.data.source_element_id || '',
          answer_widget_id: item.data.answer_widget_id || 'service-accordion-answer',
        });
      }
      layout.push({
        type: 'accordion_group',
        source_element_id: block.data.source_element_id || 'service-accordion',
        items,
      });
    }
  }

  for (let i = contentIndex + 1; i <= CONTENT_FIELD_COUNT; i += 1) {
    const fieldName = i === 1 ? 'body_content' : `content_section_${pad(i)}`;
    delete entry.data[fieldName];
  }
  for (let i = accordionIndex + 1; i <= ACCORDION_FIELD_COUNT; i += 1) {
    delete entry.data[`accordion_${pad(i)}_question`];
    delete entry.data[`accordion_${pad(i)}_answer`];
  }

  entry.data.content_layout = layout;
  entry.data.meta_description = entry.data.meta_description || entry.data.excerpt || '';
  delete entry.data.body_html;
}

seed.collections = seed.collections.filter((collection) => !['service_content_blocks', 'service_accordion_items'].includes(collection.slug));
seed.entries = entries.filter((entry) => !['service_content_blocks', 'service_accordion_items'].includes(entry.collection));

fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

const db = new Database(dbPath);
const tx = db.transaction(() => {
  const serviceCollection = db.prepare("select id from _emdash_collections where slug='services'").get();
  if (!serviceCollection) throw new Error('Services collection missing in DB');

  ensureColumn(db, 'ec_services', 'meta_description', 'TEXT');
  ensureColumn(db, 'ec_services', 'content_layout', 'JSON');
  for (let i = 2; i <= CONTENT_FIELD_COUNT; i += 1) ensureColumn(db, 'ec_services', `content_section_${pad(i)}`, 'JSON');
  for (let i = 1; i <= ACCORDION_FIELD_COUNT; i += 1) {
    ensureColumn(db, 'ec_services', `accordion_${pad(i)}_question`, 'TEXT');
    ensureColumn(db, 'ec_services', `accordion_${pad(i)}_answer`, 'JSON');
  }

  db.prepare('delete from _emdash_fields where collection_id=?').run(serviceCollection.id);
  const insertField = db.prepare(`insert into _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable) values (?, ?, ?, ?, ?, ?, 0, 0, null, null, null, null, ?, ?, 0, 1)`);
  services.fields.forEach((f, index) => {
    insertField.run(`fld_services_${f.slug}`, serviceCollection.id, f.slug, f.label, f.type, f.type === "portableText" ? "JSON" : "TEXT", index, now());
  });

  const helperCollections = db.prepare("select id from _emdash_collections where slug in ('service_content_blocks','service_accordion_items')").all();
  for (const col of helperCollections) {
    db.prepare('delete from _emdash_fields where collection_id=?').run(col.id);
  }
  db.prepare("delete from _emdash_collections where slug in ('service_content_blocks','service_accordion_items')").run();

  const serviceEntries = seed.entries.filter((entry) => entry.collection === 'services');
  const cols = ['meta_description', 'body_content', 'content_layout'];
  for (let i = 2; i <= CONTENT_FIELD_COUNT; i += 1) cols.push(`content_section_${pad(i)}`);
  for (let i = 1; i <= ACCORDION_FIELD_COUNT; i += 1) {
    cols.push(`accordion_${pad(i)}_question`);
    cols.push(`accordion_${pad(i)}_answer`);
  }

  const setSql = cols.map((col) => `${col}=?`).join(', ');
  const update = db.prepare(`update ec_services set ${setSql}, updated_at=? where slug=?`);
  for (const entry of serviceEntries) {
    const values = cols.map((col) => {
      const value = entry.data[col];
      if (col === 'meta_description' || col.endsWith('_question')) return value || null;
      return JSON.stringify(value || []);
    });
    update.run(...values, now(), entry.id);
  }
});

tx();
db.close();
console.log(`Migrated ${seed.entries.filter((entry) => entry.collection === 'services').length} services to inline rich content fields.`);

