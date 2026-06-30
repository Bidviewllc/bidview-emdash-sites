const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const sharp = require('sharp');

const root = process.cwd();
const seedPath = path.join(root, 'seed', 'seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const LOCAL_ORIGIN = 'http://localhost:4321';
const r2Dir = path.join(root, '.wrangler', 'state', 'v3', 'r2', 'americasbesthearing-media');
const r2BlobsDir = path.join(r2Dir, 'blobs');
const r2DbDir = path.join(root, '.wrangler', 'state', 'v3', 'r2', 'miniflare-R2BucketObject');
const r2DbPath = fs.existsSync(r2DbDir) ? fs.readdirSync(r2DbDir).filter((file) => file.endsWith('.sqlite') && file !== 'metadata.sqlite').map((file) => path.join(r2DbDir, file))[0] : null;

function ulidLike() {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let n = Date.now();
  let time = '';
  for (let i = 0; i < 10; i += 1) { time = alphabet[n % 32] + time; n = Math.floor(n / 32); }
  let random = '';
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 16; i += 1) random += alphabet[bytes[i % bytes.length] % 32];
  return `${time}${random}`;
}
function dbPaths() {
  const paths = [path.join(root, 'data.db')];
  const d1 = path.join(root, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (fs.existsSync(d1)) for (const file of fs.readdirSync(d1)) if (file.endsWith('.sqlite') && file !== 'metadata.sqlite') paths.push(path.join(d1, file));
  return paths.filter(fs.existsSync);
}
function tableExists(db, table) { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table); }
function mimeFromExt(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}
function normalizeLocalAsset(src) {
  if (!src || typeof src !== 'string') return '';
  let value = src.replace(/^https?:\/\/(?:www\.)?americasbesthearing\.com/i, '').replace(/^https?:\/\/localhost:4321/i, '').replace(/^https?:\/\/127\.0\.0\.1:4321/i, '');
  value = value.replace(/^(?:\.\.\/)+/, '/');
  if (value.startsWith('assets/')) value = `/${value}`;
  return value;
}
function fullLocalUrl(value) {
  if (typeof value !== 'string') return value;
  if (value.startsWith('/')) return `${LOCAL_ORIGIN}${value}`;
  return value;
}
async function metadataFor(filePath) {
  try {
    const meta = await sharp(filePath).metadata();
    return { width: meta.width || null, height: meta.height || null };
  } catch {
    return { width: null, height: null };
  }
}
function getAuthorId(db) {
  try {
    const row = db.prepare('SELECT id FROM users ORDER BY created_at LIMIT 1').get();
    if (row?.id) return row.id;
  } catch {}
  try {
    const row = db.prepare('SELECT author_id FROM media WHERE author_id IS NOT NULL LIMIT 1').get();
    if (row?.author_id) return row.author_id;
  } catch {}
  return null;
}
function existingMediaByHashOrFilename(dbs, contentHash, filename) {
  for (const db of dbs) {
    if (!tableExists(db, 'media')) continue;
    const row = db.prepare('SELECT * FROM media WHERE content_hash = ? OR filename = ? LIMIT 1').get(contentHash, filename);
    if (row) return row;
  }
  return null;
}
function writeR2Object(storageKey, buffer, mimeType) {
  if (!r2DbPath || !fs.existsSync(r2DbPath)) return;
  fs.mkdirSync(r2BlobsDir, { recursive: true });
  const db = new Database(r2DbPath);
  try {
    const existing = db.prepare('SELECT key FROM _mf_objects WHERE key=?').get(storageKey);
    if (existing) return;
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const blobId = `${sha256}${crypto.randomBytes(8).toString('hex')}`;
    const etag = crypto.createHash('md5').update(buffer).digest('hex');
    fs.writeFileSync(path.join(r2BlobsDir, blobId), buffer);
    db.prepare('INSERT INTO _mf_objects (key, blob_id, version, size, etag, uploaded, checksums, http_metadata, custom_metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      storageKey,
      blobId,
      crypto.randomBytes(16).toString('hex'),
      buffer.length,
      etag,
      Date.now(),
      '{}',
      JSON.stringify({ contentType: mimeType }),
      '{}',
    );
  } finally {
    db.close();
  }
}
async function registerMedia(image, dbs) {
  if (!image?.src) return image;
  if (String(image.src).startsWith('/_emdash/api/media/file/')) return image;
  const src = normalizeLocalAsset(image.src);
  const rel = src.replace(/^\//, '');
  const filePath = path.join(root, 'public', rel);
  if (!fs.existsSync(filePath)) return { ...image, src };
  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase() || '.bin';
  const mimeType = mimeFromExt(filename);
  const contentHash = `sha1:${crypto.createHash('sha1').update(buffer).digest('hex')}`;
  const dims = await metadataFor(filePath);
  let media = existingMediaByHashOrFilename(dbs, contentHash, filename);
  if (!media) {
    const mediaId = ulidLike();
    const storageKey = `${ulidLike()}${ext}`;
    writeR2Object(storageKey, buffer, mimeType);
    for (const db of dbs) {
      if (!tableExists(db, 'media')) continue;
      const authorId = getAuthorId(db);
      db.prepare('INSERT OR IGNORE INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, NULL)').run(
        mediaId,
        filename,
        mimeType,
        buffer.length,
        dims.width,
        dims.height,
        image.alt || '',
        storageKey,
        contentHash,
        new Date().toISOString(),
        authorId,
        'ready',
      );
    }
    media = { id: mediaId, filename, mime_type: mimeType, size: buffer.length, width: dims.width, height: dims.height, alt: image.alt || '', storage_key: storageKey, content_hash: contentHash };
  } else {
    writeR2Object(media.storage_key, buffer, media.mime_type || mimeType);
  }
  return {
    provider: 'local',
    id: media.id,
    src: `/_emdash/api/media/file/${media.storage_key}`,
    alt: image.alt || media.alt || '',
    width: media.width || dims.width || image.width || undefined,
    height: media.height || dims.height || image.height || undefined,
    mimeType: media.mime_type || mimeType,
    filename: media.filename || filename,
    meta: { storageKey: media.storage_key },
  };
}
function collectionUrlFields() {
  const map = new Map();
  for (const collection of seed.collections || []) {
    const fields = (collection.fields || []).filter((field) => field.type === 'url').map((field) => field.slug);
    if (fields.length) map.set(collection.slug, fields);
  }
  return map;
}
function updateSeedUrls() {
  const urlFields = collectionUrlFields();
  for (const [collectionSlug, fields] of urlFields.entries()) {
    for (const entry of seed.content?.[collectionSlug] || []) {
      for (const field of fields) if (entry.data && typeof entry.data[field] === 'string') entry.data[field] = fullLocalUrl(entry.data[field]);
    }
  }
}
function updateDbUrls(dbs) {
  const urlFields = collectionUrlFields();
  for (const db of dbs) {
    for (const [collectionSlug, fields] of urlFields.entries()) {
      const table = `ec_${collectionSlug}`;
      if (!tableExists(db, table)) continue;
      const columns = db.prepare(`PRAGMA table_info("${table}")`).all().map((row) => row.name);
      for (const field of fields) {
        if (!columns.includes(field)) continue;
        const rows = db.prepare(`SELECT id, "${field}" as value FROM "${table}"`).all();
        const update = db.prepare(`UPDATE "${table}" SET "${field}"=? WHERE id=?`);
        for (const row of rows) {
          const next = fullLocalUrl(row.value);
          if (next !== row.value) update.run(next, row.id);
        }
      }
    }
  }
}
async function updateBrandImages(dbs) {
  let count = 0;
  for (const entry of seed.content?.hearing_aid_brand_pages || []) {
    for (const item of entry.data.carousel_images || []) {
      item.image = await registerMedia(item.image, dbs);
      count += 1;
    }
    for (const model of entry.data.models || []) {
      model.image = await registerMedia(model.image, dbs);
      count += 1;
    }
  }
  return count;
}
function updateBrandDbRows(dbs) {
  for (const db of dbs) {
    if (!tableExists(db, 'ec_hearing_aid_brand_pages')) continue;
    const update = db.prepare('UPDATE ec_hearing_aid_brand_pages SET carousel_images=?, models=?, route_path=?, updated_at=? WHERE slug=?');
    for (const entry of seed.content.hearing_aid_brand_pages || []) {
      update.run(JSON.stringify(entry.data.carousel_images || []), JSON.stringify(entry.data.models || []), entry.data.route_path, new Date().toISOString(), entry.slug);
    }
  }
}
(async () => {
  const dbs = dbPaths().map((dbPath) => new Database(dbPath));
  try {
    updateSeedUrls();
    const imageCount = await updateBrandImages(dbs);
    updateDbUrls(dbs);
    updateBrandDbRows(dbs);
    fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
    console.log(`Registered/normalized ${imageCount} hearing-aid brand image references.`);
    console.log('Normalized internal URL fields to http://localhost:4321/... where applicable.');
  } finally {
    for (const db of dbs) db.close();
  }
})();
