export const GET = () => {
	return new Response(
		`User-agent: *
Allow: /
Disallow: /_emdash/
Disallow: /api/

Sitemap: https://thechicagomarketingagency.com/sitemap-index.xml`,
		{ headers: { "Content-Type": "text/plain; charset=utf-8" } }
	);
};
