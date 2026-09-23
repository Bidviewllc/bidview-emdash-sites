// Canonical sitemap. Overrides emdash's default, which lists only CMS entries
// (this site has none, so it was an empty <sitemapindex>).
// URLs always use the production origin, including on staging.
import { SITE_URL, SITEMAP_PATHS } from '../lib/site';

export const prerender = false;

export function GET() {
  const urls = SITEMAP_PATHS.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
