// Writes public/sitemap.xml so /sitemap.xml is served as a static asset.
// An app route through the Worker paid a 25-30 second cold start on every
// crawl (same cause as the robots.txt fix); a static asset skips the Worker.
// Re-measured 2026-10-29: a Worker-served sitemap took 3-41 s per request even
// though the D1 read itself took ~200 ms, so it stays static.
// lastmod is the build date for code pages and the post's own date for blog posts.
// middleware.ts keeps a dynamic fallback (without blog posts) for builds that skip this step.
//
// Blog posts exist only in D1, not in shells.json, so this reads the published slugs from
// the production database through the Cloudflare API on every build/deploy. Publishing a
// blog post ends in a deploy, which regenerates this file, so the sitemap follows the posts.
// Without CLOUDFLARE_API_TOKEN (a plain local build) the posts are skipped with a warning.
import fs from "node:fs";
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

const xml = createSitemap(shells, undefined, posts);
fs.writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
console.log(`gen-sitemap: wrote public/sitemap.xml (${(xml.match(/<url>/g) || []).length} URLs, ${posts.length} blog posts)`);
