import { defineMiddleware } from "astro:middleware";
import shells from "./data/shells.json";
import { createSitemap } from "./lib/sitemap";

const FILE_EXTENSION_PATTERN = /\.[a-z0-9]+$/i;
const PUBLIC_HTML_CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const EDGE_HTML_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";
const PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PRIVATE_CACHE_CONTROL = "no-store, max-age=0";
const HTML_CACHE_VERSION = "2026-11-13-earwax-video-v66";
const PUBLIC_MEDIA_PREFIX = "/_emdash/api/media/file/";
const CACHEABLE_MEDIA_TYPES = ["image/", "video/", "audio/"];
// Old WordPress pages with equivalent content on the rebuilt site.
// Retired articles and staff without replacements deliberately remain 404s.
// Keys are lowercase and WITHOUT a trailing slash (normalised at lookup time),
// so both /category/hearing and /category/hearing/ resolve.
const LEGACY_REDIRECTS: Record<string, string> = {
  "/our-team": "/about/",
  "/hearing-services/hearing-diagnostic-services": "/audiology-services/hearing-assessments/",
  "/patient-resources/online-appointment-booking": "/schedule-appointment/",
  "/protecting-your-hearing": "/hearing-loss/protecting-your-hearing/",
  "/hearing-loss-facts": "/hearing-loss/hearing-loss-facts/",
  "/hearing-aid-troubleshooting-guide": "/hearing-aids-products/hearing-aid-repairs-maintenance/",
  "/home": "/",
  "/about-new-leaf-hearing/what-separates-us": "/about/",
  "/hearing-services/communication-training-program": "/audiology-services/communication-training-program/",
  "/how-we-hear": "/hearing-loss/how-we-hear/",
  "/hearing-loss/how-we-hea": "/hearing-loss/",
  "/hearing-services/lace-ai-pro-auditory-training": "/audiology-services/lace-ai-pro-auditory-training/",
  "/real-ear-measurement": "/hearing-aids-products/hearing-aid-fittings/",
  "/category/audiologist": "/about/",
  "/category/education": "/patient-resources/",
  "/category/hearing": "/hearing-loss/",
  "/category/hearing-aid": "/hearing-aids-products/",
  "/category/newsletter": "/patient-resources/"
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

  // Canonical origin is https://newleafhearing.com: send www and plain http
  // (production hostnames only) to the same path on it in a single hop.
  const isProdHost = context.url.hostname === "newleafhearing.com" || context.url.hostname === "www.newleafhearing.com";
  if (isProdHost && (context.url.hostname === "www.newleafhearing.com" || context.url.protocol === "http:")) {
    const target = new URL(context.url);
    target.hostname = "newleafhearing.com";
    target.protocol = "https:";
    return new Response(null, {
      status: method === "GET" || method === "HEAD" ? 301 : 308,
      headers: { Location: target.toString(), "Cache-Control": "public, max-age=3600" }
    });
  }

  const workerCache = canCacheHtmlRequest(method, pathname) ? getWorkerCache() : undefined;
  const htmlCacheKey = workerCache ? getHtmlCacheKey(context.url) : undefined;

  if (workerCache && htmlCacheKey) {
    const cachedResponse = await workerCache.match(htmlCacheKey);
    if (cachedResponse) {
      return withWorkerCacheStatus(cachedResponse, "HIT");
    }
  }

  // Send known legacy pages straight to their current equivalent.
  const legacyTarget = LEGACY_REDIRECTS[pathname.replace(/\/+$/, "").toLowerCase()];
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
    return new Response(createSitemap(shells), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": PUBLIC_HTML_CACHE_CONTROL,
        "CDN-Cache-Control": EDGE_HTML_CACHE_CONTROL,
        "Cloudflare-CDN-Cache-Control": EDGE_HTML_CACHE_CONTROL
      }
    });
  }

  const response = await next();

  // Canonicalize existing pages only: missing paths must remain direct 404s.
  if (
    (method === "GET" || method === "HEAD") &&
    response.status === 200 &&
    pathname !== "/" &&
    !pathname.endsWith("/") &&
    !isPrivatePath(pathname) &&
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
