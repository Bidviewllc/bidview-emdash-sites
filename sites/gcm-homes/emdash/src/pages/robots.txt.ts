// robots.txt — allow crawling, block the admin + API, point at the real sitemap.
import type { APIRoute } from "astro";
export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
	const origin = new URL(request.url).origin;
	const body = [
		"User-agent: *",
		"Allow: /",
		"Disallow: /_emdash/",
		"Disallow: /api/",
		"",
		`Sitemap: ${origin}/sitemap.xml`,
		"",
	].join("\n");
	return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=3600" } });
};
