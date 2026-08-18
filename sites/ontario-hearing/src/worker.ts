import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// Bump this string on each deploy that changes HTML to invalidate the edge cache
const CACHE_VERSION = "v82";

// Paths we never serve from cache — admin UI, API endpoints, internal emdash routes
const SKIP_CACHE_PATHS = ["/_emdash", "/api"];

// Response content types we cache (HTML pages + XML feeds + plain text like robots.txt)
const CACHEABLE_TYPES = ["text/html", "application/xml", "text/plain", "application/json"];

// Cookie names that indicate an authenticated/editor request
// (their content should never be served from the public cache)
const EDIT_COOKIES = ["emdash-edit-mode=true", "emdash-admin=", "emdash-session", "emdash_session"];

const worker = {
	...handler,

	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const cookie = request.headers.get("Cookie") || "";

		const isEditMode = EDIT_COOKIES.some((c) => cookie.includes(c));
		const skipCache =
			request.method !== "GET" ||
			SKIP_CACHE_PATHS.some((p) => url.pathname.startsWith(p)) ||
			isEditMode;

		if (skipCache) {
			return (handler as any).fetch(request, env, ctx);
		}

		// Normalize the cache key: strip query strings so `?cb=foo`, `?utm=...`, etc.
		// all hit the same cache entry. Keep only the version pin.
		const cacheKeyUrl = `${url.origin}${url.pathname}?__cv=${CACHE_VERSION}`;
		const cacheKey = new Request(cacheKeyUrl, { method: "GET" });
		const cache = caches.default;

		const cached = await cache.match(cacheKey);
		if (cached) {
			const hit = new Response(cached.body, cached);
			hit.headers.set("X-Cache-Status", "HIT");
			return hit;
		}

		const response = await (handler as any).fetch(request, env, ctx);
		const ct = response.headers.get("content-type") || "";
		const cacheable = CACHEABLE_TYPES.some((t) => ct.includes(t));

		if (response.status === 200 && cacheable) {
			const toCache = new Response(response.clone().body, response);
			// Edge cache 1 hour, serve stale up to 1 day while revalidating
			toCache.headers.set(
				"Cache-Control",
				"public, s-maxage=3600, stale-while-revalidate=86400",
			);
			toCache.headers.set("X-Cache-Status", "MISS");
			ctx.waitUntil(cache.put(cacheKey, toCache));

			// Return the MISS response with the same headers (so the client also sees the status)
			const out = new Response(response.body, response);
			out.headers.set("X-Cache-Status", "MISS");
			return out;
		}

		return response;
	},
};

export default worker;
