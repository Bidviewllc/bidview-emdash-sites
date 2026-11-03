// Sitemap for newleafhearing.com. Shared by the build script (scripts/gen-sitemap.mjs,
// which writes public/sitemap.xml as a static file) and the Worker fallback in
// middleware.ts. Code pages and collections come from shells.json; blog posts only live
// in D1, so the build script passes them in. Keep this file free of Astro and JSON
// imports so Node can load it.
type Shells = Record<string, Record<string, unknown>>;

const STATIC_PATHS = [
  "/",
  "/about/",
  "/arvada-reviews/",
  "/audiologist-hearing-aids-arvada-colorado/",
  "/audiologist-hearing-aids-littleton-colorado/",
  "/contact-us/",
  "/community-resources/",
  "/littleton-reviews/",
  "/patient-resources/",
  "/schedule-appointment/",
  "/sitemap/"
];


// Sitemap entries carry lastmod, changefreq and priority, same layout as the
// Duet Hearing sitemap. The canonical host is fixed (not the request origin),
// so every host lists non-www URLs (non-www is the preferred host in GSC).
const SITEMAP_ORIGIN = "https://newleafhearing.com";

const sitemapMeta = (pathname: string): { priority: number; changefreq: string } => {
  if (pathname === "/") return { priority: 1.0, changefreq: "weekly" };
  if (pathname === "/privacy-policy/" || pathname === "/terms-of-service/") return { priority: 0.3, changefreq: "yearly" };
  if (pathname === "/sitemap/") return { priority: 0.3, changefreq: "monthly" };
  if (pathname.startsWith("/audiologist/")) return { priority: 0.9, changefreq: "monthly" };
  if (pathname.startsWith("/audiologist-hearing-aids-")) return { priority: 0.9, changefreq: "monthly" };
  if (pathname === "/audiology-services/" || pathname === "/hearing-aids-products/") return { priority: 0.9, changefreq: "monthly" };
  if (pathname.startsWith("/audiology-assistant/") || pathname.startsWith("/patient-care-coordinator/")) return { priority: 0.6, changefreq: "monthly" };
  if (pathname.startsWith("/audiology-services/") || pathname.startsWith("/hearing-aids-products/")) return { priority: 0.8, changefreq: "monthly" };
  if (pathname === "/about/" || pathname === "/contact-us/" || pathname === "/schedule-appointment/" || pathname === "/hearing-aid-services/" || pathname === "/hearing-loss/" || pathname.endsWith("-reviews/")) return { priority: 0.8, changefreq: "monthly" };
  if (pathname.endsWith("-hearing-aids/") || pathname.startsWith("/hearing-loss/") || pathname.startsWith("/give-back/") || pathname === "/online-hearing-tests/") return { priority: 0.7, changefreq: "monthly" };
  return { priority: 0.6, changefreq: "monthly" };
};

export type SitemapPost = { slug: string; lastmod?: string | null };

const dayOf = (value?: string | null) => {
  const day = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
};

const buildEntries = (shells: Shells, posts: SitemapPost[], lastmods: Record<string, string>) => {
  const contentPaths = Object.values(shells).flatMap((entries) => Object.keys(entries).map((slug) => `/${slug}/`));
  const postDates = new Map<string, string>();
  for (const p of posts) {
    const slug = String(p.slug || "").replace(/^\/+|\/+$/g, "");
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) continue;
    postDates.set(`/${slug}/`, dayOf(p.lastmod));
  }
  return Array.from(new Set([...STATIC_PATHS, ...contentPaths, ...postDates.keys()]))
  .map((pathname) => ({ pathname, lastmod: dayOf(lastmods[pathname]) || postDates.get(pathname) || "", ...sitemapMeta(pathname) }))
  .sort((a, b) => b.priority - a.priority || a.pathname.localeCompare(b.pathname));
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// lastmod is the page's real last-edit date (YYYY-MM-DD) from `lastmods` (path -> date) or the
// post's own date. A page with no known date gets NO <lastmod>: never the build or request date.
export const createSitemap = (shells: Shells, lastmods: Record<string, string> = {}, posts: SitemapPost[] = []) => {
  const urls = buildEntries(shells, posts, lastmods)
    .map((u) => [
      "  <url>",
      `    <loc>${escapeXml(`${SITEMAP_ORIGIN}${u.pathname}`)}</loc>`,
      ...(u.lastmod ? [`    <lastmod>${u.lastmod}</lastmod>`] : []),
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority.toFixed(1)}</priority>`,
      "  </url>"
    ].join("\n"))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
};
