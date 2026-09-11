import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

/**
 * Edge cache in front of the emdash SSR handler.
 *
 * Every page is server-rendered, so without this each visit pays the full
 * render (plus a Worker cold start on a cold PoP). Measured before adding it:
 * usually ~450ms first paint, but multi-second spikes on a cold PoP.
 * Same pattern as Ontario, where it was worth roughly 5-10x on a HIT.
 *
 * Bump CACHE_VERSION on any deploy that changes HTML, or the edge will keep
 * serving the previous build until the TTL expires.
 */
const CACHE_VERSION = "v3";

/** Never cache: the CMS admin, the API, and anything non-GET. */
function isCacheable(url: URL, req: Request): boolean {
	if (req.method !== "GET") return false;
	if (url.pathname.startsWith("/_emdash")) return false;
	if (url.pathname.startsWith("/api/")) return false;
	return true;
}

/** Logged-in admins must always see fresh HTML with their edit bindings. */
function isEditor(req: Request): boolean {
	const c = req.headers.get("Cookie") || "";
	return c.includes("emdash-edit-mode=true") || c.includes("emdash-admin") || c.includes("emdash-session");
}

const CACHEABLE_TYPES = ["text/html", "application/xml", "text/xml", "text/plain", "application/json"];

export default {
	...handler,

	async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (!isCacheable(url, request) || isEditor(request)) {
			return (handler as any).fetch(request, env, ctx);
		}

		// Normalise the key: drop the query string entirely so `?utm_source=...`,
		// `?fbclid=...` and cache-busters all share one entry. Without this every
		// ad click and QA request is a guaranteed MISS.
		const keyUrl = new URL(url.origin + url.pathname);
		keyUrl.searchParams.set("__cv", CACHE_VERSION);
		const cacheKey = new Request(keyUrl.toString(), { method: "GET" });

		const cache = (caches as any).default;
		const hit = await cache.match(cacheKey);
		if (hit) {
			const r = new Response(hit.body, hit);
			r.headers.set("X-Cache-Status", "HIT");
			return r;
		}

		const res = await (handler as any).fetch(request, env, ctx);
		const type = res.headers.get("content-type") || "";

		if (res.status === 200 && CACHEABLE_TYPES.some((t) => type.includes(t))) {
			const toCache = new Response(res.clone().body, res);
			toCache.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
			toCache.headers.delete("Set-Cookie");
			ctx.waitUntil(cache.put(cacheKey, toCache));
		}

		const out = new Response(res.body, res);
		out.headers.set("X-Cache-Status", "MISS");
		return out;
	},

	/**
	 * Hourly emdash housekeeping (the scaffold shipped every-minute; that is waste).
	 *
	 * A per-minute "keep-warm" cron was tried here on 2026-09-10 and REMOVED. It
	 * fired correctly but changed nothing: cron warms only one Cloudflare location,
	 * and the isolate went cold after as little as a 5s gap (measured). The thing it
	 * was meant to protect — /api/contact — now runs on the separate
	 * `liberty-hearing-forms` Worker, so this Worker is no longer in any
	 * user-facing path at all. Do not re-add a keep-warm cron here.
	 */
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
