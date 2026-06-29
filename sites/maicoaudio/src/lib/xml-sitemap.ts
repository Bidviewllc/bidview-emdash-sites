import { getEmDashCollection } from "emdash";

type SitemapItem = {
	loc: string;
};

type EmDashEntryLike = {
	slug?: string | null;
	data?: Record<string, unknown>;
};

const staticPageRoutes = [
	"/",
	"/book-appointment/",
	"/news/",
	"/sitemap/",
	"/thank-you/",
	"/thank-you-for-contacting-us/",
];

const pageCollections = [
	"services",
	"hearing_aid_brands",
	"utility_pages",
	"about",
	"contact_page",
	"team",
];

function normalizeRoute(slug: string | null | undefined): string {
	if (!slug) return "/";
	const clean = slug.replace(/^\/+|\/+$/g, "");
	return clean ? `/${clean}/` : "/";
}

async function getPublishedCollectionRoutes(collection: string): Promise<string[]> {
	const result = await getEmDashCollection(collection, {
		status: "published",
		limit: 500,
	});
	if (result.error) return [];
	return (result.entries as EmDashEntryLike[])
		.map((entry) => normalizeRoute(entry.slug))
		.filter(Boolean);
}

function absoluteUrl(origin: string, route: string): string {
	return new URL(route, origin).toString();
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function uniqueRoutes(routes: string[]): string[] {
	return [...new Set(routes)].sort((a, b) => a.localeCompare(b));
}

export async function getPageSitemapRoutes(): Promise<string[]> {
	const collectionRoutes = (
		await Promise.all(pageCollections.map((collection) => getPublishedCollectionRoutes(collection)))
	).flat();
	return uniqueRoutes([...staticPageRoutes, ...collectionRoutes]);
}

export async function getPostSitemapRoutes(): Promise<string[]> {
	return uniqueRoutes(await getPublishedCollectionRoutes("blog_post"));
}

export async function getLocationSitemapRoutes(): Promise<string[]> {
	return uniqueRoutes(await getPublishedCollectionRoutes("locations"));
}

export function renderSitemapIndex(origin: string): string {
	const children = ["/page-sitemap.xml", "/post-sitemap.xml", "/location-sitemap.xml"];
	return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${children
		.map((route) => `  <sitemap><loc>${escapeXml(absoluteUrl(origin, route))}</loc></sitemap>`)
		.join("\n")}\n</sitemapindex>\n`;
}

export function renderUrlSet(origin: string, routes: string[]): string {
	const items: SitemapItem[] = uniqueRoutes(routes).map((route) => ({
		loc: absoluteUrl(origin, route),
	}));
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items
		.map((item) => `  <url><loc>${escapeXml(item.loc)}</loc></url>`)
		.join("\n")}\n</urlset>\n`;
}

export function xmlResponse(xml: string): Response {
	return new Response(xml, {
		headers: {
			"content-type": "application/xml; charset=utf-8",
		},
	});
}
