// Dynamic, origin-based XML sitemap. Replaces the static public/*.xml files that
// were hardcoded to the staging workers.dev host. Routes come from the same
// static-pages.json the catch-all uses, minus WP date-archive routes.
export const prerender = false;

import pages from "../data/static-pages.json";

const DATE_ARCHIVE = /^\/\d{4}\/\d{2}(\/\d{2})?\/$/;
const EXCLUDE = new Set(["/thank-you/", "/thank-you-for-contacting-us/"]);

function normalize(route: string): string {
	if (!route) return "/";
	const clean = route.replace(/^\/+|\/+$/g, "");
	return clean ? `/${clean}/` : "/";
}
function escapeXml(v: string): string {
	return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET({ request }: { request: Request }) {
	const origin = new URL(request.url).origin;
	const routes = [
		...new Set(
			(pages as Array<{ route: string }>)
				.map((p) => normalize(p.route))
				.filter((r) => !DATE_ARCHIVE.test(r) && !EXCLUDE.has(r)),
		),
	].sort();

	const body = routes.map((r) => `  <url><loc>${escapeXml(origin + r)}</loc></url>`).join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
	return new Response(xml, {
		headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
	});
}
