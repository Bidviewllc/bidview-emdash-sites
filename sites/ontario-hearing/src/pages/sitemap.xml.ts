// Sitemap for every URL in pages.json. Built once at deploy time (prerender), so crawlers never wait on the database:
// as a live route 57% of robots/sitemap requests were abandoned after ~10s (Worker logs 2026-10-30..11-05).
// lastmod comes from src/data/lastmods.json, written from D1 by scripts/gen-lastmods.mjs before each build.
import type { APIRoute } from "astro";
import pagesData from "../data/pages.json";
import lastmodData from "../data/lastmods.json";

export const prerender = true;

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

// lastmod = the date the page's CMS row was last saved. Pages hardcoded in .astro files (home, about, contact, team,
// ...) have no CMS row, so they get no <lastmod> rather than a made-up one.
const lastmods = new Map<string, string>(Object.entries(lastmodData as Record<string, string>));

export const GET: APIRoute = async () => {
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
