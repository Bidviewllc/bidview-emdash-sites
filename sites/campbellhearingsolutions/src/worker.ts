import handler from "@astrojs/cloudflare/entrypoints/server";
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

// Bump this version string on each Cloudflare deploy to bust Workers Cache.
const CACHE_VERSION = "v28";
const SKIP_CACHE_PATHS = ["/_emdash", "/api"];

// 3CX Live Chat widget. The WP->static conversion carried over the
// <call-us-selector> element but dropped the callus.js loader <script>, so the
// widget never initialized. The loader is self-hosted at /callus.js (a copy of
// the exact script the working WordPress site serves) instead of the external
// 3CX CDN, which loads unreliably (and a deferred script that fails to load
// leaves the icon inert/disabled). Re-inject a clean selector + loader before
// the final </body> of every HTML page (stripping any stale/leftover copy first).
const CHAT_WIDGET =
  '<call-us-selector phonesystem-url="https://prohear.3cx.us" party="LiveChat451006" enable-poweredby="false"></call-us-selector>' +
  '<script defer src="/callus.js" id="tcx-callus-js" charset="utf-8"></script>';

// Cloudflare Turnstile: injected client-side into any /api/contact form (before its
// submit) so real browsers get a token and bots are challenged. Server verifies the
// token in api/contact.ts (fail-open on missing token → the spam filter still gates).
const TURNSTILE_INJECT =
  '<script id="cf-ts-inject">(function(){var SK="0x4AAAAAADyoDeiRVAnzwr_E";function add(){var any=false;document.querySelectorAll("form").forEach(function(f){if((f.getAttribute("action")||"").indexOf("/api/contact")<0)return;if(f.querySelector(".cf-turnstile"))return;any=true;var d=document.createElement("div");d.className="cf-turnstile";d.style.margin="12px 0";var t=f.querySelector(".gform_footer,[type=submit],button[type=submit],button");if(t&&t.parentNode)t.parentNode.insertBefore(d,t);else f.appendChild(d);});return any;}window.__cfTsRender=function(){if(!window.turnstile)return;document.querySelectorAll(".cf-turnstile").forEach(function(d){if(d.dataset.r)return;d.dataset.r="1";try{window.turnstile.render(d,{sitekey:SK});}catch(e){}});};function api(){if(document.getElementById("cf-ts-api"))return;var s=document.createElement("script");s.id="cf-ts-api";s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__cfTsRender&render=explicit";s.async=true;s.defer=true;document.head.appendChild(s);}function init(){if(add())api();}if(document.readyState!=="loading")init();else document.addEventListener("DOMContentLoaded",init);})();</script>';

// Required-field validation for the contact/insurance forms. Gravity Forms marks
// required fields with aria-required (accessibility) but NOT the real `required`
// attribute, so nothing was enforced. This promotes aria-required → required and
// blocks invalid submits in the CAPTURE phase (runs before any other submit handler,
// works with native submit, novalidate, and the GF onclick), showing the native prompt.
const FORM_VALIDATE_INJECT =
  '<script id="form-validate-inject">(function(){function promote(){document.querySelectorAll(\'form[action*="/api/contact"] [aria-required="true"]\').forEach(function(el){if(el.name&&!el.disabled)el.required=true;});}function guard(e){var f=e.target;if(f&&f.matches&&f.matches(\'form[action*="/api/contact"]\')){promote();if(typeof f.checkValidity==="function"&&!f.checkValidity()){e.preventDefault();e.stopPropagation();if(typeof f.reportValidity==="function")f.reportValidity();}}}document.addEventListener("submit",guard,true);if(document.readyState!=="loading")promote();else document.addEventListener("DOMContentLoaded",promote);setTimeout(promote,1500);})();</script>';

async function withChatWidget(response: Response): Promise<Response> {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;
  let html = await response.text();
  html = html
    .replace(/<call-us-selector\b[^>]*>[\s\S]*?<\/call-us-selector>/gi, "")
    .replace(/<script\b[^>]*id="tcx-callus-js"[^>]*>[\s\S]*?<\/script>/gi, "")
    // also strip any leftover WP-plugin loader (id or callus.js src) to avoid doubles
    .replace(/<script\b[^>]*(?:id="[^"]*callus[^"]*"|src="[^"]*callus\.js[^"]*")[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*id="cf-ts-inject"[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*id="form-validate-inject"[^>]*>[\s\S]*?<\/script>/gi, "");
  const idx = html.lastIndexOf("</body>");
  if (idx >= 0) html = html.slice(0, idx) + CHAT_WIDGET + TURNSTILE_INJECT + FORM_VALIDATE_INJECT + html.slice(idx);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

const withStagingRobotsHeader = (requestUrl: URL, response: Response) => {
  if (!requestUrl.hostname.endsWith(".workers.dev")) {
    return response;
  }
  const next = new Response(response.body, response);
  next.headers.set("X-Robots-Tag", "noindex, nofollow");
  return next;
};

const worker = {
  ...handler,

  async fetch(request: Request, env: unknown, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    if (
      url.pathname.startsWith("/category/") ||
      /^\/202[4-6]\//.test(url.pathname)
    ) {
      return withStagingRobotsHeader(url, Response.redirect(new URL("/", url.origin), 301));
    }

    const skipCache =
      request.method !== "GET" || SKIP_CACHE_PATHS.some((path) => url.pathname.startsWith(path));

    if (skipCache) {
      const response = await (handler as typeof handler & { fetch: typeof fetch }).fetch(request, env, ctx);
      return withStagingRobotsHeader(url, await withChatWidget(response));
    }

    const cache = (caches as any).default;
    const cacheKey = new Request(
      request.url + (request.url.includes("?") ? "&" : "?") + "__cv=" + CACHE_VERSION,
      request,
    );
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const response = await (handler as typeof handler & { fetch: typeof fetch }).fetch(
      request,
      env,
      ctx,
    );

    const finalResponse = withStagingRobotsHeader(url, await withChatWidget(response));

    if (finalResponse.status === 200 && finalResponse.headers.get("content-type")?.includes("text/html")) {
      const toCache = new Response(finalResponse.clone().body, finalResponse);
      toCache.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      ctx.waitUntil(cache.put(cacheKey, toCache));
    }

    return finalResponse;
  },
};

export default worker;
