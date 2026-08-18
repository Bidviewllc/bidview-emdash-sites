import { defineMiddleware } from "astro:middleware";
import shells from "./data/shells.json";

const FILE_EXTENSION_PATTERN = /\.[a-z0-9]+$/i;
const PUBLIC_HTML_CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const EDGE_HTML_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";
const PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PRIVATE_CACHE_CONTROL = "no-store, max-age=0";
// Bump on every deploy that changes CSS/JS. Cached HTML references hashed asset
// filenames; if the version is not bumped, stale HTML keeps pointing at a hash
// that no longer exists and the page renders unstyled.
const HTML_CACHE_VERSION = "2026-08-18-community-resources-v37";
const PUBLIC_MEDIA_PREFIX = "/_emdash/api/media/file/";
const CACHEABLE_MEDIA_TYPES = ["image/", "video/", "audio/"];
const STATIC_PATHS = [
  "/",
  "/about/",
  "/arvada-reviews/",
  "/audiologist-hearing-aids-arvada-colorado/",
  "/audiologist-hearing-aids-littleton-colorado/",
  "/contact-us/",
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
const SITEMAP_PATHS = Array.from(new Set([...STATIC_PATHS, ...CONTENT_PATHS])).sort();

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const createSitemap = (origin: string) => {
  const urls = SITEMAP_PATHS
    .map((pathname) => `  <url>\n    <loc>${escapeXml(`${origin}${pathname}`)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
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

// Pages where the query string changes the rendered HTML. Everything else has its
// query string dropped from the cache key, so without this a filtered request would
// be served the cached unfiltered page.
const QUERY_AWARE_PATHS: Record<string, string[]> = {
  "/community-resources/": ["category", "sort"]
};

// Pages whose content is edited in the admin rather than changed by a deploy.
// The HTML cache is keyed on HTML_CACHE_VERSION and has no invalidation hook, so a
// cached page hides admin edits until the next deploy or the hour-long TTL expires.
// These paths skip the HTML cache entirely and are served fresh.
const LIVE_HTML_PATHS = new Set(["/community-resources/"]);

const isLiveHtmlPath = (pathname: string) =>
  LIVE_HTML_PATHS.has(pathname.endsWith("/") ? pathname : `${pathname}/`);

const getHtmlCacheKey = (url: URL) => {
  const cacheUrl = new URL(url);
  const normalisedPath = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  const allowedParams = QUERY_AWARE_PATHS[normalisedPath] ?? [];
  const preserved = allowedParams
    .map((key) => [key, url.searchParams.get(key)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null);

  cacheUrl.search = "";
  for (const [key, value] of preserved) {
    cacheUrl.searchParams.set(key, value);
  }
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
  !isLiveHtmlPath(pathname) &&
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

// Admin-edited pages: skip the edge cache as well, or the Worker bypass alone would
// still leave Cloudflare serving an hour-old copy.
const applyLiveHtmlCacheHeaders = (response: Response) => {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
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
    return new Response(createSitemap(context.url.origin), {
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

  if (response.status === 200 && isHtmlResponse(response) && isLiveHtmlPath(pathname)) {
    return withWorkerCacheStatus(applyLiveHtmlCacheHeaders(response), "BYPASS");
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
