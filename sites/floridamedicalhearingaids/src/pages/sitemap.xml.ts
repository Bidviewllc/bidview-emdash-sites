import seed from "../../seed/seed.json";

const SITE = "https://floridamedicalhearingaids.com";

// Priority/changefreq by page type (slug-based).
function meta(slug: string): { priority: string; changefreq: string } {
	if (slug === "home") return { priority: "1.0", changefreq: "weekly" };
	if (/^(privacy-policy|terms-of-use|sitemap|thank-you)/.test(slug)) return { priority: "0.3", changefreq: "yearly" };
	if (slug.startsWith("hearing-aid/") || slug.startsWith("audiology-services") || slug.startsWith("hearing-aids-products"))
		return { priority: "0.8", changefreq: "monthly" };
	return { priority: "0.7", changefreq: "monthly" };
}

export const GET = () => {
	const entries = (seed as { entries: { slug: string }[] }).entries;
	const urls = entries
		.map((e) => {
			const loc = e.slug === "home" ? `${SITE}/` : `${SITE}/${e.slug}/`;
			const { priority, changefreq } = meta(e.slug);
			return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
		})
		.join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	return new Response(xml, {
		headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
	});
};
