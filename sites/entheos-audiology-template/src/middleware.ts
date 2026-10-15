import { defineMiddleware } from "astro:middleware";
import { PAGES } from "./data/page-settings";
import { NotSetUpError, loadSite } from "./data/site";

/**
 * Load the practice's content once per request for every page and component,
 * and answer "page not found" for template pages switched off in the Pages
 * list. The EmDash admin and API (/_emdash) don't need either.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	const path = context.url.pathname.replace(/\/$/, "") || "/";
	if (path.startsWith("/_emdash")) return next();
	try {
		context.locals.site ??= await loadSite();
	} catch (err) {
		if (!(err instanceof NotSetUpError)) throw err;
		return new Response(
			`<!doctype html><meta charset="utf-8"><title>Site not set up yet</title><body style="font:18px/1.5 system-ui;max-width:560px;margin:15vh auto;padding:0 16px"><h1>This site isn't set up yet</h1><p>Finish setup in the <a href="/_emdash/admin">EmDash admin</a> and include the sample content.</p>`,
			{ status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
		);
	}
	const { pages } = context.locals.site;
	const off = path !== "/404" && PAGES.some((d) => d.path && d.path !== "/" && !pages[d.slug].on && (path === d.path || (d.slug === "blog" && path.startsWith("/blog/"))));
	if (off) return context.rewrite("/404");
	return next();
});
