import { defineMiddleware } from "astro:middleware";
import { loadSite } from "./data/site";

/** Load the practice's content once per request for every page and component. */
export const onRequest = defineMiddleware(async (context, next) => {
	context.locals.site = await loadSite();
	return next();
});
