// HSNC page content definitions. Each designed page has one module in this folder
// (home.ts, about.ts ...) holding its editable text, its lists and its photos,
// each with the design's wording as the starting value. The plumbing:
// - src/data/page-settings.ts: a page's `text` replaces the template's page text.
// - scripts/build-seed.ts: `lists` become repeaters and `photos` image fields on
//   the page's record (Pages → <page>), seeded with the defaults.
// - src/data/site.ts: the record's lists and photos land on site.pages[slug].
// - src/lib/hs.ts: pages read them with hs(Astro), falling back to the defaults.
import type { PageText } from "../page-settings";

export type HsSubField = { slug: string; label: string; type?: "string" | "text" };
export type HsList = {
	/** Page text field this list sits after in the admin. */
	after: string;
	field: string;
	label: string;
	sub: HsSubField[];
	default: Record<string, string>[];
};
export type HsPhoto = { field: string; label: string; default: { src: string; alt: string } };
export type HsPage = {
	text: PageText[];
	lists?: HsList[];
	photos?: HsPhoto[];
	/** Starting photo for the page's existing "Hero photo" field (hero_image). */
	hero?: { src: string; alt: string };
};

/** Shorthand for a page text field. */
export const line = (field: string, label: string, d: string): PageText => ({ field, label, kind: "line", default: d });
export const para = (field: string, label: string, d: string): PageText => ({ field, label, kind: "para", default: d });
export const photo = (field: string, label: string, src: string, alt: string): HsPhoto => ({ field, label, default: { src, alt } });
