import { getLocationSitemapRoutes, renderUrlSet, xmlResponse } from "../lib/xml-sitemap";

export const prerender = false;
export const cacheHint = 3600;

export async function GET({ request }: { request: Request }) {
	return xmlResponse(renderUrlSet(new URL(request.url).origin, await getLocationSitemapRoutes()));
}
