// Writes src/data/lastmods.json: slug -> the date its CMS row was last saved (updated_at in D1).
// The sitemap is built once at deploy time from this file, so it needs no database at request time.
// Run before every build (npm run deploy does). Needs CLOUDFLARE_API_TOKEN. Without it, or if the read fails, the
// file already in the repo is kept, so a deploy never ships a sitemap with all its lastmod dates stripped.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/data/lastmods.json");
const ACCOUNT = "239e9d015c7a3a39cdc2e9400312f553";
const DB = "3e408b59-75b2-4b13-aa9e-a41e17ff678c"; // ontario-hearing-db
const TABLES = ["ec_service_pages", "ec_blog_posts", "ec_brand_pages", "ec_location_pages", "ec_resource_pages", "ec_condition_pages", "ec_legal_pages"];
const token = process.env.CLOUDFLARE_API_TOKEN;

async function main() {
  if (!token) { console.warn("gen-lastmods: no CLOUDFLARE_API_TOKEN, keeping the lastmods already in the repo"); return; }
  const map = {};
  for (const t of TABLES) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql: `SELECT slug, substr(updated_at, 1, 10) AS d FROM ${t} WHERE deleted_at IS NULL` }),
    });
    const j = await r.json();
    if (!j.success) throw new Error(`${t}: ${JSON.stringify(j.errors).slice(0, 160)}`);
    for (const row of j.result?.[0]?.results || []) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(row.d) && row.d > (map[row.slug] || "")) map[row.slug] = row.d;
    }
  }
  const n = Object.keys(map).length;
  if (n < 20) throw new Error(`only ${n} lastmods read; refusing to overwrite the file`); // an empty answer is a failure, not a fact
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`gen-lastmods: ${n} slugs written`);
}
main().catch((e) => { console.warn("gen-lastmods failed, keeping the lastmods already in the repo:", e.message); });
