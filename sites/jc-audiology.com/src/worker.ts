import handler from "@astrojs/cloudflare/entrypoints/server";

// Edge cache to stop re-rendering the large (~770KB) converted HTML on every hit.
// Bump this on each deploy that changes page HTML to bust the Workers Cache.
const CACHE_VERSION = "v2";

// Cloudflare Turnstile — injected client-side into any /api/contact form so real
// browsers get a token and bots are challenged. Server verifies in api/contact.ts
// (fail-open on missing token → the spam filter still gates).
const TURNSTILE_INJECT =
  '<script id="cf-ts-inject">(function(){var SK="0x4AAAAAADyoDeiRVAnzwr_E";function add(){var any=false;document.querySelectorAll("form").forEach(function(f){if((f.getAttribute("action")||"").indexOf("/api/contact")<0)return;if(f.querySelector(".cf-turnstile"))return;any=true;var d=document.createElement("div");d.className="cf-turnstile";d.style.margin="12px 0";var t=f.querySelector(".gform_footer,[type=submit],button[type=submit],button");if(t&&t.parentNode)t.parentNode.insertBefore(d,t);else f.appendChild(d);});return any;}window.__cfTsRender=function(){if(!window.turnstile)return;document.querySelectorAll(".cf-turnstile").forEach(function(d){if(d.dataset.r)return;d.dataset.r="1";try{window.turnstile.render(d,{sitekey:SK});}catch(e){}});};function api(){if(document.getElementById("cf-ts-api"))return;var s=document.createElement("script");s.id="cf-ts-api";s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__cfTsRender&render=explicit";s.async=true;s.defer=true;document.head.appendChild(s);}function init(){if(add())api();}if(document.readyState!=="loading")init();else document.addEventListener("DOMContentLoaded",init);})();</script>';

// Inject the Turnstile bootstrap script before </body> of every HTML page.
async function withTurnstile(response: Response): Promise<Response> {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;
  let html = await response.text();
  html = html.replace(/<script\b[^>]*id="cf-ts-inject"[^>]*>[\s\S]*?<\/script>/gi, "");
  const idx = html.lastIndexOf("</body>");
  if (idx >= 0) html = html.slice(0, idx) + TURNSTILE_INJECT + html.slice(idx);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

// Never cache the CMS admin, API, auth, or the contact form (dynamic / per-session).
const SKIP_CACHE_PATHS = ["/_emdash", "/api", "/auth", "/contact"];

// ---------------------------------------------------------------------------
// Media edge cache
//
// Uploaded media is served by the CMS at /_emdash/api/media/file/<key>. That path
// starts with "/_emdash", so SKIP_CACHE_PATHS above excluded it from the edge
// cache — meaning EVERY image request booted the whole CMS runtime (runtime init,
// D1 init + migrations, plugin states, hook resolution). Server-Timing showed
// ~0.5-2.4s per image, and any hiccup in that chain = one broken image for one
// visitor that then "heals" on the next load. That's the unreproducible
// broken-image report we kept chasing.
//
// Media blobs are immutable content addressed by storage key, so they are safe to
// cache at the edge and serve without touching the runtime at all.
const MEDIA_PREFIX = "/_emdash/api/media/file/";

// Browser caching: the upstream route sends `max-age=31536000, immutable`, which
// means a replaced image can never propagate — a year of stale content with no way
// to revalidate (this bit us when a client-requested photo swap didn't show up).
// A week of freshness plus stale-while-revalidate keeps it fast while staying
// correctable; repeat fetches hit the edge cache, not the runtime.
const MEDIA_BROWSER_CACHE = "public, max-age=604800, stale-while-revalidate=2592000";

async function serveMedia(
  request: Request,
  env: unknown,
  ctx: ExecutionContext,
  url: URL,
): Promise<Response> {
  const cache = (caches as any).default;
  // Key on path only — ?v=/?cb= variants must not fragment the cache.
  const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const response = await (handler as any).fetch(request, env, ctx);
  if (response.status !== 200) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", MEDIA_BROWSER_CACHE);
  const cached = new Response(response.body, {
    status: 200,
    statusText: response.statusText,
    headers,
  });

  ctx.waitUntil(cache.put(cacheKey, cached.clone()));
  return cached;
}

// Cookies that indicate a logged-in editor — must bypass cache so the inline-edit
// toolbar renders instead of an anonymous (cached) page.
const EDIT_MODE_COOKIES = ["emdash-edit-mode=true", "astro-session=", "emdash-session="];

const worker = {
  ...handler,

  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Media first — edge-cached, never touches the CMS runtime on a hit.
    // Must run BEFORE the skip-cache check, which excludes all of /_emdash.
    if (request.method === "GET" && url.pathname.startsWith(MEDIA_PREFIX)) {
      return serveMedia(request, env, ctx, url);
    }

    const cookie = request.headers.get("cookie") || "";
    const hasEditorCookie = EDIT_MODE_COOKIES.some((c) => cookie.includes(c));

    const skipCache =
      request.method !== "GET" ||
      hasEditorCookie ||
      SKIP_CACHE_PATHS.some((p) => url.pathname.startsWith(p));

    if (skipCache) {
      return withTurnstile(await (handler as any).fetch(request, env, ctx));
    }

    const cache = (caches as any).default;
    // Normalized key: pathname only (strip query) so clean URLs and ?utm=…/?cb=…
    // variants share one cache entry. Versioned so deploys bust it.
    const cacheKey = new Request(url.origin + url.pathname + "?__cv=" + CACHE_VERSION, request);

    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const response = await withTurnstile(await (handler as any).fetch(request, env, ctx));

    if (response.status === 200 && response.headers.get("content-type")?.includes("text/html")) {
      const toCache = new Response(response.clone().body, response);
      toCache.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      ctx.waitUntil(cache.put(cacheKey, toCache));
    }

    return response;
  },
};

export default worker;
