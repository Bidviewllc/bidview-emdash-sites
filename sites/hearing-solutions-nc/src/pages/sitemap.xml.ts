// XML sitemap: every page that's live and indexable, and nothing else.
// EmDash's built-in sitemap lists every record of a collection (including ones
// without their own page) and doesn't know the fixed pages, so the template
// writes its own. Left out: pages switched off, records without "own page",
// pages hidden with the SEO panel's "hide from search", and the thank-you,
// legal and review pages. Addresses use the live domain once it's set. The list is the
// Sitemap page's (src/lib/site-pages.ts), less the legal pages.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { PAGES } from "../data/page-settings";
import { getMarketing } from "../lib/marketing";
import { siteOrigin } from "../lib/seo";
import { siteGroups } from "../lib/site-pages";

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
	for (const g of siteGroups(site))
		for (const l of g.links) if (!SKIP.has(l.path) && !(l.collection && hidden.has(`${l.collection}/${l.slug}`))) paths.push(l.path);

	const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...new Set(paths)].map((p) => `  <url><loc>${esc(origin + p)}</loc></url>`).join("\n")}
</urlset>
`;
	return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};
