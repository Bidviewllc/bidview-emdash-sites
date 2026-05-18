import handler from "@astrojs/cloudflare/entrypoints/server";

/**
 * Worker entrypoint. Adds an `X-Robots-Tag: noindex` header on any
 * `*.workers.dev` host so the staging Worker is never indexed by search
 * engines. The production custom domain serves normal, indexable responses.
 */
const fetchHandler = handler as typeof handler & { fetch: typeof fetch };

const worker = {
	...handler,
	async fetch(request: Request, env: unknown, ctx: any): Promise<Response> {
		const response = await fetchHandler.fetch(request, env, ctx);
		const host = new URL(request.url).hostname;
		if (host.endsWith(".workers.dev")) {
			const next = new Response(response.body, response);
			next.headers.set("X-Robots-Tag", "noindex, nofollow");
			return next;
		}
		return response;
	},
};

export default worker;
