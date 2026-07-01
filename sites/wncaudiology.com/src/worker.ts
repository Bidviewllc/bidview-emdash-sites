import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

const CACHE_VERSION = "v1";
const SKIP_CACHE_PATHS = ["/_emdash", "/contact", "/api"];
const EDIT_MODE_COOKIES = ["emdash-edit-mode=true", "astro-session=", "emdash-session="];

// 301 redirect map — mirrors WP Redirection plugin rules (normalised to non-www paths)
const REDIRECTS: Record<string, string> = {
	"/reviews/": "/",
	"/location-contact/": "/contact/",
	"/hearing-testing/": "/hearing-tests/",
	"/balance-testing/": "/hearing-tests/",
	"/hearing-protection/": "/custom-hearing-protection/",
	"/hearing-loss-causes-symptoms/": "/sensorineural-hearing-loss/",
	"/hearing-aid-repair/": "/hearing-aid-services/",
	"/hearing-aid-tips-faq/": "/hearing-aids-products/",
	"/best-hearing-aids/": "/hearing-aids-products/",
	"/best-hearing-aid-brands/": "/hearing-aids-products/",
	"/hearing-aids-plans-and-pricing/": "/hearing-aids-products/",
	"/hearing-aids-online/": "/hearing-aids-products/",
	"/over-the-counter-hearing-aids/": "/hearing-aids-products/",
	"/tinnitus-treatment/": "/tinnitus-support/",
	"/about-us/": "/about/",
	"/hearing-tips/": "/news/",
	"/hearing-tips/page/3/": "/news/",
	"/hearing-tips/page/4/": "/news/",
	"/hearing-tips/page/5/": "/news/",
};

// Old blog category slugs — all redirect to /news/
const NEWS_PREFIXES = [
	"/hearing-loss-articles/",
	"/hearing-aids-news/",
	"/tinnitus-articles/",
	"/hearing-test-info/",
];

function getRedirectTarget(pathname: string): string | null {
	if (REDIRECTS[pathname]) return REDIRECTS[pathname];
	if (NEWS_PREFIXES.some((p) => pathname.startsWith(p))) return "/news/";
	return null;
}

const worker = {
	...handler,

	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// www → non-www redirect (only on the live production domain)
		if (url.hostname === "www.wncaudiology.com") {
			const canonical = new URL(request.url);
			canonical.hostname = "wncaudiology.com";
			return Response.redirect(canonical.toString(), 301);
		}

		// 301 path redirects (mirrors WP Redirection plugin rules)
		const redirectTarget = getRedirectTarget(url.pathname);
		if (redirectTarget) {
			const dest = new URL(redirectTarget, request.url);
			return Response.redirect(dest.toString(), 301);
		}

		const cookieHeader = request.headers.get("cookie") || "";
		const hasEditorCookie = EDIT_MODE_COOKIES.some((c) => cookieHeader.includes(c));

		const skipCache =
			request.method !== "GET" ||
			hasEditorCookie ||
			SKIP_CACHE_PATHS.some((p) => url.pathname.startsWith(p));

		if (!skipCache) {
			const cache = caches.default;
			const cacheKey = new Request(
				request.url + (request.url.includes("?") ? "&" : "?") + "__cv=" + CACHE_VERSION,
				request,
			);
			const cached = await cache.match(cacheKey);
			if (cached) return cached;

			const response = await (handler as any).fetch(request, env, ctx);

			if (response.status === 200 && response.headers.get("content-type")?.includes("text/html")) {
				const toCache = new Response(response.clone().body, response);
				toCache.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
				ctx.waitUntil(cache.put(cacheKey, toCache));
			}

			return response;
		}

		return (handler as any).fetch(request, env, ctx);
	},
};

export default worker;
