import * as ajvEqual from "ajv/dist/runtime/equal.js";
import * as ajvUcs2Length from "ajv/dist/runtime/ucs2length.js";
import * as ajvUri from "ajv/dist/runtime/uri.js";
import * as ajvValidationError from "ajv/dist/runtime/validation_error.js";
import * as ajvFormats from "ajv-formats/dist/formats.js";
import handler from "@astrojs/cloudflare/entrypoints/server";
import * as semver from "semver";
import * as semverInternalConstants from "semver/internal/constants.js";
import * as semverInternalDebug from "semver/internal/debug.js";
import * as semverInternalRe from "semver/internal/re.js";

export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

if (typeof (globalThis as any).require === "undefined") {
	const requireMap: Record<string, unknown> = {
		"ajv/dist/runtime/equal": ajvEqual,
		"ajv/dist/runtime/equal.js": ajvEqual,
		"ajv/dist/runtime/ucs2length": ajvUcs2Length,
		"ajv/dist/runtime/ucs2length.js": ajvUcs2Length,
		"ajv/dist/runtime/uri": ajvUri,
		"ajv/dist/runtime/uri.js": ajvUri,
		"ajv/dist/runtime/validation_error": ajvValidationError,
		"ajv/dist/runtime/validation_error.js": ajvValidationError,
		"ajv-formats/dist/formats": ajvFormats,
		"ajv-formats/dist/formats.js": ajvFormats,
		"semver": semver,
		"./constants": semverInternalConstants,
		"./debug": semverInternalDebug,
		"./internal/constants": semverInternalConstants,
		"./internal/debug": semverInternalDebug,
		"./internal/re": semverInternalRe,
		"semver/internal/constants": semverInternalConstants,
		"semver/internal/constants.js": semverInternalConstants,
		"semver/internal/debug": semverInternalDebug,
		"semver/internal/debug.js": semverInternalDebug,
		"semver/internal/re": semverInternalRe,
		"semver/internal/re.js": semverInternalRe,
	};

	(globalThis as any).require = (specifier: string) => {
		const module = requireMap[specifier];
		if (module) return module;
		throw new Error(`Unsupported runtime require: ${specifier}`);
	};
}

// Cloudflare Turnstile — injected client-side into any /api/contact form so real
// browsers get a token and bots are challenged. Server verifies in api/contact.ts
// (fail-open on missing token → the spam filter still gates).
const TURNSTILE_INJECT =
	'<script id="cf-ts-inject">(function(){var SK="0x4AAAAAADyoDeiRVAnzwr_E";function add(){var any=false;document.querySelectorAll("form").forEach(function(f){if((f.getAttribute("action")||"").indexOf("/api/contact")<0)return;if(f.querySelector(".cf-turnstile"))return;any=true;var d=document.createElement("div");d.className="cf-turnstile";d.style.margin="12px 0";var t=f.querySelector(".gform_footer,[type=submit],button[type=submit],button");if(t&&t.parentNode)t.parentNode.insertBefore(d,t);else f.appendChild(d);});return any;}window.__cfTsRender=function(){if(!window.turnstile)return;document.querySelectorAll(".cf-turnstile").forEach(function(d){if(d.dataset.r)return;d.dataset.r="1";try{window.turnstile.render(d,{sitekey:SK});}catch(e){}});};function api(){if(document.getElementById("cf-ts-api"))return;var s=document.createElement("script");s.id="cf-ts-api";s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__cfTsRender&render=explicit";s.async=true;s.defer=true;document.head.appendChild(s);}function init(){if(add())api();}if(document.readyState!=="loading")init();else document.addEventListener("DOMContentLoaded",init);})();</script>';

const worker = {
	...(handler as any),
	async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
		const res = await (handler as any).fetch(request, env, ctx);
		const ct = res.headers.get("content-type") || "";
		if (!ct.includes("text/html")) return res;
		let html = await res.text();
		html = html.replace(/<script\b[^>]*id="cf-ts-inject"[^>]*>[\s\S]*?<\/script>/gi, "");
		const idx = html.lastIndexOf("</body>");
		if (idx >= 0) html = html.slice(0, idx) + TURNSTILE_INJECT + html.slice(idx);
		const headers = new Headers(res.headers);
		headers.delete("content-length");
		headers.delete("content-encoding");
		return new Response(html, { status: res.status, statusText: res.statusText, headers });
	},
};

export default worker;
