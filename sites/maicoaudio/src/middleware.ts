import { defineMiddleware } from "astro:middleware";

import { renderSitemapIndex, xmlResponse } from "./lib/xml-sitemap";

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
	if (url.pathname === "/sitemap.xml") {
		return xmlResponse(renderSitemapIndex(new URL(request.url).origin));
	}
	return next();
});
