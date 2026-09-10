// Real sitemap. emdash's default /sitemap.xml is an index that only points at
// sitemap-posts.xml — it omits every listing, the hub, and the main pages. This
// overrides it (Astro src/pages wins) and emits the main pages + 15 neighborhoods
// + every active listing URL (from D1). Origin is taken from the request, so it's
// correct on the workers.dev host now and on grantcmeyer.com after cutover.
import type { APIRoute } from "astro";
import { allActive } from "../lib/listings";

export const prerender = false;

const NEIGHBORHOODS = [
	"lakefront", "lakeview", "mill-creek", "central", "apollo", "woods", "ponderosa",
	"lower-tyner", "upper-tyner", "jennifer", "championship-golf-course",
	"mountain-golf-course", "eastern-slope", "ski-way", "crystal-bay",
];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async ({ request }) => {
	const origin = new URL(request.url).origin;
	const now = new Date().toISOString().slice(0, 10);
	const urls: Array<{ path: string; pr: string; cf: string }> = [];
	urls.push({ path: "/", pr: "1.0", cf: "weekly" });
	urls.push({ path: "/listings/", pr: "0.9", cf: "daily" });
	for (const p of ["/buyers/", "/sellers/", "/community/", "/concierge/", "/about/", "/contact/"]) urls.push({ path: p, pr: "0.7", cf: "monthly" });
	for (const n of NEIGHBORHOODS) urls.push({ path: `/neighborhood/${n}/`, pr: "0.6", cf: "weekly" });
	try {
		const listings = await allActive();
		for (const l of listings as any[]) if (l?.slug) urls.push({ path: `/homes/${l.slug}/`, pr: "0.8", cf: "daily" });
	} catch { /* if D1 read fails, still emit the static pages */ }

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		urls.map((u) => `  <url><loc>${esc(origin + u.path)}</loc><lastmod>${now}</lastmod><changefreq>${u.cf}</changefreq><priority>${u.pr}</priority></url>`).join("\n") +
		`\n</urlset>\n`;
	return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600" } });
};
