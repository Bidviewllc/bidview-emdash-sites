// Site audit: crawl all pages, check links (#, broken internal), images (missing/broken)
import { readFileSync } from "node:fs";
import path from "node:path";

const BASE = "https://new-leaf-hearing-care.cameron-239.workers.dev";
const root = path.resolve(".");
const seed = JSON.parse(readFileSync(path.join(root, "seed", "seed.json"), "utf8"));

// Build page list
const pages = new Set([
  "/", "/about/", "/contact-us/",
  "/audiologist-hearing-aids-arvada-colorado/", "/audiologist-hearing-aids-littleton-colorado/",
  "/schedule-appointment/", "/sitemap/", "/hearing-wellness/",
  "/hearing-loss/online-hearing-test/", "/hearing-loss/protect-your-hearing/",
]);
for (const c of Object.keys(seed.content)) {
  for (const e of seed.content[c]) pages.add(`/${e.slug}/`);
}
const pageList = [...pages];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      const body = r.status >= 200 && r.status < 300 ? await r.text() : "";
      return { status: r.status, location: r.headers.get("location"), body, ct: r.headers.get("content-type") || "" };
    } catch (e) {
      if (i === tries - 1) return { status: 0, error: String(e), body: "" };
      await sleep(500);
    }
  }
}
async function head(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { method: "GET", redirect: "manual" });
      return r.status;
    } catch (e) {
      if (i === tries - 1) return 0;
      await sleep(400);
    }
  }
}

const attrRe = (tag, attr) => new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']*)["']`, "gi");
function extract(html, tag, attr) {
  const out = [];
  let m;
  const re = attrRe(tag, attr);
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

const results = {
  hashLinks: [],      // links to "#" or empty
  brokenInternal: [], // internal links returning non-2xx/3xx
  brokenImages: [],   // images returning non-200
  emptyImgAlt: [],    // images missing alt (informational)
  pageErrors: [],     // pages that didn't render 200
  externalLinks: new Set(),
};

const internalLinkCache = new Map(); // url -> status
const imageCache = new Map();

function normalize(href) {
  if (!href) return null;
  if (href.startsWith("http")) {
    if (href.includes("new-leaf-hearing-care.cameron-239.workers.dev")) return new URL(href).pathname;
    return null; // external
  }
  if (href.startsWith("//")) return null;
  if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return "SKIP";
  if (href.startsWith("#")) return "HASH";
  return href.startsWith("/") ? href : "/" + href;
}

let done = 0;
for (const page of pageList) {
  const res = await fetchText(BASE + page);
  done++;
  if (res.status !== 200) {
    results.pageErrors.push(`${page} -> ${res.status}${res.location ? " -> " + res.location : ""}`);
    continue;
  }
  const html = res.body;

  // LINKS
  const hrefs = extract(html, "a", "href");
  for (const h of hrefs) {
    const trimmed = h.trim();
    if (trimmed === "#" || trimmed === "" || trimmed === "#0") {
      results.hashLinks.push(`${page}  ->  href="${h}"`);
      continue;
    }
    const n = normalize(trimmed);
    if (n === "HASH" || n === "SKIP" || n === null) {
      if (n === null && trimmed.startsWith("http")) results.externalLinks.add(trimmed);
      continue;
    }
    // internal link - check status (strip in-page anchor)
    const clean = n.split("#")[0].split("?")[0];
    if (!clean || clean === "/") continue;
    if (!internalLinkCache.has(clean)) {
      const st = await head(BASE + clean);
      internalLinkCache.set(clean, st);
    }
    const st = internalLinkCache.get(clean);
    if (!(st >= 200 && st < 400)) {
      results.brokenInternal.push(`${page}  ->  ${clean} (${st})`);
    }
  }

  // IMAGES
  const imgs = extract(html, "img", "src");
  const alts = extract(html, "img", "alt"); // rough
  for (const src of imgs) {
    if (!src || src.startsWith("data:")) continue;
    let imgUrl = src.startsWith("http") ? src : BASE + (src.startsWith("/") ? src : "/" + src);
    const isInternal = imgUrl.includes("new-leaf-hearing-care.cameron-239.workers.dev");
    if (!imageCache.has(imgUrl)) {
      const st = await head(imgUrl);
      imageCache.set(imgUrl, st);
    }
    const st = imageCache.get(imgUrl);
    if (st !== 200) results.brokenImages.push(`${page}  ->  ${src} (${st})`);
  }
  process.stdout.write(`\r[${done}/${pageList.length}] scanned ${page.padEnd(50)}`);
}
console.log("\n\n========== AUDIT RESULTS ==========");
console.log(`Pages scanned: ${pageList.length}`);
console.log(`Unique internal links checked: ${internalLinkCache.size}`);
console.log(`Unique images checked: ${imageCache.size}`);

function report(title, arr) {
  console.log(`\n### ${title}: ${arr.length}`);
  arr.forEach((x) => console.log("  " + x));
}
report("PLACEHOLDER '#' LINKS", results.hashLinks);
report("BROKEN INTERNAL LINKS", results.brokenInternal);
report("BROKEN/MISSING IMAGES", results.brokenImages);
report("PAGE RENDER ERRORS", results.pageErrors);
console.log(`\n### EXTERNAL LINKS (${results.externalLinks.size}) — informational:`);
[...results.externalLinks].sort().forEach((x) => console.log("  " + x));
