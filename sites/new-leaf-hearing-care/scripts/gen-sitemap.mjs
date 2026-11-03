// Writes public/sitemap.xml so /sitemap.xml is served as a static asset.
// An app route through the Worker paid a 25-30 second cold start on every
// crawl (same cause as the robots.txt fix); a static asset skips the Worker.
// Re-measured 2026-10-29: a Worker-served sitemap took 3-41 s per request even
// though the D1 read itself took ~200 ms, so it stays static.
// lastmod is each page's real last-edit date, never the build date: D1 updated_at for CMS pages
// and blog posts, the last git commit touching the source files for static pages and shells
// (the later of the two for a CMS page). Unknown date => no <lastmod> for that URL.
// middleware.ts keeps a dynamic fallback (no dates, no blog posts) for builds that skip this step.
//
// Blog posts exist only in D1, not in shells.json, so this reads the published slugs from
// the production database through the Cloudflare API on every build/deploy. Publishing a
// blog post ends in a deploy, which regenerates this file, so the sitemap follows the posts.
// Without CLOUDFLARE_API_TOKEN (a plain local build) the posts are skipped with a warning.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createSitemap } from "../src/lib/sitemap.ts";

const shells = JSON.parse(fs.readFileSync(new URL("../src/data/shells.json", import.meta.url), "utf8"));
const wrangler = JSON.parse(fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
const DB_ID = wrangler.d1_databases?.[0]?.database_id;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const loadPosts = async () => {
  if (!TOKEN || !DB_ID) {
    console.warn("gen-sitemap: WARNING no CLOUDFLARE_API_TOKEN, blog posts NOT included in the sitemap");
    return [];
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      sql: "SELECT slug, COALESCE(updated_at, published_at) AS lastmod FROM ec_blog_posts WHERE status = 'published' AND deleted_at IS NULL AND slug IS NOT NULL"
    }),
    signal: AbortSignal.timeout(30000)
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(`D1 query failed: HTTP ${res.status} ${JSON.stringify(body.errors)}`);
  return body.result?.[0]?.results ?? [];
};

const loadCmsDates = async () => {
  if (!TOKEN || !DB_ID) return {};
  const live = "status = 'published' AND deleted_at IS NULL AND slug IS NOT NULL";
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      sql: ["ec_internal_pages", "ec_hearing_aids", "ec_team"]
        .map((t) => `SELECT slug, updated_at AS lastmod FROM ${t} WHERE ${live}`)
        .join(" UNION ALL ")
    }),
    signal: AbortSignal.timeout(30000)
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(`D1 query failed: HTTP ${res.status} ${JSON.stringify(body.errors)}`);
  const dates = {};
  for (const r of body.result?.[0]?.results ?? []) dates[`/${String(r.slug).replace(/^\/+|\/+$/g, "")}/`] = String(r.lastmod || "").slice(0, 10);
  return dates;
};

const siteRoot = new URL("..", import.meta.url);
const git = (...args) => execFileSync("git", args, { cwd: siteRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
let gitUsable = true;
try {
  if (git("rev-parse", "--is-shallow-repository") === "true") throw new Error("shallow clone");
  git("rev-parse", "--git-dir");
} catch (err) {
  gitUsable = false;
  console.warn(`gen-sitemap: WARNING git dates unavailable (${err.message}); static pages get no lastmod`);
}
// Author date of the newest commit touching any of the files. Unlike the committer date it survives rebases.
const gitDay = (paths) => {
  if (!gitUsable) return "";
  const existing = paths.filter((p) => fs.existsSync(new URL(p, siteRoot)));
  if (!existing.length) return "";
  try { return git("log", "-1", "--format=%as", "--", ...existing); } catch { return ""; }
};
const later = (a, b) => (a && b ? (a > b ? a : b) : a || b || "");

const STATIC_SOURCES = {
  "/": ["src/content-shells/static/index.html", "src/pages/index.astro"],
  "/about/": ["src/content-shells/static/about.html", "src/pages/about.astro"],
  "/contact-us/": ["src/content-shells/static/contact-us.html", "src/pages/contact-us.astro"],
  "/schedule-appointment/": ["src/content-shells/static/schedule-appointment.html", "src/pages/schedule-appointment.astro"],
  "/sitemap/": ["src/content-shells/static/sitemap.html", "src/pages/sitemap.astro"],
  "/audiologist-hearing-aids-arvada-colorado/": ["src/content-shells/static/audiologist-hearing-aids-arvada-colorado.html", "src/pages/audiologist-hearing-aids-arvada-colorado.astro"],
  "/audiologist-hearing-aids-littleton-colorado/": ["src/content-shells/static/audiologist-hearing-aids-littleton-colorado.html", "src/pages/audiologist-hearing-aids-littleton-colorado.astro"],
  "/arvada-reviews/": ["src/pages/arvada-reviews.astro", "src/components/ReviewsPage.astro", "src/reviews/reviews.json"],
  "/littleton-reviews/": ["src/pages/littleton-reviews.astro", "src/components/ReviewsPage.astro", "src/reviews/reviews.json"],
  "/community-resources/": ["src/pages/community-resources.astro"],
  "/patient-resources/": ["src/pages/patient-resources/index.astro"]
};

const buildLastmods = async () => {
  let cms = {};
  try {
    cms = await loadCmsDates();
  } catch (err) {
    console.error(`gen-sitemap: ERROR could not read CMS dates: ${err.message}`);
  }
  if (!TOKEN) console.warn("gen-sitemap: WARNING no CLOUDFLARE_API_TOKEN, CMS pages use their git date only");
  const dates = {};
  for (const [pathname, files] of Object.entries(STATIC_SOURCES)) dates[pathname] = gitDay(files);
  for (const [collection, entries] of Object.entries(shells)) {
    for (const [slug, file] of Object.entries(entries)) {
      const pathname = `/${slug}/`;
      dates[pathname] = later(cms[pathname], gitDay([`src/content-shells/${collection}/${file}`]));
    }
  }
  return dates;
};

let posts = [];
try {
  posts = await loadPosts();
} catch (err) {
  // A failed read must not ship a sitemap that silently drops every blog post.
  console.error(`gen-sitemap: ERROR could not read blog posts: ${err.message}`);
  if (fs.existsSync(new URL("../public/sitemap.xml", import.meta.url))) {
    console.error("gen-sitemap: keeping the existing public/sitemap.xml");
    process.exit(0);
  }
  console.error("gen-sitemap: no previous sitemap, writing it without blog posts");
}

const lastmods = await buildLastmods();
const xml = createSitemap(shells, lastmods, posts);
const undated = (xml.match(/<url>(?:(?!<lastmod>)[\s\S])*?<\/url>/g) || []).length;
if (undated) console.warn(`gen-sitemap: WARNING ${undated} URL(s) have no lastmod (no date found)`);
fs.writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
console.log(`gen-sitemap: wrote public/sitemap.xml (${(xml.match(/<url>/g) || []).length} URLs, ${posts.length} blog posts)`);
