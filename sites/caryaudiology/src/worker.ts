import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

const CACHE_VERSION = "v2";
const SKIP_CACHE_PATHS = ["/_emdash", "/api"];
const EDIT_MODE_COOKIES = ["emdash-edit-mode=true", "astro-session=", "emdash-session="];

// 301 redirects — live WordPress rules verified via curl (see REDIRECTS.md).
// Verify the full set against Rank Math before production cutover.
const REDIRECTS: Record<string, string> = {
	"/lyric-hearing-aids-whisper/": "/types-of-hearing-aids/",
	"/hearing-aid-repair/": "/hearing-aid-repairs/",
	"/hearing-aids/": "/hearing-aids-products/",
	"/a/": "/about-us/",
};

function getRedirectTarget(pathname: string): string | null {
	if (REDIRECTS[pathname]) return REDIRECTS[pathname];
	return null;
}

const worker = {
	...handler,

	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// www → non-www redirect (only on the live production domain)
		if (url.hostname === "www.caryaudiology.com") {
			const canonical = new URL(request.url);
			canonical.hostname = "caryaudiology.com";
			return Response.redirect(canonical.toString(), 301);
		}

		// 301 path redirects (mirror WP Redirection / Rank Math rules)
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
