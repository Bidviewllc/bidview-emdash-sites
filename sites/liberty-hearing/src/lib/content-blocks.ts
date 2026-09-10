/**
 * Block shapes for the doc-generated content pages.
 * Lives here (not in ContentPage.astro) so the generated pages can import the
 * type and annotate their literals — without it TypeScript widens `t` to
 * `string` and every page fails `astro check`.
 */
export interface Block {
	t: "h2" | "h3" | "p" | "ul" | "faq";
	v?: string;
	items?: string[];
	qa?: { q: string; a: string[] }[];
}
