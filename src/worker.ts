import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

const SKIP_CACHE_PATHS = ["/_emdash", "/contact", "/free-seo-audit", "/api"];

const worker = {
	...handler,

	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Only cache GET requests for public pages
		const skipCache =
			request.method !== "GET" ||
			SKIP_CACHE_PATHS.some((p) => url.pathname.startsWith(p));

		if (!skipCache) {
			const cache = caches.default;
			const cached = await cache.match(request);
			if (cached) return cached;

			const response = await (handler as any).fetch(request, env, ctx);

			// Cache successful HTML responses at the edge
			if (response.status === 200 && response.headers.get("content-type")?.includes("text/html")) {
				const toCache = new Response(response.clone().body, response);
				toCache.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
				ctx.waitUntil(cache.put(request, toCache));
			}

			return response;
		}

		return (handler as any).fetch(request, env, ctx);
	},

	async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
		// Keep worker warm every 5 minutes
		ctx.waitUntil(fetch("https://thechicagomarketingagency.vince-75c.workers.dev/"));
	},
};

export default worker;
