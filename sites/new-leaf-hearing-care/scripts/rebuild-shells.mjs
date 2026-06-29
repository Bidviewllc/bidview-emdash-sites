import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const safeFile = (value) => (slugify(value || "page") || "page") + ".html";

const seed = JSON.parse(readFileSync(path.join(root, "seed", "seed.json"), "utf8"));
const manifest = {};
let missing = [];
let count = 0;

for (const [collection, entries] of Object.entries(seed.content)) {
  manifest[collection] = {};
  for (const e of entries) {
    const slug = e.slug;
    const file = safeFile(slug);
    const shellPath = path.join(root, "src", "content-shells", collection, file);
    if (!existsSync(shellPath)) {
      missing.push(`${collection}/${file} (slug: ${slug})`);
      continue;
    }
    manifest[collection][slug] = file;
    count++;
  }
}

writeFileSync(path.join(root, "src", "data", "shells.json"), JSON.stringify(manifest, null, 2));
console.log(`Wrote shells.json with ${count} mappings.`);
for (const [c, m] of Object.entries(manifest)) console.log(`  ${c}: ${Object.keys(m).length}`);
if (missing.length) {
  console.log(`\nMISSING shell files (${missing.length}):`);
  missing.forEach((m) => console.log("  " + m));
}
