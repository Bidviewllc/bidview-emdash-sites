import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
	const { request, url } = context;
	const isContentWrite =
		import.meta.env.DEV &&
		request.method !== "GET" &&
		url.pathname.startsWith("/_emdash/api/content/");

	if (!isContentWrite) return next();

	const startedAt = Date.now();
	console.log(`[emdash-write] ${request.method} ${url.pathname}`);

	try {
		const response = await next();
		console.log(
			`[emdash-write] ${response.status} ${request.method} ${url.pathname} (${Date.now() - startedAt}ms)`,
		);
		if (response.status >= 400) {
			try {
				const body = await response.clone().text();
				console.warn(`[emdash-write] response body: ${body.slice(0, 1000)}`);
			} catch (bodyError) {
				console.warn("[emdash-write] could not read error response body", bodyError);
			}
		}
		return response;
	} catch (error) {
		console.error(`[emdash-write] failed ${request.method} ${url.pathname}`, error);
		throw error;
	}
});
