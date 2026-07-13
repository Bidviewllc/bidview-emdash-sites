// Worker entry: wraps EmDash's worker (Astro fetch + scheduled cron handler) to
// inject the 3CX Live Chat widget before the final </body> of every HTML page.
// PluginBridge (sandbox Durable Object) is re-exported so its binding resolves.
import emdashWorker, { PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

// Permanent redirects for duplicate URLs. /tinnitus-management/ and
// /audiology-services/tinnitus-support/ served byte-identical bodies; the
// /audiology-services/ URL is the one we keep.
const REDIRECTS: Record<string, string> = {
	"/tinnitus-management/": "/audiology-services/tinnitus-support/",
};

function redirectTarget(url: URL): string | null {
	const path = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
	return REDIRECTS[path] ?? null;
}

const CHAT_WIDGET =
	'<call-us-selector phonesystem-url="https://prohear.3cx.us" party="LiveChat776977"></call-us-selector>' +
	'<script defer src="https://downloads-global.3cx.com/downloads/livechatandtalk/v1/callus.js" id="tcx-callus-js" charset="utf-8"></script>';

// Cloudflare Turnstile — injected client-side into any /api/contact form so real
// browsers get a token and bots are challenged. Server verifies in api/contact.ts
// (fail-open on missing token → the spam filter still gates).
const TURNSTILE_INJECT =
	'<script id="cf-ts-inject">(function(){var SK="0x4AAAAAADyoDeiRVAnzwr_E";function add(){var any=false;document.querySelectorAll("form").forEach(function(f){if((f.getAttribute("action")||"").indexOf("/api/contact")<0)return;if(f.querySelector(".cf-turnstile"))return;any=true;var d=document.createElement("div");d.className="cf-turnstile";d.style.margin="12px 0";var t=f.querySelector(".gform_footer,[type=submit],button[type=submit],button");if(t&&t.parentNode)t.parentNode.insertBefore(d,t);else f.appendChild(d);});return any;}window.__cfTsRender=function(){if(!window.turnstile)return;document.querySelectorAll(".cf-turnstile").forEach(function(d){if(d.dataset.r)return;d.dataset.r="1";try{window.turnstile.render(d,{sitekey:SK});}catch(e){}});};function api(){if(document.getElementById("cf-ts-api"))return;var s=document.createElement("script");s.id="cf-ts-api";s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__cfTsRender&render=explicit";s.async=true;s.defer=true;document.head.appendChild(s);}function init(){if(add())api();}if(document.readyState!=="loading")init();else document.addEventListener("DOMContentLoaded",init);})();</script>';

// Required-field validation for the contact/insurance forms. Gravity Forms marks
// required fields with aria-required (accessibility) but NOT the real `required`
// attribute, so nothing was enforced. This promotes aria-required → required and
// blocks invalid submits in the CAPTURE phase (runs before the AJAX submit handler),
// showing the native "Please fill out this field" prompt.
const FORM_VALIDATE_INJECT =
	'<script id="form-validate-inject">(function(){function promote(){document.querySelectorAll(\'form[action*="/api/contact"] [aria-required="true"]\').forEach(function(el){if(el.name&&!el.disabled)el.required=true;});}function guard(e){var f=e.target;if(f&&f.matches&&f.matches(\'form[action*="/api/contact"]\')){promote();if(typeof f.checkValidity==="function"&&!f.checkValidity()){e.preventDefault();e.stopPropagation();if(typeof f.reportValidity==="function")f.reportValidity();}}}document.addEventListener("submit",guard,true);if(document.readyState!=="loading")promote();else document.addEventListener("DOMContentLoaded",promote);setTimeout(promote,1500);})();</script>';

const wrapped: Record<string, unknown> = {
	async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
		const url = new URL(request.url);
		const target = redirectTarget(url);
		if (target) return Response.redirect(`${url.origin}${target}${url.search}`, 301);

		const res = await (emdashWorker as any).fetch(request, env, ctx);
		const ct = res.headers.get("content-type") || "";
		if (!ct.includes("text/html")) return res;
		let html = await res.text();
		html = html
			.replace(/<call-us-selector\b[^>]*>[\s\S]*?<\/call-us-selector>/gi, "")
			.replace(/<script\b[^>]*id="tcx-callus-js"[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(/<script\b[^>]*id="cf-ts-inject"[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(/<script\b[^>]*id="form-validate-inject"[^>]*>[\s\S]*?<\/script>/gi, "");
		const idx = html.lastIndexOf("</body>");
		if (idx >= 0) {
			html = html.slice(0, idx) + CHAT_WIDGET + TURNSTILE_INJECT + FORM_VALIDATE_INJECT + html.slice(idx);
		}
		const headers = new Headers(res.headers);
		headers.delete("content-length");
		headers.delete("content-encoding");
		return new Response(html, { status: res.status, statusText: res.statusText, headers });
	},
};

if (typeof (emdashWorker as any).scheduled === "function") {
	wrapped.scheduled = (...args: unknown[]) => (emdashWorker as any).scheduled(...args);
}

export default wrapped;
