// HSNC page content for the page being drawn: its text, lists and photos from
// its Pages record, falling back to the design's starting values in
// src/data/hsnc/<page>.ts. Called as hs(Astro).
import { HS_PAGES } from "../data/hsnc";
import type { Photo } from "../data/site";
import { getSettings } from "./settings";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/**
 * Light formatting for HSNC text, as HTML: *words* are italic, **words** bold, a
 * single line break stays a line break. Everything else is escaped.
 */
export const inline = (t: string) =>
	esc(t)
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.split("\n")
		.map((x) => x.trimEnd())
		.join("<br>");

export function hs(Astro: Parameters<typeof getSettings>[0], slug?: string) {
	const s = getSettings(Astro);
	const key = slug ?? s.pageSlug ?? "";
	const def = HS_PAGES[key];
	const rec = Astro.locals.site.pages[key];
	/** A list from the record, else the design's. Text in each row has {city}, {phone}... filled in. */
	const list = (field: string): Record<string, string>[] => {
		const own = rec?.lists[field];
		const rows = (own && own.length ? own : def?.lists?.find((l) => l.field === field)?.default) ?? [];
		return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? s.fill(v) : v])));
	};
	/** An uploaded photo, else the design's. */
	const photo = (field: string): Photo | undefined => rec?.photos[field] ?? def?.photos?.find((p) => p.field === field)?.default;
	/** The page's hero photo (its "Hero photo" field), else the design's. */
	const hero = (): Photo | undefined => rec?.heroImage ?? def?.hero;
	/** A text field as HTML with *italic* and line breaks (set:html). */
	const html = (field: string) => inline(s.text(field));
	/** A paragraphs field as HTML, one string per paragraph. */
	const htmlParas = (field: string) => s.paras(field).map(inline);
	return { text: s.text, paras: s.paras, html, htmlParas, list, photo, hero, inline, s };
}
