// Dynamic sitemap that emits every URL from pages.json, with lastmod from D1.
// Served at /sitemap.xml.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import pagesData from "../data/pages.json";

const SITE = "https://ontariohearing.com";

type Page = {
  slug: string;
  url_path: string;
  type: string;
};

const priority = (type: string, slug: string) => {
  if (slug === "_home") return "1.0";
  if (["about-us", "contact-us"].includes(slug)) return "0.9";
  if (type === "service") return "0.8";
  if (type === "brand") return "0.7";
  if (type === "location") return "0.7";
  if (type === "blog") return "0.6";
  if (type === "resource") return "0.6";
  if (type === "condition") return "0.6";
  if (slug.startsWith("dr-")) return "0.7";
  return "0.5";
};

const changefreq = (type: string, slug: string) => {
  if (slug === "_home") return "weekly";
  if (type === "blog") return "monthly";
  if (["legal", "condition"].includes(type)) return "yearly";
  return "monthly";
};

// lastmod = the date the page's CMS row was last saved (updated_at in D1).
// Pages that are hardcoded in .astro files (home, about, contact, team, ...)
// have no CMS row, so they get no <lastmod> rather than a made-up one.
const TABLES = [
  "ec_service_pages", "ec_blog_posts", "ec_brand_pages", "ec_location_pages",
  "ec_resource_pages", "ec_condition_pages", "ec_legal_pages",
];

async function loadLastmods(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const db = (env as any).DB;
  if (!db) return map;
  try {
    // One query per table: D1 rejects a UNION ALL across this many tables.
    const batches = await db.batch(
      TABLES.map(t => db.prepare(`SELECT slug, substr(updated_at, 1, 10) AS d FROM ${t} WHERE deleted_at IS NULL`)),
    );
    for (const { results } of batches) {
      for (const r of results || []) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(r.d) && r.d > (map.get(r.slug) || "")) map.set(r.slug, r.d);
      }
    }
  } catch (err) {
    console.error("sitemap lastmod lookup failed (non-fatal):", err);
  }
  return map;
}

export const GET: APIRoute = async () => {
  const lastmods = await loadLastmods();
  const urls = (pagesData as Page[]).map(p => {
    const loc = SITE + p.url_path;
    return `  <url>
    <loc>${loc}</loc>
${lastmods.has(p.slug) ? `    <lastmod>${lastmods.get(p.slug)}</lastmod>
` : ""}    <changefreq>${changefreq(p.type, p.slug)}</changefreq>
    <priority>${priority(p.type, p.slug)}</priority>
  </url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
