import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function queryD1(sql) {
  const result = execSync(
    `npx wrangler d1 execute audiologist-directory-db --local --command="${sql}" --json`,
    { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 }
  );
  return JSON.parse(result.toString());
}

// Get states
const statesResult = queryD1("SELECT DISTINCT state_slug FROM practices_search WHERE is_active = 1");
const states = statesResult[0]?.results || [];

// Get city+state combos
const citiesResult = queryD1("SELECT DISTINCT state_slug, city_slug FROM practices_search WHERE is_active = 1 AND city_slug != ''");
const cities = citiesResult[0]?.results || [];

// Get practice slugs
const practicesResult = queryD1("SELECT practice_slug FROM practices_search WHERE is_active = 1");
const practices = practicesResult[0]?.results || [];

const BASE = "https://audiologistdirectory.com";
const urls = [];

// Static pages
urls.push({ loc: `${BASE}/`, priority: "1.0", changefreq: "weekly" });
urls.push({ loc: `${BASE}/audiologists`, priority: "0.9", changefreq: "weekly" });
urls.push({ loc: `${BASE}/search`, priority: "0.8", changefreq: "weekly" });
urls.push({ loc: `${BASE}/brands`, priority: "0.7", changefreq: "monthly" });
urls.push({ loc: `${BASE}/resources`, priority: "0.7", changefreq: "weekly" });
urls.push({ loc: `${BASE}/list-your-practice`, priority: "0.5", changefreq: "monthly" });
urls.push({ loc: `${BASE}/about`, priority: "0.3", changefreq: "monthly" });
urls.push({ loc: `${BASE}/methodology`, priority: "0.3", changefreq: "monthly" });
urls.push({ loc: `${BASE}/contact`, priority: "0.3", changefreq: "monthly" });

// State pages
for (const s of states) {
  if (s.state_slug) {
    urls.push({ loc: `${BASE}/audiologists/${s.state_slug}`, priority: "0.8", changefreq: "weekly" });
  }
}

// City pages
for (const c of cities) {
  if (c.state_slug && c.city_slug) {
    urls.push({ loc: `${BASE}/audiologists/${c.state_slug}/${c.city_slug}`, priority: "0.7", changefreq: "weekly" });
  }
}

// Practice pages
for (const p of practices) {
  if (p.practice_slug) {
    urls.push({ loc: `${BASE}/practice/${p.practice_slug}`, priority: "0.6", changefreq: "monthly" });
  }
}

// Brand pages
for (const b of ["oticon","phonak","starkey","resound","widex","signia","unitron","bernafon"]) {
  urls.push({ loc: `${BASE}/brands/${b}`, priority: "0.5", changefreq: "monthly" });
}

// Resource pages
for (const r of ["first-appointment","rechargeable-vs-battery","tinnitus-therapy"]) {
  urls.push({ loc: `${BASE}/resources/${r}`, priority: "0.6", changefreq: "monthly" });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

writeFileSync(resolve(ROOT, "public/sitemap.xml"), xml);
console.log(`Sitemap generated: ${urls.length} URLs`);
