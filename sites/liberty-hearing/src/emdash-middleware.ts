import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
	const setupApi = "/_emdash/api/setup";
	const setupPage = "/_emdash/admin/setup";
	const isSetupRoute =
		context.routePattern === setupApi ||
		context.routePattern.startsWith(`${setupApi}/`) ||
		context.url.pathname === setupPage ||
		context.url.pathname.startsWith(`${setupPage}/`);

	// Liberty's first CMS administrator must be provisioned in a controlled environment.
	if (import.meta.env.PROD && isSetupRoute) {
		return new Response(null, { status: 404 });
	}

	return next();
});
