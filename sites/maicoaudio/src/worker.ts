import handler from "@astrojs/cloudflare/entrypoints/server";

export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// 3CX Live Chat widget — injected before the final </body> of every HTML page.
// Injected at the worker level (not in Base.astro) because pages render nested
// full-page shells, so the layout's body-end is not the document's real one.
const CHAT_WIDGET =
	'<call-us-selector phonesystem-url="https://prohear.3cx.us" party="LiveChat984696"></call-us-selector>' +
	'<script defer src="https://downloads-global.3cx.com/downloads/livechatandtalk/v1/callus.js" id="tcx-callus-js" charset="utf-8"></script>';

// Cloudflare Turnstile — injected client-side into any /api/contact form so real
// browsers get a token and bots are challenged. Server verifies in api/contact.ts
// (fail-open on missing token → the spam filter still gates).
const TURNSTILE_INJECT =
	'<script id="cf-ts-inject">(function(){var SK="0x4AAAAAADyoDeiRVAnzwr_E";function add(){var any=false;document.querySelectorAll("form").forEach(function(f){if((f.getAttribute("action")||"").indexOf("/api/contact")<0)return;if(f.querySelector(".cf-turnstile"))return;any=true;var d=document.createElement("div");d.className="cf-turnstile";d.style.margin="12px 0";var t=f.querySelector(".gform_footer,[type=submit],button[type=submit],button");if(t&&t.parentNode)t.parentNode.insertBefore(d,t);else f.appendChild(d);});return any;}window.__cfTsRender=function(){if(!window.turnstile)return;document.querySelectorAll(".cf-turnstile").forEach(function(d){if(d.dataset.r)return;d.dataset.r="1";try{window.turnstile.render(d,{sitekey:SK});}catch(e){}});};function api(){if(document.getElementById("cf-ts-api"))return;var s=document.createElement("script");s.id="cf-ts-api";s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__cfTsRender&render=explicit";s.async=true;s.defer=true;document.head.appendChild(s);}function init(){if(add())api();}if(document.readyState!=="loading")init();else document.addEventListener("DOMContentLoaded",init);})();</script>';

// "Check Insurance Coverage" top-bar item — appended after the "View Smithfield, VA
// Location" link. Reuses the same icon-list classes so it inherits the white styling.
const INSURANCE_TOPBAR_ITEM =
	'<li class="astro-element-icon-list-item astro-element-inline-item"><a href="/insurance/" style="color:#ffffff">' +
	'<span class="astro-element-icon-list-icon"><svg aria-hidden="true" style="fill:#ffffff;width:1em;height:1em;vertical-align:-0.125em" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">' +
	'<path d="M400 480H48c-26.51 0-48-21.49-48-48V80c0-26.51 21.49-48 48-48h352c26.51 0 48 21.49 48 48v352c0 26.51-21.49 48-48 48zm-204.686-98.059l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L184 302.745l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z"></path>' +
	'</svg></span>' +
	'<span class="astro-element-icon-list-text">Check Insurance Coverage</span></a></li>';


// ---------------------------------------------------------------------------
// Media edge cache
//
// Uploaded media is served by the CMS at /_emdash/api/media/file/<key>. Without
// this, EVERY image request booted the whole CMS runtime (runtime init, D1 init +
// migrations, plugin states, hook resolution) — Server-Timing showed ~0.5–2.4s per
// image, and any hiccup in that chain produced one broken image for one visitor
// that then "healed" on reload. That was the unreproducible broken-image report.
//
// Media blobs are immutable content addressed by storage key, so they are safe to
// serve from the edge cache without touching the runtime at all.
const MEDIA_PREFIX = "/_emdash/api/media/file/";

// The upstream route sends `max-age=31536000, immutable`, so a replaced image can
// never propagate — a year of stale content with no way to revalidate (this bit us
// when a client-requested photo swap didn't show up). A week of freshness plus
// stale-while-revalidate stays fast but remains correctable; repeat fetches hit the
// edge cache, not the runtime.
const MEDIA_BROWSER_CACHE = "public, max-age=604800, stale-while-revalidate=2592000";

async function serveMedia(request: Request, env: unknown, ctx: any): Promise<Response> {
	const url = new URL(request.url);
	const cache = (caches as any).default;
	// Key on path only so ?v=/?cb= variants don't fragment the cache.
	const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });

	const hit = await cache.match(cacheKey);
	if (hit) return hit;

	const response = await (handler as any).fetch(request, env, ctx);
	if (response.status !== 200) return response;

	const headers = new Headers(response.headers);
	headers.set("Cache-Control", MEDIA_BROWSER_CACHE);
	const cached = new Response(response.body, {
		status: 200,
		statusText: response.statusText,
		headers,
	});

	if (ctx && typeof ctx.waitUntil === "function") {
		ctx.waitUntil(cache.put(cacheKey, cached.clone()));
	}
	return cached;
}

export default {
	async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
		// Media first — edge-cached, never touches the CMS runtime on a hit.
		if (request.method === "GET" && new URL(request.url).pathname.startsWith(MEDIA_PREFIX)) {
			return serveMedia(request, env, ctx);
		}

		// 301: old /hearing-tests/ URL -> the real page under /audiology-services/.
		const url = new URL(request.url);
		if (url.pathname === "/hearing-tests" || url.pathname === "/hearing-tests/") {
			return Response.redirect(new URL("/audiology-services/hearing-tests/", url.origin).toString(), 301);
		}
		const res = await (handler as any).fetch(request, env, ctx);
		const ct = res.headers.get("content-type") || "";
		if (!ct.includes("text/html")) return res;
		let html = await res.text();
		// Remove any pre-existing 3CX widget (avoids duplicates / stale party), then inject one.
		html = html
			.replace(/<call-us-selector\b[^>]*>[\s\S]*?<\/call-us-selector>/gi, "")
			.replace(/<script\b[^>]*id="tcx-callus-js"[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(/<script\b[^>]*id="cf-ts-inject"[^>]*>[\s\S]*?<\/script>/gi, "");
		// Add the "Check Insurance Coverage" top-bar item after the Smithfield location link.
		if (!html.includes("Check Insurance Coverage")) {
			html = html.replace(
				/(View Smithfield, VA Location<\/span>\s*<\/a>\s*<\/li>)/,
				"$1" + INSURANCE_TOPBAR_ITEM,
			);
		}
		const idx = html.lastIndexOf("</body>");
		if (idx >= 0) {
			html = html.slice(0, idx) + CHAT_WIDGET + TURNSTILE_INJECT + html.slice(idx);
		}
		const headers = new Headers(res.headers);
		headers.delete("content-length");
		headers.delete("content-encoding");
		return new Response(html, { status: res.status, statusText: res.statusText, headers });
	},
};
