// Canonical XML sitemap. Overrides emdash's default (which returned an empty urlset).
// Static content/legal pages + blog articles (published) pulled live from D1.
export const prerender = false;

import { getEmDashCollection } from "emdash";

const STATIC_ROUTES = [
	"/",
	"/about/",
	"/audiology-services/",
	"/contact/",
	"/custom-hearing-protection/",
	"/hearing-aid-alternatives/",
	"/hearing-aid-batteries/",
	"/hearing-aid-fittings/",
	"/hearing-aid-services/",
	"/hearing-aids-products/",
	"/hearing-tests/",
	"/insurance/",
	"/news/",
	"/privacy-policy/",
	"/sensorineural-hearing-loss/",
	"/terms-of-service/",
	"/tinnitus-support/",
];

function escapeXml(v: string): string {
	return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function normalize(slugPath: string, id: string): string | null {
	const raw = slugPath || (id ? `/${id}/` : "");
	if (!raw) return null;
	const clean = raw.replace(/^\/+|\/+$/g, "");
	return clean ? `/${clean}/` : "/";
}

export async function GET({ request }: { request: Request }) {
	const origin = new URL(request.url).origin;
	const routes = [...STATIC_ROUTES];
	try {
		const { entries } = await getEmDashCollection("blog_articles", { status: "published", limit: 500 });
		for (const e of entries as Array<{ id?: string; data?: Record<string, unknown> }>) {
			const r = normalize(String(e.data?.slug_path ?? ""), String(e.id ?? ""));
			if (r) routes.push(r);
		}
	} catch (err) {
		console.error("sitemap: blog_articles query failed", err);
	}

	const body = [...new Set(routes)]
		.sort()
		.map((r) => `  <url><loc>${escapeXml(origin + r)}</loc></url>`)
		.join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
	return new Response(xml, {
		headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
	});
}
