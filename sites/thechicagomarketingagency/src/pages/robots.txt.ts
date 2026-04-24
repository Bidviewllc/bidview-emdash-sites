export const GET = () => {
	return new Response(
		`User-agent: *
Allow: /
Disallow: /_emdash/
Disallow: /api/

# Allow Google's AI crawler — needed for AI Overviews (Gemini citations)
# Overrides Cloudflare-managed Disallow per Google's equal-length Allow-wins rule
User-agent: Google-Extended
Allow: /

Sitemap: https://thechicagomarketingagency.com/sitemap.xml`,
		{ headers: { "Content-Type": "text/plain; charset=utf-8" } }
	);
};
