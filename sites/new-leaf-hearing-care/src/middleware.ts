import { defineMiddleware } from "astro:middleware";
import shells from "./data/shells.json";

const FILE_EXTENSION_PATTERN = /\.[a-z0-9]+$/i;
const PUBLIC_HTML_CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const EDGE_HTML_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";
const PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PRIVATE_CACHE_CONTROL = "no-store, max-age=0";
const HTML_CACHE_VERSION = "2026-10-13-reviews-from-d1-v55";
const PUBLIC_MEDIA_PREFIX = "/_emdash/api/media/file/";
const CACHEABLE_MEDIA_TYPES = ["image/", "video/", "audio/"];
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
// Old WordPress blog-category archives that 404'd after the rebuild.
// Keys are lowercase and WITHOUT a trailing slash (normalised at lookup time),
// so both /category/hearing and /category/hearing/ resolve.
const LEGACY_CATEGORY_REDIRECTS: Record<string, string> = {
  "/category/audiologist": "/about/",
  "/category/education": "/patient-resources/",
  "/category/hearing": "/hearing-loss/",
  "/category/hearing-aid": "/hearing-aids-products/",
  "/category/newsletter": "/patient-resources/"
};

const CONTENT_PATHS = Object.entries(shells).flatMap(([collection, entries]) =>
  Object.keys(entries).map((slug) => `/${slug}/`)
);
const SITEMAP_PATHS = Array.from(new Set([...STATIC_PATHS, ...CONTENT_PATHS]));

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

const SITEMAP_ENTRIES = SITEMAP_PATHS
  .map((pathname) => ({ pathname, ...sitemapMeta(pathname) }))
  .sort((a, b) => b.priority - a.priority || a.pathname.localeCompare(b.pathname));

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// The date is read inside the call. On Cloudflare Workers the clock is frozen
// at 1970-01-01 outside a request, so a top-level new Date() would give 1970.
const createSitemap = () => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = SITEMAP_ENTRIES
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

const isPrivatePath = (pathname: string) =>
  pathname.startsWith("/_emdash/") ||
  pathname.startsWith("/api/") ||
  pathname.startsWith("/uploads/");

const isPublicMediaPath = (pathname: string) =>
  pathname.startsWith(PUBLIC_MEDIA_PREFIX);

const isHtmlResponse = (response: Response) =>
  (response.headers.get("Content-Type") || "").toLowerCase().includes("text/html");

const isCacheableMediaResponse = (response: Response) => {
  const contentType = (response.headers.get("Content-Type") || "").toLowerCase();
  return CACHEABLE_MEDIA_TYPES.some((type) => contentType.startsWith(type));
};

const getHtmlCacheKey = (url: URL) => {
  const cacheUrl = new URL(url);
  cacheUrl.search = "";
  cacheUrl.searchParams.set("__html_cache_version", HTML_CACHE_VERSION);
  return new Request(cacheUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "text/html"
    }
  });
};

const canCacheHtmlRequest = (method: string, pathname: string) =>
  method === "GET" &&
  !isPrivatePath(pathname) &&
  !FILE_EXTENSION_PATTERN.test(pathname);

const getWorkerCache = () => {
  const runtime = globalThis as typeof globalThis & { caches?: CacheStorage };
  return runtime.caches?.default;
};

const withWorkerCacheStatus = (response: Response, status: "HIT" | "MISS" | "BYPASS") => {
  const headers = new Headers(response.headers);
  headers.set("X-NewLeaf-Worker-Cache", status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

const applyPublicHtmlCacheHeaders = (response: Response) => {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
  headers.set("CDN-Cache-Control", EDGE_HTML_CACHE_CONTROL);
  headers.set("Cloudflare-CDN-Cache-Control", EDGE_HTML_CACHE_CONTROL);
  headers.set("Vary", "Accept-Encoding");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

const applyPrivateCacheHeaders = (response: Response) => {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  headers.delete("CDN-Cache-Control");
  headers.delete("Cloudflare-CDN-Cache-Control");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

const applyPublicMediaCacheHeaders = (response: Response) => {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", PUBLIC_MEDIA_CACHE_CONTROL);
  headers.set("CDN-Cache-Control", PUBLIC_MEDIA_CACHE_CONTROL);
  headers.set("Cloudflare-CDN-Cache-Control", PUBLIC_MEDIA_CACHE_CONTROL);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const method = context.request.method.toUpperCase();
  const workerCache = canCacheHtmlRequest(method, pathname) ? getWorkerCache() : undefined;
  const htmlCacheKey = workerCache ? getHtmlCacheKey(context.url) : undefined;

  if (workerCache && htmlCacheKey) {
    const cachedResponse = await workerCache.match(htmlCacheKey);
    if (cachedResponse) {
      return withWorkerCacheStatus(cachedResponse, "HIT");
    }
  }

  // Legacy WordPress category archives -> the closest page on the new site.
  const legacyTarget = LEGACY_CATEGORY_REDIRECTS[pathname.replace(/\/+$/, "").toLowerCase()];
  if (legacyTarget) {
    const url = new URL(context.url);
    url.pathname = legacyTarget;
    url.search = "";
    const response = context.redirect(url, 301);
    response.headers.set("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
    response.headers.set("CDN-Cache-Control", EDGE_HTML_CACHE_CONTROL);
    response.headers.set("Cloudflare-CDN-Cache-Control", EDGE_HTML_CACHE_CONTROL);
    return response;
  }

  if (pathname === "/sitemap.xml") {
    return new Response(createSitemap(), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": PUBLIC_HTML_CACHE_CONTROL,
        "CDN-Cache-Control": EDGE_HTML_CACHE_CONTROL,
        "Cloudflare-CDN-Cache-Control": EDGE_HTML_CACHE_CONTROL
      }
    });
  }

  if (
    pathname !== "/" &&
    !pathname.endsWith("/") &&
    !pathname.startsWith("/_emdash/") &&
    !pathname.startsWith("/api/") &&
    !FILE_EXTENSION_PATTERN.test(pathname)
  ) {
    const url = new URL(context.url);
    url.pathname = `${pathname}/`;
    const response = context.redirect(url, 301);
    response.headers.set("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
    response.headers.set("CDN-Cache-Control", EDGE_HTML_CACHE_CONTROL);
    response.headers.set("Cloudflare-CDN-Cache-Control", EDGE_HTML_CACHE_CONTROL);
    return response;
  }

  const response = await next();

  if (method !== "GET" && method !== "HEAD") {
    return applyPrivateCacheHeaders(response);
  }

  if (response.status === 200 && isPublicMediaPath(pathname) && isCacheableMediaResponse(response)) {
    return applyPublicMediaCacheHeaders(response);
  }

  if (isPrivatePath(pathname) || response.headers.has("Set-Cookie")) {
    return applyPrivateCacheHeaders(response);
  }

  if (response.status === 200 && isHtmlResponse(response)) {
    const cacheableResponse = applyPublicHtmlCacheHeaders(response);

    if (workerCache && htmlCacheKey) {
      context.locals.cfContext?.waitUntil(
        workerCache.put(htmlCacheKey, cacheableResponse.clone()).catch((error) => {
          console.error("Failed to cache HTML response", error);
        })
      );
      return withWorkerCacheStatus(cacheableResponse, "MISS");
    }

    return withWorkerCacheStatus(cacheableResponse, "BYPASS");
  }

  return response;
});
