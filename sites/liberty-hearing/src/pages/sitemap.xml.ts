/**
 * Liberty Hearing Center — XML sitemap.
 *
 * WHY THIS FILE EXISTS (2026-09-11):
 *   Without it, `/sitemap.xml` was served by emdash's DEFAULT sitemap route,
 *   which returned **HTTP 500 `<!-- EmDash not configured -->`** — it queries a
 *   CMS that was never set up on this project (0 collections / 0 users). The site
 *   had shipped with no working sitemap since launch. Every other Bidview site
 *   carries its own `sitemap.xml.ts` for exactly this reason.
 *   Astro's `src/pages` wins over emdash's built-in route, so this overrides it.
 *
 * PRERENDERED ON PURPOSE. Built to a static file and served by the Cloudflare
 * ASSETS binding, so it never invokes the Worker — the same reason every content
 * page is prerendered (the emdash Worker takes ~5s to cold-start its 11.2MB
 * bundle). An SSR sitemap would have reintroduced exactly that cost.
 *
 * ROUTES ARE DISCOVERED, NOT HARDCODED. `import.meta.glob` enumerates the real
 * page files at build time, so adding a page under `src/pages/<slug>/index.astro`
 * puts it in the sitemap automatically. Nothing to remember to update.
 */
import type { APIRoute } from "astro";

export const prerender = true;

const SITE = "https://libertyhearingcentertx.com";

/**
 * Pages deliberately kept OUT of the sitemap.
 * `thank-you` renders `<meta name="robots" content="noindex, follow">`, and
 * listing a noindex URL in a sitemap is a contradiction Search Console flags.
 * Keep this in sync if any other page gains `noindex`.
 */
const EXCLUDE = new Set(["/thank-you/"]);

/** The two real blog posts — lower priority, and they actually change. */
const BLOG = new Set(["/best-way-to-clean-ears/", "/hearing-aids-for-tinnitus/"]);

/** Staff bios. */
const STAFF = new Set(["/dr-carly-hall/", "/dr-chris-duhon/", "/rocio-zarandona/", "/nellie-minneman/"]);

/** Top-level entry points people actually search for. */
const PRIMARY = new Set(["/about/", "/contact/", "/book-appointment/"]);

function priority(route: string): string {
	if (route === "/") return "1.0";
	if (PRIMARY.has(route)) return "0.9";
	if (BLOG.has(route)) return "0.6";
	if (STAFF.has(route)) return "0.7";
	return "0.8"; // services, brands, pricing, resources
}

function changefreq(route: string): string {
	if (route === "/") return "weekly";
	if (BLOG.has(route)) return "monthly";
	return "monthly";
}

/**
 * Build the route list from the actual page files.
 * `./index.astro` -> `/`, `./about/index.astro` -> `/about/`.
 * Dynamic routes (`[slug]`) and the unused emdash scaffold routes
 * (posts / category / tag) are excluded — they are SSR and have no real content.
 */
function discoverRoutes(): string[] {
	const files = import.meta.glob("./**/index.astro");
	const routes = Object.keys(files)
		.filter((p) => !p.includes("["))
		.filter((p) => !/^\.\/(posts|category|tag|api)\//.test(p))
		.map((p) => {
			const r = p.replace(/^\./, "").replace(/index\.astro$/, "");
			return r === "/" ? "/" : r;
		})
		.filter((r) => !EXCLUDE.has(r));
	return [...new Set(routes)].sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)));
}

export const GET: APIRoute = async () => {
	const today = new Date().toISOString().split("T")[0];
	const routes = discoverRoutes();

	const urls = routes
		.map(
			(r) => `  <url>
    <loc>${SITE}${r}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq(r)}</changefreq>
    <priority>${priority(r)}</priority>
  </url>`,
		)
		.join("\n");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
