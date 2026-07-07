import handler from "@astrojs/cloudflare/entrypoints/server";

// Edge cache to stop re-rendering the large (~770KB) converted HTML on every hit.
// Bump this on each deploy that changes page HTML to bust the Workers Cache.
const CACHE_VERSION = "v1";

// Never cache the CMS admin, API, auth, or the contact form (dynamic / per-session).
const SKIP_CACHE_PATHS = ["/_emdash", "/api", "/auth", "/contact"];

// Cookies that indicate a logged-in editor — must bypass cache so the inline-edit
// toolbar renders instead of an anonymous (cached) page.
const EDIT_MODE_COOKIES = ["emdash-edit-mode=true", "astro-session=", "emdash-session="];

const worker = {
  ...handler,

  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cookie = request.headers.get("cookie") || "";
    const hasEditorCookie = EDIT_MODE_COOKIES.some((c) => cookie.includes(c));

    const skipCache =
      request.method !== "GET" ||
      hasEditorCookie ||
      SKIP_CACHE_PATHS.some((p) => url.pathname.startsWith(p));

    if (skipCache) {
      return (handler as any).fetch(request, env, ctx);
    }

    const cache = (caches as any).default;
    // Normalized key: pathname only (strip query) so clean URLs and ?utm=…/?cb=…
    // variants share one cache entry. Versioned so deploys bust it.
    const cacheKey = new Request(url.origin + url.pathname + "?__cv=" + CACHE_VERSION, request);

    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const response = await (handler as any).fetch(request, env, ctx);

    if (response.status === 200 && response.headers.get("content-type")?.includes("text/html")) {
      const toCache = new Response(response.clone().body, response);
      toCache.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      ctx.waitUntil(cache.put(cacheKey, toCache));
    }

    return response;
  },
};

export default worker;
