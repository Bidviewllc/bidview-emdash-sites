// XML sitemap: every page that's live and indexable, and nothing else.
// EmDash's built-in sitemap lists every record of a collection (including ones
// without their own page) and doesn't know the fixed pages, so the template
// writes its own. Left out: pages switched off, records without "own page",
// pages hidden with the SEO panel's "hide from search", and the thank-you,
// legal and review pages. Addresses use the live domain once it's set.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { PAGES } from "../data/page-settings";
import { getMarketing } from "../lib/marketing";
import { siteOrigin } from "../lib/seo";

export const prerender = false;

const SKIP = new Set(["/thank-you", "/privacy-policy", "/terms-of-use", "/accessibility"]);
const COLLECTIONS = ["services", "brands", "providers", "offices", "posts", "resources", ...PAGES.filter((p) => p.collection).map((p) => p.collection!)];

type D1 = { prepare: (sql: string) => { all: () => Promise<{ results?: { collection: string; slug: string }[] }> } };

/** "collection/slug" of records hidden from search in their SEO panel. */
async function hiddenRecords(): Promise<Set<string>> {
	const db = (env as unknown as { DB?: D1 }).DB;
	const out = new Set<string>();
	if (!db) return out;
	for (const c of COLLECTIONS) {
		try {
			const { results = [] } = await db
				.prepare(`SELECT '${c}' AS collection, t.slug AS slug FROM _emdash_seo s JOIN ec_${c} t ON t.id = s.content_id WHERE s.collection = '${c}' AND s.seo_no_index = 1`)
				.all();
			for (const r of results) out.add(`${r.collection}/${r.slug}`);
		} catch {
			// collection without SEO support or not created yet
		}
	}
	return out;
}

export const GET: APIRoute = async ({ locals, url }) => {
	const site = locals.site;
	const origin = siteOrigin(await getMarketing(), url);
	const hidden = await hiddenRecords();
	const paths: string[] = [];
	const add = (p: string, collection?: string, slug?: string) => {
		if (SKIP.has(p) || (collection && hidden.has(`${collection}/${slug}`))) return;
		paths.push(p);
	};
	for (const def of PAGES) if (def.path && def.collection && site.pages[def.slug]?.on) add(def.path, def.collection, "main");
	for (const x of site.services) if (x.hasPage) add(`/services/${x.slug}`, "services", x.slug);
	for (const x of site.brands) if (x.hasPage) add(`/hearing-aids/${x.slug}`, "brands", x.slug);
	for (const x of site.providers) if (x.hasPage) add(`/about/${x.slug}`, "providers", x.slug);
	for (const x of site.offices) add(`/locations/${x.slug}`, "offices", x.slug);
	if (site.pages.blog?.on) {
		for (const x of [site.featured, ...site.posts].filter(Boolean)) add(`/blog/${x!.slug}`, "posts", x!.slug);
		for (const c of site.categories) add(`/blog/category/${c.slug}`);
	}
	for (const x of site.resources) if (x.page) add(`/patient-resources/${x.slug}`, "resources", x.slug);

	const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...new Set(paths)].map((p) => `  <url><loc>${esc(origin + p)}</loc></url>`).join("\n")}
</urlset>
`;
	return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};
