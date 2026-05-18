import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

/**
 * XML sitemap for Commonwealth Audiology.
 * Lists all static routes plus published blog posts.
 * Linked from the footer as /sitemap-index.xml.
 */

// Static, hand-maintained routes (trailing slash to match the site's URLs).
const STATIC_PATHS = [
	"/",
	"/about/",
	"/about/insurance-billing/",
	"/tiffany-brewer/",
	"/aubrey-gingrich/",
	"/magnolia/",
	"/contact/",
	"/give-back/",
	"/privacy-policy/",
	"/terms-of-service/",
	"/audiology-services/",
	"/audiology-services/hearing-tests/",
	"/audiology-services/hearing-aid-services/",
	"/audiology-services/tinnitus-evaluation-treatment/",
	"/audiology-services/hearing-aid-fittings/",
	"/audiology-services/sensorineural-hearing-loss/",
	"/audiology-services/ear-wax-removal/",
	"/audiology-services/real-ear-measurement/",
	"/hearing-aids-products/",
	"/hearing-aids-products/oticon/",
	"/hearing-aids-products/widex/",
	"/hearing-aids-products/starkey/",
	"/hearing-aids-products/phonak/",
	"/hearing-aids-products/resound/",
	"/hearing-aids-products/signia/",
	"/hearing-aids-products/unitron/",
	"/hearing-aids-products/costco-hearing-aids/",
	"/hearing-aids-products/nano-hearing-aids/",
	"/hearing-aids-products/walmart-hearing-aids/",
	"/hearing-aids-products/custom-hearing-protection/",
	"/hearing-aids-products/hearing-aid-batteries/",
	"/news/",
	"/sitemap/",
];

export const GET: APIRoute = async ({ site, url }) => {
	const origin = (site?.toString() || url.origin).replace(/\/$/, "");
	const today = new Date().toISOString().slice(0, 10);

	const entries: string[] = STATIC_PATHS.map(
		(path) =>
			`  <url><loc>${origin}${path}</loc><lastmod>${today}</lastmod></url>`,
	);

	try {
		const { entries: posts } = await getEmDashCollection("posts", {
			orderBy: { published_at: "desc" },
		});
		for (const post of posts) {
			const lastmod = post.data.publishedAt
				? post.data.publishedAt.toISOString().slice(0, 10)
				: today;
			entries.push(
				`  <url><loc>${origin}/news/${post.id}/</loc><lastmod>${lastmod}</lastmod></url>`,
			);
		}
	} catch {
		// If the posts collection is unavailable, still return the static map.
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
