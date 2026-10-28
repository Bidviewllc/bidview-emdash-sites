// Sitemap for newleafhearing.com. Shared by the build script (scripts/gen-sitemap.mjs,
// which writes public/sitemap.xml as a static file) and the Worker fallback in
// middleware.ts. Keep this file free of Astro and JSON imports so Node can load it.
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
// so newleafhearing.com and www both list www URLs.
const SITEMAP_ORIGIN = "https://www.newleafhearing.com";

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

const buildEntries = (shells: Shells) => {
  const contentPaths = Object.values(shells).flatMap((entries) => Object.keys(entries).map((slug) => `/${slug}/`));
  return Array.from(new Set([...STATIC_PATHS, ...contentPaths]))
  .map((pathname) => ({ pathname, ...sitemapMeta(pathname) }))
  .sort((a, b) => b.priority - a.priority || a.pathname.localeCompare(b.pathname));
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// The date is read inside the call. On Cloudflare Workers the clock is frozen
// at 1970-01-01 outside a request, so a top-level new Date() would give 1970.
export const createSitemap = (shells: Shells, today = new Date().toISOString().slice(0, 10)) => {
  const urls = buildEntries(shells)
    .map((u) => `  <url>
    <loc>${escapeXml(`${SITEMAP_ORIGIN}${u.pathname}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
};
