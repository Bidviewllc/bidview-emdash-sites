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
	 * Cron runs EVERY MINUTE purely to keep a Worker isolate warm (Vince, 2026-09-10).
	 *
	 * Pages are static and bypass this Worker entirely, but `/api/contact` cannot —
	 * it has to run here to write D1 and send the lead email. On a cold isolate that
	 * POST measured ~5s (vs ~250-380ms warm), so a patient submitting the appointment
	 * form could wait five seconds. A scheduled invocation instantiates the Worker,
	 * which pays the module-init cost that IS the cold start.
	 *
	 * IMPORTANT — this only warms the location Cloudflare chooses to run the cron in.
	 * Cold starts are per-location, so this is a partial mitigation, not a fix. The
	 * real fix is shrinking the 11.2MB / 507-module bundle. Do not assume the form is
	 * always fast because this exists; re-measure (scratchpad/formspeed.mjs).
	 *
	 * emdash's own housekeeping is still only run HOURLY (at :00). Running it 1,440x
	 * a day would be real work — D1 writes and revalidation — for no benefit; the
	 * warming comes from the Worker starting up, not from the handler doing anything.
	 */
	async scheduled(event: ScheduledController, env: unknown, ctx: ExecutionContext): Promise<void> {
		const minute = new Date(event.scheduledTime).getUTCMinutes();
		if (minute !== 0) return; // keep-warm tick only — deliberately does no work
		return createScheduledHandler()(event as any, env as any, ctx);
	},
} satisfies ExportedHandler;
