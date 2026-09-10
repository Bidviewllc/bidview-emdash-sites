// Worker entry: Astro's fetch handler plus EmDash's scheduled() handler, which
// the Cron Trigger in wrangler.jsonc drives. PluginBridge is the sandbox
// Durable Object, re-exported here so its binding resolves.
//
// 2026-09-10 — added an EDGE CACHE in front of emdash's handler. Before this,
// nothing was cached: every visitor paid a full SSR render + D1 round-trip
// (measured ~386ms warm, ~2.3s on a cold isolate, 201ms of it in DB queries),
// which is what made the home page feel slow. Cached responses now serve in
// tens of ms and never touch D1.
//
// Safety rules (important):
//  - Only GET, only 200, only html/xml/plain. Never /api/* or /_emdash/*.
//  - A logged-in admin (emdash session/edit cookie) ALWAYS bypasses the cache,
//    so inline editing and the admin-only listing UI are never served stale or
//    leaked to anonymous visitors.
//  - Cache key drops the query string (so ?cb=/?utm= share one entry). Verified
//    safe: no .astro page reads searchParams server-side; /api/* is excluded.
//  - An existing Cache-Control on the response is respected (the detail route
//    and sitemap set their own); otherwise a 5-minute s-maxage is applied.
// Bump CACHE_VERSION to invalidate everything.
import emdashWorker, { PluginBridge } from "@emdash-cms/cloudflare/worker";
export { PluginBridge };

// v3 (2026-09-10): Liz's design pass changed the markup of every page --
// most sharply the community accordion, which moved from .cg-acc to the
// shared .acc. Cached v2 HTML against the new stylesheet would render that
// section unstyled, so this has to move with the deploy.
const CACHE_VERSION = "v3";
const CACHEABLE_TYPE = /^(?:text\/html|application\/xml|text\/xml|text\/plain)/i;
const ADMIN_COOKIE = /emdash[-_](session|edit-mode|admin)/i;

export default {
	async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const isAdmin = ADMIN_COOKIE.test(request.headers.get("Cookie") || "");
		const bypass =
			request.method !== "GET" ||
			isAdmin ||
			url.pathname.startsWith("/_emdash") ||
			url.pathname.startsWith("/api/");

		if (bypass) {
			const res = await emdashWorker.fetch(request, env as any, ctx);
			// Never let an admin's editable view be cached by a shared cache.
			if (isAdmin) {
				const out = new Response(res.body, res);
				out.headers.set("Cache-Control", "private, no-store");
				return out;
			}
			return res;
		}

		const cache = (caches as any).default as Cache;
		const cacheKey = new Request(`${url.origin}${url.pathname}?__cv=${CACHE_VERSION}`, { method: "GET" });

		const hit = await cache.match(cacheKey);
		if (hit) {
			const out = new Response(hit.body, hit);
			out.headers.set("X-Cache", "HIT");
			return out;
		}

		const res = await emdashWorker.fetch(request, env as any, ctx);
		const type = res.headers.get("content-type") || "";
		if (res.status === 200 && CACHEABLE_TYPE.test(type)) {
			const out = new Response(res.body, res);
			if (!out.headers.get("Cache-Control")) {
				out.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
			}
			out.headers.set("X-Cache", "MISS");
			ctx.waitUntil(cache.put(cacheKey, out.clone()));
			return out;
		}
		return res;
	},
	scheduled: (event: unknown, env: unknown, ctx: unknown) =>
		(emdashWorker as any).scheduled?.(event, env, ctx),
};
