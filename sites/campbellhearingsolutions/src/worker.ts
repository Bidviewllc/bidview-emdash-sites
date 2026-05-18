import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// Bump this version string on each Cloudflare deploy to bust Workers Cache.
const CACHE_VERSION = "v2";
const SKIP_CACHE_PATHS = ["/_emdash", "/api"];

const withStagingRobotsHeader = (requestUrl: URL, response: Response) => {
  if (!requestUrl.hostname.endsWith(".workers.dev")) {
    return response;
  }
  const next = new Response(response.body, response);
  next.headers.set("X-Robots-Tag", "noindex, nofollow");
  return next;
};

const worker = {
  ...handler,

  async fetch(request: Request, env: unknown, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    if (
      url.pathname.startsWith("/category/") ||
      /^\/202[4-6]\//.test(url.pathname)
    ) {
      return withStagingRobotsHeader(url, Response.redirect(new URL("/", url.origin), 301));
    }

    const skipCache =
      request.method !== "GET" || SKIP_CACHE_PATHS.some((path) => url.pathname.startsWith(path));

    if (skipCache) {
      const response = await (handler as typeof handler & { fetch: typeof fetch }).fetch(request, env, ctx);
      return withStagingRobotsHeader(url, response);
    }

    const cache = (caches as any).default;
    const cacheKey = new Request(
      request.url + (request.url.includes("?") ? "&" : "?") + "__cv=" + CACHE_VERSION,
      request,
    );
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const response = await (handler as typeof handler & { fetch: typeof fetch }).fetch(
      request,
      env,
      ctx,
    );

    const finalResponse = withStagingRobotsHeader(url, response);

    if (finalResponse.status === 200 && finalResponse.headers.get("content-type")?.includes("text/html")) {
      const toCache = new Response(finalResponse.clone().body, finalResponse);
      toCache.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      ctx.waitUntil(cache.put(cacheKey, toCache));
    }

    return finalResponse;
  },
};

export default worker;
