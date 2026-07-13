import handler from "@astrojs/cloudflare/entrypoints/server";

export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// 3CX Live Chat widget — injected before the final </body> of every HTML page
// (pages render nested full-page shells, so the layout body-end is unreliable).
const CHAT_WIDGET =
	'<call-us-selector phonesystem-url="https://prohear.3cx.us" party="LiveChat191212"></call-us-selector>' +
	'<script defer src="https://downloads-global.3cx.com/downloads/livechatandtalk/v1/callus.js" id="tcx-callus-js" charset="utf-8"></script>';

// Cloudflare Turnstile — injected client-side into any /api/contact form so real
// browsers get a token and bots are challenged. Server verifies in api/contact.ts
// (fail-open on missing token → the spam filter still gates).
const TURNSTILE_INJECT =
	'<script id="cf-ts-inject">(function(){var SK="0x4AAAAAADyoDeiRVAnzwr_E";function add(){var any=false;document.querySelectorAll("form").forEach(function(f){if((f.getAttribute("action")||"").indexOf("/api/contact")<0)return;if(f.querySelector(".cf-turnstile"))return;any=true;var d=document.createElement("div");d.className="cf-turnstile";d.style.margin="12px 0";var t=f.querySelector(".gform_footer,[type=submit],button[type=submit],button");if(t&&t.parentNode)t.parentNode.insertBefore(d,t);else f.appendChild(d);});return any;}window.__cfTsRender=function(){if(!window.turnstile)return;document.querySelectorAll(".cf-turnstile").forEach(function(d){if(d.dataset.r)return;d.dataset.r="1";try{window.turnstile.render(d,{sitekey:SK});}catch(e){}});};function api(){if(document.getElementById("cf-ts-api"))return;var s=document.createElement("script");s.id="cf-ts-api";s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__cfTsRender&render=explicit";s.async=true;s.defer=true;document.head.appendChild(s);}function init(){if(add())api();}if(document.readyState!=="loading")init();else document.addEventListener("DOMContentLoaded",init);})();</script>';

export default {
	async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
		const res = await (handler as any).fetch(request, env, ctx);
		const ct = res.headers.get("content-type") || "";
		if (!ct.includes("text/html")) return res;
		let html = await res.text();
		html = html
			.replace(/<call-us-selector\b[^>]*>[\s\S]*?<\/call-us-selector>/gi, "")
			.replace(/<script\b[^>]*id="tcx-callus-js"[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(/<script\b[^>]*id="cf-ts-inject"[^>]*>[\s\S]*?<\/script>/gi, "");
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
