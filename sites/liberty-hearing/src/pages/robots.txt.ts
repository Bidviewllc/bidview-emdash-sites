/**
 * Liberty Hearing Center — robots.txt.
 *
 * The site previously had no robots route of its own, so nothing advertised a
 * sitemap (and the sitemap was 500ing anyway — see sitemap.xml.ts).
 *
 * NOTE: Cloudflare PREPENDS its own "Cloudflare Managed content" block (the AI
 * bot-control signals) to whatever the origin returns. That is a zone-level
 * feature, not something this file controls, and it is additive — the rules
 * below still apply. Do not try to "fix" the duplicated `User-agent: *` you see
 * in the served file; it comes from that merge.
 *
 * Prerendered for the same reason as the sitemap: it is served straight from the
 * ASSETS binding and never invokes the (slow-to-cold-start) emdash Worker.
 */
import type { APIRoute } from "astro";

export const prerender = true;

const SITE = "https://libertyhearingcentertx.com";

export const GET: APIRoute = async () => {
	const txt = `User-agent: *
Allow: /

# CMS admin, the form endpoint and the 404 page have no business in an index.
Disallow: /_emdash/
Disallow: /api/
Disallow: /404

Sitemap: ${SITE}/sitemap.xml
`;
	return new Response(txt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
