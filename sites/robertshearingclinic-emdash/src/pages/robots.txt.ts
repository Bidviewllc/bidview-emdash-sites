// Override emdash's default robots.txt so the Sitemap line points at the real
// index (/sitemap.xml now serves the Yoast-style index — see sitemap.xml.ts).
export const prerender = false;

export async function GET({ url }: { url: URL }) {
	const body = `User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /_emdash/
Disallow: /api/

Sitemap: ${url.origin}/sitemap.xml
`;
	return new Response(body, {
		headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
	});
}
