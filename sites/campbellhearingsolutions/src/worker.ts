import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// Bump this version string on each Cloudflare deploy to bust Workers Cache.
const CACHE_VERSION = "v23";
const SKIP_CACHE_PATHS = ["/_emdash", "/api"];

// 3CX Live Chat widget. The WP->static conversion carried over the
// <call-us-selector> element but dropped the callus.js loader <script>, so the
// widget never initialized. The loader is self-hosted at /callus.js (a copy of
// the exact script the working WordPress site serves) instead of the external
// 3CX CDN, which loads unreliably (and a deferred script that fails to load
// leaves the icon inert/disabled). Re-inject a clean selector + loader before
// the final </body> of every HTML page (stripping any stale/leftover copy first).
const CHAT_WIDGET =
  '<call-us-selector phonesystem-url="https://prohear.3cx.us" party="LiveChat451006" enable-poweredby="false"></call-us-selector>' +
  '<script defer src="/callus.js" id="tcx-callus-js" charset="utf-8"></script>';

async function withChatWidget(response: Response): Promise<Response> {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;
  let html = await response.text();
  html = html
    .replace(/<call-us-selector\b[^>]*>[\s\S]*?<\/call-us-selector>/gi, "")
    .replace(/<script\b[^>]*id="tcx-callus-js"[^>]*>[\s\S]*?<\/script>/gi, "")
    // also strip any leftover WP-plugin loader (id or callus.js src) to avoid doubles
    .replace(/<script\b[^>]*(?:id="[^"]*callus[^"]*"|src="[^"]*callus\.js[^"]*")[^>]*>[\s\S]*?<\/script>/gi, "");
  const idx = html.lastIndexOf("</body>");
  if (idx >= 0) html = html.slice(0, idx) + CHAT_WIDGET + html.slice(idx);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

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
      return withStagingRobotsHeader(url, await withChatWidget(response));
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

    const finalResponse = withStagingRobotsHeader(url, await withChatWidget(response));

    if (finalResponse.status === 200 && finalResponse.headers.get("content-type")?.includes("text/html")) {
      const toCache = new Response(finalResponse.clone().body, finalResponse);
      toCache.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      ctx.waitUntil(cache.put(cacheKey, toCache));
    }

    return finalResponse;
  },
};

export default worker;
