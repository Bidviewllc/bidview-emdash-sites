import handler from "@astrojs/cloudflare/entrypoints/server";

export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// 3CX Live Chat widget — injected before the final </body> of every HTML page.
// Injected at the worker level (not in Base.astro) because pages render nested
// full-page shells, so the layout's body-end is not the document's real one.
const CHAT_WIDGET =
	'<call-us-selector phonesystem-url="https://prohear.3cx.us" party="LiveChat984696"></call-us-selector>' +
	'<script defer src="https://downloads-global.3cx.com/downloads/livechatandtalk/v1/callus.js" id="tcx-callus-js" charset="utf-8"></script>';

// "Check Insurance Coverage" top-bar item — appended after the "View Smithfield, VA
// Location" link. Reuses the same icon-list classes so it inherits the white styling.
const INSURANCE_TOPBAR_ITEM =
	'<li class="astro-element-icon-list-item astro-element-inline-item"><a href="/insurance/" style="color:#ffffff">' +
	'<span class="astro-element-icon-list-icon"><svg aria-hidden="true" style="fill:#ffffff;width:1em;height:1em;vertical-align:-0.125em" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">' +
	'<path d="M400 480H48c-26.51 0-48-21.49-48-48V80c0-26.51 21.49-48 48-48h352c26.51 0 48 21.49 48 48v352c0 26.51-21.49 48-48 48zm-204.686-98.059l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L184 302.745l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z"></path>' +
	'</svg></span>' +
	'<span class="astro-element-icon-list-text">Check Insurance Coverage</span></a></li>';

export default {
	async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
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
			.replace(/<script\b[^>]*id="tcx-callus-js"[^>]*>[\s\S]*?<\/script>/gi, "");
		// Add the "Check Insurance Coverage" top-bar item after the Smithfield location link.
		if (!html.includes("Check Insurance Coverage")) {
			html = html.replace(
				/(View Smithfield, VA Location<\/span>\s*<\/a>\s*<\/li>)/,
				"$1" + INSURANCE_TOPBAR_ITEM,
			);
		}
		const idx = html.lastIndexOf("</body>");
		if (idx >= 0) {
			html = html.slice(0, idx) + CHAT_WIDGET + html.slice(idx);
		}
		const headers = new Headers(res.headers);
		headers.delete("content-length");
		headers.delete("content-encoding");
		return new Response(html, { status: res.status, statusText: res.statusText, headers });
	},
};
