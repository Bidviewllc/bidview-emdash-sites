// SEO for every page (Vince's rules, page-templates.md "SEO setup"):
//  - Title: the page's own title (or its SEO panel title), never the practice
//    name typed in again, then " | <practice name>" added once.
//  - Description, share image, canonical and "hide from search" come from the
//    page's SEO panel in the admin when set.
//  - Search engines only index the live domain (Marketing & tracking → Live
//    domain). Previews, workers.dev and the demo are always noindex.
//  - Thank-you, legal, 404 and the review pages are noindex by default.
import { getEmDashEntry } from "emdash";
import { pageFor } from "../data/page-settings";
import { onLiveDomain, type Marketing } from "./marketing";

/** Record-page templates and the collection their records live in. */
const TEMPLATE_COLLECTION: Record<string, string> = {
	service: "services",
	brand: "brands",
	profile: "providers",
	location: "offices",
	post: "posts",
	resource: "resources",
};

/** Paths kept out of search results whatever the panel says. */
const NOINDEX = /^\/(thank-you|privacy-policy|terms-of-use|accessibility|review|search)(\/|$)/;

export type PanelSeo = { title?: string | null; description?: string | null; noIndex?: boolean } | undefined;

/** The admin record behind this address (for its SEO panel), if any. */
export function contentFor(path: string): { collection: string; slug: string } | undefined {
	const def = pageFor(path);
	if (!def || path.startsWith("/blog/category/")) return undefined;
	if (def.collection) return { collection: def.collection, slug: "main" };
	const collection = def.template && TEMPLATE_COLLECTION[def.template];
	const slug = path.replace(/\/$/, "").split("/").pop();
	return collection && slug ? { collection, slug } : undefined;
}

/** The entry (id for EmDash's head, and its SEO panel values). */
export async function seoEntry(path: string) {
	const ref = contentFor(path);
	if (!ref) return undefined;
	try {
		const { entry } = await getEmDashEntry(ref.collection, ref.slug);
		if (!entry) return undefined;
		const e = entry as unknown as { id: string; data: { seo?: PanelSeo } };
		return { collection: ref.collection, id: e.id, slug: ref.slug, seo: e.data?.seo };
	} catch {
		return undefined;
	}
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The page's own title, with any copy of the practice name the editor typed taken out. */
export function titleCore(raw: string, names: string[]) {
	let t = raw;
	for (const n of names.filter(Boolean)) t = t.replace(new RegExp(esc(n), "gi"), "");
	return t.replace(/\s*[|·–—-]\s*([|·–—-]\s*)+/g, " | ").replace(/^\s*[|·–—-]\s*|\s*[|·–—-]\s*$/g, "").replace(/\s{2,}/g, " ").trim();
}

/** "<page title> | <practice>" (just the practice name when the page has no title of its own). */
export const fullTitle = (core: string, name: string) => (core ? `${core} | ${name}` : name);

/** Origin for canonical links and schema ids: the live domain once set, else this address. */
export function siteOrigin(mk: Marketing, url: URL) {
	const domain = (mk.live_domain?.on ? mk.live_domain.value : "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
	return domain ? `https://${domain}` : url.origin;
}

export function robotsFor(mk: Marketing, url: URL, opts: { noindex?: boolean; panel?: PanelSeo; status?: number }) {
	const hide = !onLiveDomain(mk, url.host) || opts.noindex || !!opts.panel?.noIndex || NOINDEX.test(url.pathname) || (opts.status ?? 200) >= 400;
	return hide ? "noindex, nofollow" : null;
}
