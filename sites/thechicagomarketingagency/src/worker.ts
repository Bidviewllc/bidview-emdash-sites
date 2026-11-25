import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// Bump this version string on each deploy to bust the Workers Cache
const CACHE_VERSION = "v20";
const SKIP_CACHE_PATHS = ["/_emdash", "/contact", "/free-seo-audit", "/subscribe", "/api"];

function withWorkersDevNoindex(request: Request, response: Response): Response {
	const host = new URL(request.url).hostname;
	if (!host.endsWith(".workers.dev")) return response;
	const headers = new Headers(response.headers);
	headers.set("X-Robots-Tag", "noindex, nofollow");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

const worker = {
	...handler,

	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Only cache GET requests for public pages
		const skipCache =
			request.method !== "GET" ||
			SKIP_CACHE_PATHS.some((p) => url.pathname.startsWith(p));

		const response = skipCache
			? await (handler as any).fetch(request, env, ctx)
			: await (async () => {
				const cache = caches.default;
				// Versioned cache key so stale responses are auto-busted on deploy
				const cacheKey = new Request(request.url + (request.url.includes("?") ? "&" : "?") + "__cv=" + CACHE_VERSION, request);
				const cached = await cache.match(cacheKey);
				if (cached) return cached;

				const fresh = await (handler as any).fetch(request, env, ctx);

				// Cache successful HTML responses at the edge
				if (fresh.status === 200 && fresh.headers.get("content-type")?.includes("text/html")) {
					const toCache = new Response(fresh.clone().body, fresh);
					toCache.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
					ctx.waitUntil(cache.put(cacheKey, toCache));
				}

				return fresh;
			})();

		return withWorkersDevNoindex(request, response);
	},

	async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
		// Keep worker warm every 5 minutes
		ctx.waitUntil(fetch("https://thechicagomarketingagency.cameron-239.workers.dev/"));
	},
};

export default worker;
