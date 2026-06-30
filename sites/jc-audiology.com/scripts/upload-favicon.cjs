const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const source = path.join('local-copy', 'assets', 'media', 'jcaudiology-favicon-150x150.webp');
const storageKey = 'site/jcaudiology-favicon-150x150.webp';
const target = path.join('uploads', storageKey);
if (!fs.existsSync(source)) throw new Error(`Missing favicon source: ${source}`);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
const bytes = fs.readFileSync(target);
const db = new Database('data.db');
db.prepare(`insert into media (id, filename, mime_type, size, width, height, alt, storage_key, content_hash, created_at, status)
  values (@id, @filename, @mime_type, @size, @width, @height, @alt, @storage_key, @content_hash, @created_at, 'ready')
  on conflict(id) do update set filename=excluded.filename, mime_type=excluded.mime_type, size=excluded.size, width=excluded.width, height=excluded.height, alt=excluded.alt, storage_key=excluded.storage_key, content_hash=excluded.content_hash, status='ready'`)
  .run({
    id: 'media-site-jcaudiology-favicon-150x150',
    filename: 'jcaudiology-favicon-150x150.webp',
    mime_type: 'image/webp',
    size: bytes.length,
    width: 150,
    height: 150,
    alt: 'JC Audiology favicon',
    storage_key: storageKey,
    content_hash: crypto.createHash('sha256').update(bytes).digest('hex'),
    created_at: new Date().toISOString(),
  });
db.close();
console.log(`Uploaded favicon media: ${storageKey}`);
