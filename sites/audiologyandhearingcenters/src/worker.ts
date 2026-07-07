import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// 3CX Live Chat widget — injected before the final </body> of every HTML page
// (pages render nested full-page shells, so the layout body-end is unreliable).
const CHAT_WIDGET =
	'<call-us-selector phonesystem-url="https://prohear.3cx.us" party="LiveChat403428"></call-us-selector>' +
	'<script defer src="https://downloads-global.3cx.com/downloads/livechatandtalk/v1/callus.js" id="tcx-callus-js" charset="utf-8"></script>';

// Bump this version string on each deploy to bust the Workers Cache
const CACHE_VERSION = "v138";
const SKIP_CACHE_PATHS = ["/_emdash", "/contact", "/api"];

// Cookies that indicate a CMS editor session — must bypass the edge cache so the
// toolbar / inline-edit overlay gets injected. Without this an anonymous response
// (no toolbar) gets cached and served back to logged-in editors.
// "astro-session" is Astro's default session cookie name (set by the Cloudflare adapter).
const EDIT_MODE_COOKIES = ["emdash-edit-mode=true", "astro-session=", "emdash-session="];

const worker = {
	...handler,

	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
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
