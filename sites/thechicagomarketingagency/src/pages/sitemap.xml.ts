import { env } from "cloudflare:workers";

const SITE = "https://thechicagomarketingagency.com";

const SERVICES = [
	"seo", "web-design", "video-production", "paid-advertising",
	"content-marketing", "social-media", "conversion-optimization",
];

const INDUSTRIES = [
	"dentists", "restaurants", "law-firms", "ecommerce", "hvac",
	"real-estate", "healthcare", "construction", "fitness",
	"auto-dealers", "financial-services", "home-services",
];

const NEIGHBORHOODS = [
	"lincoln-park", "wicker-park", "logan-square", "river-north", "the-loop",
	"west-loop", "bucktown", "lakeview", "old-town", "gold-coast",
	"streeterville", "hyde-park", "pilsen", "bridgeport", "andersonville",
	"uptown", "edgewater", "rogers-park", "ravenswood", "lincoln-square",
	"albany-park", "irving-park", "avondale", "humboldt-park",
	"ukrainian-village", "west-town", "south-loop", "bronzeville",
	"chinatown", "little-italy",
];

const STATIC_PAGES = [
	{ url: "/",                      priority: "1.0", changefreq: "weekly"  },
	{ url: "/about/",                priority: "0.8", changefreq: "monthly" },
	{ url: "/services/",             priority: "0.9", changefreq: "monthly" },
	{ url: "/industries/",           priority: "0.8", changefreq: "monthly" },
	{ url: "/results/",              priority: "0.8", changefreq: "monthly" },
	{ url: "/blog/",                 priority: "0.8", changefreq: "weekly"  },
	{ url: "/free-seo-audit/",       priority: "0.9", changefreq: "monthly" },
	{ url: "/contact/",              priority: "0.7", changefreq: "yearly"  },
	{ url: "/privacy-policy/",       priority: "0.3", changefreq: "yearly"  },
	{ url: "/terms/",                priority: "0.3", changefreq: "yearly"  },
];

function url(loc: string, priority: string, changefreq: string, lastmod?: string) {
	return `  <url>
    <loc>${SITE}${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`;
}

export const GET = async () => {
	const today = new Date().toISOString().split("T")[0];

	// Fetch live blog post slugs from D1
	let postSlugs: string[] = [];
	try {
		const db = env.DB;
		const result = await db
			.prepare("SELECT slug FROM ec_posts WHERE status = 'published' ORDER BY slug")
			.all();
		postSlugs = (result.results as { slug: string }[]).map((r) => r.slug);
	} catch {
		// fallback: empty (sitemap still valid without posts)
	}

	const entries: string[] = [];

	// Static pages
	for (const p of STATIC_PAGES) {
		entries.push(url(p.url, p.priority, p.changefreq, today));
	}

	// Service pages
	for (const s of SERVICES) {
		entries.push(url(`/services/${s}/`, "0.8", "monthly", today));
	}

	// Industry pages
	for (const i of INDUSTRIES) {
		entries.push(url(`/industries/${i}/`, "0.7", "monthly", today));
	}

	// Blog posts
	for (const s of postSlugs) {
		entries.push(url(`/blog/${s}/`, "0.7", "weekly", today));
	}

	// Neighborhood landing pages
	for (const n of NEIGHBORHOODS) {
		entries.push(url(`/${n}/`, "0.7", "monthly", today));
	}

	// Neighborhood + service pages
	for (const n of NEIGHBORHOODS) {
		for (const s of SERVICES) {
			entries.push(url(`/${n}/${s}/`, "0.6", "monthly", today));
		}
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
		},
	});
};
