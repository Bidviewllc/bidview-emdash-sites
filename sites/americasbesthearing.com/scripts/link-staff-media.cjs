const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const root = process.cwd();
const seed = JSON.parse(fs.readFileSync(path.join(root, "seed", "seed.json"), "utf8"));
const staff = seed.content?.staff || [];
const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const d1Path = fs.readdirSync(d1Dir)
  .filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite")
  .map((file) => path.join(d1Dir, file))[0];
if (!d1Path) throw new Error("Could not find local D1 database.");

const dbPaths = [path.join(root, "data.db"), d1Path];
const d1 = new Database(d1Path, { readonly: true });
const mediaByFilename = new Map(d1.prepare("SELECT * FROM media WHERE status = 'ready'").all().map((row) => [row.filename, row]));
d1.close();

function mediaValue(row, alt) {
  return {
    provider: "local",
    id: row.id,
    src: `/_emdash/api/media/file/${row.storage_key}`,
    alt: alt || row.alt || undefined,
    width: row.width || undefined,
    height: row.height || undefined,
    mimeType: row.mime_type,
    filename: row.filename,
    meta: { storageKey: row.storage_key },
  };
}

for (const dbPath of dbPaths) {
  const db = new Database(dbPath);
  const tx = db.transaction(() => {
    if (dbPath.endsWith("data.db")) {
      const existing = new Set(db.prepare("SELECT id FROM media").all().map((row) => row.id));
      const insert = db.prepare(`INSERT INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color) VALUES (@id, @filename, @mime_type, @size, @width, @height, @alt, @caption, @storage_key, @content_hash, @created_at, @author_id, @status, @blurhash, @dominant_color)`);
      for (const row of mediaByFilename.values()) {
        if (!existing.has(row.id)) insert.run(row);
      }
    }

    const updateStaff = db.prepare("UPDATE ec_staff SET image = ? WHERE slug = ?");
    const updateMediaAlt = db.prepare("UPDATE media SET alt = ? WHERE id = ?");
    for (const entry of staff) {
      const image = entry.data?.image;
      const filename = path.basename(image?.src || "");
      const media = mediaByFilename.get(filename);
      if (!media) throw new Error(`Missing uploaded media for ${filename}`);
      const alt = image?.alt || media.alt || "";
      if (alt) updateMediaAlt.run(alt, media.id);
      updateStaff.run(JSON.stringify(mediaValue(media, alt)), entry.slug || entry.id);
    }
  });
  tx();
  const count = db.prepare("SELECT COUNT(*) AS count FROM media").get().count;
  const linked = db.prepare("SELECT COUNT(*) AS count FROM ec_staff WHERE image LIKE '%\"provider\":\"local\"%' ESCAPE '\\'").get().count;
  console.log(`${path.basename(dbPath)}: media=${count}, staff linked=${linked}`);
  db.close();
}
