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
//    safe: the only .astro page that reads searchParams is blog search
//    (/posts/?q=), and any request carrying ?q= bypasses the cache; /api/* is
//    excluded.
//  - An existing Cache-Control on the response is respected (the detail route
//    and sitemap set their own); otherwise a 5-minute s-maxage is applied.
// Bump CACHE_VERSION to invalidate everything.
import emdashWorker, { PluginBridge } from "@emdash-cms/cloudflare/worker";
export { PluginBridge };

// v3 (2026-09-10): Liz's design pass changed the markup of every page --
// most sharply the community accordion, which moved from .cg-acc to the
// shared .acc. Cached v2 HTML against the new stylesheet would render that
// section unstyled, so this has to move with the deploy.
// v5 (2026-09-22): /buyers/ layout pass -- Stakes in two rows, Network in two
// columns, tax lead-ins inline. Old cached HTML would miss the new classes.
// v6 (2026-09-22): /sellers/ layout pass -- Pricing in two rows, Timing
// second row, Marketing intro split + package heading, Network in two columns
// (now shared in styles.css), Honesty story. Old cached HTML would miss them.
// v7 (2026-09-22): /sellers/ -- season chart moved to its own row; story
// figures get a bottom rule.
// v9 (2026-09-23): /about/ -- 1/3-2/3 bio, concierge line above the stories,
// no "Let's talk" in The Return. Old cached HTML kept the previous layout.
// v10 (2026-09-23): / -- featured listings carousel, Market Insights READ MORE.
// v11 (2026-09-23): Market Insights blog -- new /posts/, /category/ and post
// templates, plus the Insights link in every page's nav and footer.
// v12 (2026-09-23): /listings/ -- hover photo carousel + mobile swipe on the
// cards. Old cached HTML would lack the carousel code.
// v14 (2026-09-25): new /reviews/ page + home "The Proof" now shows featured
// client reviews. Old cached home HTML would lack them.
// v15 (2026-09-25): home "The Proof" becomes the shared review carousel
// (all reviews, 2 in view) instead of three static cards.
// v16 (2026-09-25): Zillow + Realtor.com reviews added (74 total), source
// filter chips on /reviews/, cards without stars for unrated recommendations.
// v17 (2026-09-29): /reviews/ switches from the carousel to a grid (Liz); the
// home page carousel is unchanged.
// v20 (2026-11-03): listing page -- mosaic gallery in the description column,
// lightbox no longer flashes between photos, Grant's note takes videos, and an
// interactive floor plan section with a jump link under Quick Statistics.
// v21 (2026-11-03): emdash 0.30 -> 1.4. New build, new asset hashes; cached
// 0.30 HTML would point at assets the deploy removed.
// v22 (2026-11-04): listing page -- floor plan and 3D tour bands, the 3D tour
// plays in place, MLS Matterport links fill an empty 3D tour.
// v23 (2026-11-04): status badges on /listings/ cards, sold listing pages, the
// new /sold/ page and its footer link in every chrome copy.
// v24 (2026-11-04, PR #235): listings ticked "Featured" in the admin lead the
// featured rows on /, /community/ and the blog sidebar (and may stay there under
// contract); "Hide from search" drops a listing from every list, search and the
// sitemap.
// v25 (2026-11-04, PR #236): listing page -- floor plan tabs keep one fixed frame
// (no collapse while the next plan loads), plans preload, and the full-screen
// viewer zooms (wheel, pinch, click, +/- buttons) and pans.
// v26 (2026-11-04): #235 merged after #236, so a new number again.
// v27 (2026-11-05): listing page location map is a Google Maps embed (was Leaflet).
// v28 (2026-11-05): home hero and the "Coming to Ski" band play background videos.
const CACHE_VERSION = "v28";

// Only plain file names under site-video/ in R2; no paths, no other keys.
const SITE_VIDEO_NAME = /^[a-z0-9-]+\.(mp4|jpg)$/;

async function serveSiteVideo(request: Request, url: URL, env: { MEDIA?: any }): Promise<Response> {
	if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
	const name = url.pathname.slice("/media/video/".length);
	if (!SITE_VIDEO_NAME.test(name) || !env.MEDIA) return new Response("Not found", { status: 404 });

	const key = `site-video/${name}`;
	const ranged = request.headers.has("Range");
	const obj = await env.MEDIA.get(key, ranged ? { range: request.headers } : undefined);
	if (!obj) return new Response("Not found", { status: 404 });

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	if (!headers.get("Content-Type")) headers.set("Content-Type", name.endsWith(".mp4") ? "video/mp4" : "image/jpeg");
	headers.set("Cache-Control", "public, max-age=604800");
	headers.set("Accept-Ranges", "bytes");
	headers.set("ETag", obj.httpEtag);

	const r = obj.range as { offset?: number; length?: number; suffix?: number } | undefined;
	if (ranged && r) {
		const size = obj.size as number;
		const start = r.suffix != null ? size - r.suffix : (r.offset ?? 0);
		const length = r.suffix != null ? r.suffix : (r.length ?? size - start);
		headers.set("Content-Range", `bytes ${start}-${start + length - 1}/${size}`);
		headers.set("Content-Length", String(length));
		return new Response(request.method === "HEAD" ? null : obj.body, { status: 206, headers });
	}
	headers.set("Content-Length", String(obj.size));
	return new Response(request.method === "HEAD" ? null : obj.body, { status: 200, headers });
}
const CACHEABLE_TYPE = /^(?:text\/html|application\/xml|text\/xml|text\/plain)/i;
const ADMIN_COOKIE = /emdash[-_](session|edit-mode|admin)/i;

export default {
	async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Background videos (home hero + "Coming to Ski" band). The files live in
		// R2 (`gcm-homes-media`, keys under site-video/), not in the repo. emdash's
		// own /_emdash/api/media/file/ route ignores Range requests, and Safari /
		// iOS will not play an MP4 without them, so these get their own route.
		if (url.pathname.startsWith("/media/video/")) {
			return serveSiteVideo(request, url, env as any);
		}

		const isAdmin = ADMIN_COOKIE.test(request.headers.get("Cookie") || "");
		const bypass =
			request.method !== "GET" ||
			isAdmin ||
			url.pathname.startsWith("/_emdash") ||
			url.pathname.startsWith("/api/") ||
			// Blog search (/posts/?q=...) is the one page that reads the query
			// string, and the cache key drops it -- so it must never be cached.
			url.searchParams.has("q");

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
