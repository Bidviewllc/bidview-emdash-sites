const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const Database = require("better-sqlite3");

const root = process.cwd();
const seedPath = path.join(root, "seed", "seed.json");
const mediaRoot = path.join(root, "public", "assets", "media");
const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const d1Path = fs.readdirSync(d1Dir)
  .filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite")
  .map((file) => path.join(d1Dir, file))[0];
if (!d1Path) throw new Error("Could not find local D1 database.");

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const staff = seed.content?.staff || [];
const db = new Database(d1Path);

function mediaByFilename(filename) {
  return db.prepare("SELECT * FROM media WHERE filename = ? AND status = 'ready' ORDER BY created_at DESC LIMIT 1").get(filename);
}

for (const entry of staff) {
  const image = entry.data?.image;
  const src = image?.src || image?.url || "";
  if (!src) continue;
  const filename = path.basename(src);
  const filePath = path.join(mediaRoot, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`Missing staff image file: ${filePath}`);
    continue;
  }

  let media = mediaByFilename(filename);
  if (!media) {
    console.log(`Uploading ${filename}`);
    execFileSync(process.execPath, [path.join(root, "node_modules", "emdash", "dist", "cli", "index.mjs"), "media", "upload", filePath, "--url", "http://localhost:4321", "--json"], {
      cwd: root,
      stdio: "pipe",
    });
    media = mediaByFilename(filename);
  } else {
    console.log(`Already uploaded ${filename}`);
  }

  if (!media) throw new Error(`Upload did not create media row for ${filename}`);

  const alt = image.alt || "";
  if (alt && media.alt !== alt) {
    db.prepare("UPDATE media SET alt = ? WHERE id = ?").run(alt, media.id);
    media.alt = alt;
  }
}

db.close();
console.log(`Staff media upload/check complete for ${staff.length} staff entries.`);
