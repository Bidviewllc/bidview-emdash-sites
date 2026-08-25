// Dynamic sitemap that emits all 114 URLs from pages.json.
// Served at /sitemap.xml.
import type { APIRoute } from "astro";
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

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().split("T")[0];
  const sitemapPages = [
    ...(pagesData as Page[]),
    { slug: "reviews", url_path: "/reviews/", type: "resource" },
  ];
  const urls = sitemapPages.map(p => {
    const loc = SITE + p.url_path;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq(p.type, p.slug)}</changefreq>
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
