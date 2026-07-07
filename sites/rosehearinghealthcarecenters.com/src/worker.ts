// Worker entry: wraps EmDash's worker (Astro fetch + scheduled cron handler) to
// inject the 3CX Live Chat widget before the final </body> of every HTML page.
// PluginBridge (sandbox Durable Object) is re-exported so its binding resolves.
import emdashWorker, { PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const CHAT_WIDGET =
	'<call-us-selector phonesystem-url="https://prohear.3cx.us" party="LiveChat439660"></call-us-selector>' +
	'<script defer src="https://downloads-global.3cx.com/downloads/livechatandtalk/v1/callus.js" id="tcx-callus-js" charset="utf-8"></script>';

const wrapped: Record<string, unknown> = {
	async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
		const res = await (emdashWorker as any).fetch(request, env, ctx);
		const ct = res.headers.get("content-type") || "";
		if (!ct.includes("text/html")) return res;
		let html = await res.text();
		html = html
			.replace(/<call-us-selector\b[^>]*>[\s\S]*?<\/call-us-selector>/gi, "")
			.replace(/<script\b[^>]*id="tcx-callus-js"[^>]*>[\s\S]*?<\/script>/gi, "");
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

if (typeof (emdashWorker as any).scheduled === "function") {
	wrapped.scheduled = (...args: unknown[]) => (emdashWorker as any).scheduled(...args);
}

export default wrapped;
