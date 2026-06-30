const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = process.cwd();
const seedPath = path.join(root, 'seed', 'seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const brandDefs = [
  { slug: 'oticon', brand: 'Oticon' },
  { slug: 'phonak', brand: 'Phonak' },
  { slug: 'resound', brand: 'ReSound' },
  { slug: 'signia', brand: 'Signia' },
  { slug: 'starkey', brand: 'Starkey' },
  { slug: 'unitron', brand: 'Unitron' },
  { slug: 'widex', brand: 'Widex' },
];

const imageFields = Array.from({ length: 15 }, (_, index) => ({
  slug: `image_${index + 1}`,
  label: `Image ${index + 1}`,
  type: 'image',
}));

const collection = {
  slug: 'hearing_aid_brand_carousel_images',
  label: 'Hearing Aid Brand Carousels',
  labelSingular: 'Hearing Aid Brand Carousel',
  supports: ['drafts', 'revisions'],
  fields: [
    { slug: 'title', label: 'Admin Title', type: 'string', required: true, searchable: true },
    { slug: 'brand_slug', label: 'Brand Slug', type: 'string', required: true, searchable: true },
    ...imageFields,
  ],
};

function id() { return crypto.randomUUID().replace(/-/g, '').slice(0, 26).toUpperCase(); }
const crypto = require('crypto');
function columnType(field) {
  if (field.type === 'integer' || field.type === 'boolean') return 'INTEGER';
  if (field.type === 'number') return 'REAL';
  if (['multiSelect', 'portableText', 'json', 'repeater'].includes(field.type)) return 'JSON';
  return 'TEXT';
}
function norm(value) { return value == null ? null : typeof value === 'string' ? value : JSON.stringify(value); }
function dbPaths() {
  const paths = [path.join(root, 'data.db')];
  const d1 = path.join(root, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (fs.existsSync(d1)) for (const file of fs.readdirSync(d1)) if (file.endsWith('.sqlite') && file !== 'metadata.sqlite') paths.push(path.join(d1, file));
  return paths.filter(fs.existsSync);
}
function tableExists(db, table) { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table); }
function colExists(db, table, col) { return db.prepare(`PRAGMA table_info("${table}")`).all().some((row) => row.name === col); }
function ensureColumn(db, table, field) { if (!colExists(db, table, field.slug)) db.exec(`ALTER TABLE "${table}" ADD COLUMN "${field.slug}" ${columnType(field)}`); }
function safeDropColumn(db, table, col) {
  if (!colExists(db, table, col)) return;
  try { db.exec(`ALTER TABLE "${table}" DROP COLUMN "${col}"`); }
  catch (error) { console.warn(`Could not drop ${table}.${col}: ${error.message}`); }
}
function parseMaybe(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value;
  try { return JSON.parse(trimmed); } catch { return value; }
}

function currentCarouselEntriesFromSeed() {
  const existing = seed.content?.hearing_aid_brand_carousel_images || [];
  const byBrand = new Map();
  for (const item of existing) {
    const data = item.data || {};
    const brand = data.brand_slug || item.slug;
    if (!brand) continue;
    if (!byBrand.has(brand)) byBrand.set(brand, []);
    const directImages = imageFields.map((field) => data[field.slug]).filter(Boolean);
    if (directImages.length) {
      byBrand.set(brand, directImages.map((image, index) => ({ image, sort_order: index + 1 })));
    } else if (data.image) {
      byBrand.get(brand).push({ image: data.image, sort_order: Number(data.sort_order || byBrand.get(brand).length + 1) });
    }
  }
  return byBrand;
}

function ensureSeed() {
  const idx = seed.collections.findIndex((item) => item.slug === collection.slug);
  if (idx >= 0) seed.collections[idx] = collection;
  else seed.collections.push(collection);
  seed.content ||= {};
  const byBrand = currentCarouselEntriesFromSeed();
  seed.content.hearing_aid_brand_carousel_images = brandDefs.map((def) => {
    const images = (byBrand.get(def.slug) || []).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).slice(0, 15);
    const data = {
      title: `${def.brand} Hearing Aid Carousel`,
      brand_slug: def.slug,
    };
    images.forEach((item, index) => {
      data[`image_${index + 1}`] = parseMaybe(item.image);
    });
    return { id: `${def.slug}-carousel`, slug: `${def.slug}-carousel`, status: 'published', data };
  });
  fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
}

function configureDb(dbPath) {
  const db = new Database(dbPath);
  try {
    const table = `ec_${collection.slug}`;
    let row = db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(collection.slug);
    const collectionId = row?.id || id();
    const supports = JSON.stringify(collection.supports || []);
    if (!row) {
      db.prepare(`INSERT INTO _emdash_collections (id, slug, label, label_singular, description, icon, supports, source, created_at, updated_at, search_config, has_seo, url_pattern, comments_enabled, comments_moderation, comments_closed_after_days, comments_auto_approve_users) VALUES (@id,@slug,@label,@singular,NULL,NULL,@supports,'seed',datetime('now'),datetime('now'),@search,0,NULL,0,'first_time',90,1)`).run({ id: collectionId, slug: collection.slug, label: collection.label, singular: collection.labelSingular, supports, search: JSON.stringify({ enabled: true }) });
    } else {
      db.prepare("UPDATE _emdash_collections SET label=?, label_singular=?, supports=?, has_seo=0, updated_at=datetime('now') WHERE id=?").run(collection.label, collection.labelSingular, supports, collectionId);
    }
    if (!tableExists(db, table)) {
      db.exec(`CREATE TABLE "${table}" ("id" TEXT PRIMARY KEY,"slug" TEXT,"status" TEXT DEFAULT 'draft',"author_id" TEXT,"primary_byline_id" TEXT,"created_at" TEXT DEFAULT (datetime('now')),"updated_at" TEXT DEFAULT (datetime('now')),"published_at" TEXT,"scheduled_at" TEXT,"deleted_at" TEXT,"version" INTEGER DEFAULT 1,"live_revision_id" TEXT,"draft_revision_id" TEXT,"locale" TEXT DEFAULT 'en' NOT NULL,"translation_group" TEXT, CONSTRAINT "${table}_slug_locale_unique" UNIQUE ("slug", "locale"))`);
    }
    for (const field of collection.fields) ensureColumn(db, table, field);
    safeDropColumn(db, table, 'image');
    safeDropColumn(db, table, 'sort_order');
    db.prepare(`DELETE FROM _emdash_fields WHERE collection_id=? AND slug NOT IN (${collection.fields.map(() => '?').join(',')})`).run(collectionId, ...collection.fields.map((field) => field.slug));
    collection.fields.forEach((field, index) => {
      const existing = db.prepare('SELECT id FROM _emdash_fields WHERE collection_id=? AND slug=?').get(collectionId, field.slug);
      if (existing) db.prepare('UPDATE _emdash_fields SET label=?, type=?, column_type=?, required=?, searchable=?, sort_order=? WHERE id=?').run(field.label, field.type, columnType(field), field.required ? 1 : 0, field.searchable ? 1 : 0, index, existing.id);
      else db.prepare(`INSERT INTO _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable) VALUES (@id,@collectionId,@slug,@label,@type,@columnType,@required,0,NULL,NULL,NULL,NULL,@sortOrder,datetime('now'),@searchable,1)`).run({ id: id(), collectionId, slug: field.slug, label: field.label, type: field.type, columnType: columnType(field), required: field.required ? 1 : 0, sortOrder: index, searchable: field.searchable ? 1 : 0 });
    });
    db.prepare(`DELETE FROM "${table}"`).run();
    const cols = ['id', 'slug', 'status', 'created_at', 'updated_at', 'published_at', 'version', 'locale', ...collection.fields.map((field) => field.slug)];
    const insert = db.prepare(`INSERT INTO "${table}" (${cols.map((col) => `"${col}"`).join(',')}) VALUES (${cols.map((col) => `@${col}`).join(',')})`);
    for (const item of seed.content.hearing_aid_brand_carousel_images) {
      const rowData = { id: item.id, slug: item.slug, status: item.status || 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), published_at: new Date().toISOString(), version: 1, locale: 'en' };
      for (const field of collection.fields) rowData[field.slug] = norm(item.data[field.slug]);
      insert.run(rowData);
    }
  } finally {
    db.close();
  }
}

ensureSeed();
for (const dbPath of dbPaths()) configureDb(dbPath);
console.log(`Brand carousel records: ${seed.content.hearing_aid_brand_carousel_images.length}`);
for (const item of seed.content.hearing_aid_brand_carousel_images) {
  console.log(`${item.slug}: ${imageFields.filter((field) => item.data[field.slug]).length} images`);
}
