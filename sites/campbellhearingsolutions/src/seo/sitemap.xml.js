import { allPages, normalizeRoute } from "../lib/pages.js";

const escapeXml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export async function GET({ request }) {
  const origin = new URL(request.url).origin;
  const urls = allPages
    .map((page) => normalizeRoute(page.route))
    .sort((a, b) => a.localeCompare(b));

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((route) => `  <url><loc>${escapeXml(new URL(route, origin).href)}</loc></url>`),
    '</urlset>',
    ''
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
