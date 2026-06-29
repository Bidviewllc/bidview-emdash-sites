// SEO audit: sitemap, robots, titles, meta descriptions, canonical, H1, OG, JSON-LD
import { readFileSync } from "node:fs";
import path from "node:path";

const BASE = "https://new-leaf-hearing-care.cameron-239.workers.dev";
const root = path.resolve(".");
const seed = JSON.parse(readFileSync(path.join(root, "seed", "seed.json"), "utf8"));

const pages = new Set([
  "/", "/about/", "/contact-us/",
  "/audiologist-hearing-aids-arvada-colorado/", "/audiologist-hearing-aids-littleton-colorado/",
  "/schedule-appointment/", "/sitemap/", "/hearing-wellness/",
]);
for (const c of Object.keys(seed.content)) for (const e of seed.content[c]) pages.add(`/${e.slug}/`);
const pageList = [...pages];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      const body = await r.text();
      return { status: r.status, body, ct: r.headers.get("content-type") || "", loc: r.headers.get("location") };
    } catch { if (i === tries - 1) return { status: 0, body: "" }; await sleep(400); }
  }
}
const pick = (html, re) => { const m = html.match(re); return m && m[1] != null ? m[1].trim() : null; };
const all = (html, re) => { const out = []; let m; while ((m = re.exec(html))) out.push(m[1]); return out; };
const decode = (s) => s ? s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'") : s;

// ---- sitemap & robots ----
console.log("====== SITEMAP & ROBOTS ======");
const sm = await get(BASE + "/sitemap.xml");
const smLocs = all(sm.body, /<loc>([^<]+)<\/loc>/g).map((u) => u.replace(BASE, "").replace(/\/$/, "/") );
console.log(`/sitemap.xml -> ${sm.status}, ${sm.ct}, ${smLocs.length} URLs`);
const robots = await get(BASE + "/robots.txt");
console.log(`/robots.txt -> ${robots.status}, ${robots.body.length} bytes`);
console.log("robots.txt body:\n" + robots.body.split("\n").map(l=>"   "+l).join("\n"));

// sitemap coverage vs crawled pages
const smSet = new Set(smLocs.map(u=>u.replace(BASE,"")));
const missingFromSitemap = pageList.filter((p) => !smSet.has(p));
const inSitemapNotCrawled = [...smSet].filter((u) => !pageList.includes(u));

// ---- per-page SEO ----
const rows = [];
const titles = new Map(), descs = new Map();
let done = 0;
for (const p of pageList) {
  const res = await get(BASE + p);
  done++;
  process.stdout.write(`\r[${done}/${pageList.length}] ${p.padEnd(50)}`);
  if (res.status !== 200) { rows.push({ p, status: res.status, err: true }); continue; }
  const h = res.body;
  const title = decode(pick(h, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const desc = decode(pick(h, /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i));
  const canonical = pick(h, /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const robotsMeta = pick(h, /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  const h1s = all(h, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map((x) => x.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
  const ogTitle = pick(h, /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  const ogDesc = pick(h, /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const ogImage = pick(h, /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  const ogType = pick(h, /<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']*)["']/i);
  const twCard = pick(h, /<meta[^>]*name=["']twitter:card["'][^>]*content=["']([^"']*)["']/i);
  const jsonld = all(h, /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const ldTypes = jsonld.map((j) => { try { const o = JSON.parse(j); const t = o["@type"] || (o["@graph"]||[]).map(g=>g["@type"]); return Array.isArray(t)?t.join(","):t; } catch { return "INVALID"; } });
  const viewport = !!pick(h, /<meta[^>]*name=["']viewport["']/i);
  const lang = pick(h, /<html[^>]*lang=["']([^"']*)["']/i);

  if (title) titles.set(p, title);
  if (desc) descs.set(p, desc);
  rows.push({ p, title, tLen: title?.length||0, desc, dLen: desc?.length||0, canonical, robotsMeta, h1count: h1s.length, h1: h1s[0]||"", ogTitle:!!ogTitle, ogDesc:!!ogDesc, ogImage, ogType, twCard:!!twCard, ld: ldTypes.join(" | "), viewport, lang });
}
console.log("\n");

// ---- analysis ----
const issues = { noTitle:[], titleLong:[], titleShort:[], noDesc:[], descLong:[], descShort:[], noCanonical:[], noH1:[], multiH1:[], noOG:[], noTwitter:[], noLD:[], invalidLD:[], noViewport:[], noLang:[], noindex:[] };
for (const r of rows) {
  if (r.err) continue;
  if (!r.title) issues.noTitle.push(r.p); else { if (r.tLen>65) issues.titleLong.push(`${r.p} (${r.tLen})`); if (r.tLen<20) issues.titleShort.push(`${r.p} (${r.tLen})`); }
  if (!r.desc) issues.noDesc.push(r.p); else { if (r.dLen>160) issues.descLong.push(`${r.p} (${r.dLen})`); if (r.dLen<70) issues.descShort.push(`${r.p} (${r.dLen})`); }
  if (!r.canonical) issues.noCanonical.push(r.p);
  if (r.h1count===0) issues.noH1.push(r.p); else if (r.h1count>1) issues.multiH1.push(`${r.p} (${r.h1count})`);
  if (!r.ogTitle || !r.ogImage) issues.noOG.push(r.p);
  if (!r.twCard) issues.noTwitter.push(r.p);
  if (!r.ld) issues.noLD.push(r.p);
  if (r.ld.includes("INVALID")) issues.invalidLD.push(r.p);
  if (!r.viewport) issues.noViewport.push(r.p);
  if (!r.lang) issues.noLang.push(r.p);
  if (r.robotsMeta && /noindex/i.test(r.robotsMeta)) issues.noindex.push(`${r.p} (${r.robotsMeta})`);
}
// duplicate titles/descs
const dupT = {}, dupD = {};
for (const [p,t] of titles) (dupT[t] ||= []).push(p);
for (const [p,d] of descs) (dupD[d] ||= []).push(p);
const dupTitles = Object.entries(dupT).filter(([,a])=>a.length>1);
const dupDescs = Object.entries(dupD).filter(([,a])=>a.length>1);

console.log("====== SITEMAP COVERAGE ======");
console.log(`Sitemap URLs: ${smLocs.length} | Crawled pages: ${pageList.length}`);
console.log(`Pages MISSING from sitemap (${missingFromSitemap.length}): ${missingFromSitemap.join(", ")||"none"}`);
console.log(`In sitemap but not in my page list (${inSitemapNotCrawled.length}): ${inSitemapNotCrawled.join(", ")||"none"}`);

const rep = (t,a)=>{ console.log(`\n### ${t}: ${a.length}`); a.slice(0,60).forEach(x=>console.log("  "+x)); };
console.log("\n====== ISSUES ======");
rep("Missing <title>", issues.noTitle);
rep("Title > 65 chars", issues.titleLong);
rep("Title < 20 chars", issues.titleShort);
rep("Missing meta description", issues.noDesc);
rep("Desc > 160 chars", issues.descLong);
rep("Desc < 70 chars", issues.descShort);
rep("Missing canonical", issues.noCanonical);
rep("Missing H1", issues.noH1);
rep("Multiple H1", issues.multiH1);
rep("Missing OG (title/image)", issues.noOG);
rep("Missing Twitter card", issues.noTwitter);
rep("Missing JSON-LD", issues.noLD);
rep("Invalid JSON-LD", issues.invalidLD);
rep("Missing viewport", issues.noViewport);
rep("Missing html lang", issues.noLang);
rep("noindex pages", issues.noindex);
console.log(`\n### DUPLICATE TITLES: ${dupTitles.length}`);
dupTitles.forEach(([t,a])=>console.log(`  "${t}"\n     ${a.join(", ")}`));
console.log(`\n### DUPLICATE DESCRIPTIONS: ${dupDescs.length}`);
dupDescs.forEach(([d,a])=>console.log(`  "${(d||"").slice(0,60)}..."\n     ${a.join(", ")}`));

// sample of JSON-LD types
console.log("\n====== JSON-LD TYPES (sample) ======");
rows.filter(r=>!r.err).slice(0,8).forEach(r=>console.log(`  ${r.p.padEnd(42)} ${r.ld||"NONE"}`));
console.log("\n====== TITLE/DESC SAMPLE ======");
rows.filter(r=>!r.err).slice(0,6).forEach(r=>console.log(`  ${r.p}\n     T(${r.tLen}): ${r.title}\n     D(${r.dLen}): ${r.desc}`));
