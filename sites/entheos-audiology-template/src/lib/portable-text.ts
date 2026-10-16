// Renders EmDash rich text (Portable Text) to HTML for the design's ".rt"
// styles: paragraphs, H2/H3/H4, bulleted and numbered lists, block quotes,
// bold/italic/underline/code, links and images with captions. H2s get ids so
// pages can build a "Jump to" list from them. Unknown block types are skipped.

type Span = { _type: string; text?: string; marks?: string[] };
type MarkDef = { _key: string; _type: string; href?: string; blank?: boolean };
export type PTBlock = {
	_type: string;
	_key?: string;
	style?: string;
	listItem?: "bullet" | "number";
	level?: number;
	children?: Span[];
	markDefs?: MarkDef[];
	[k: string]: unknown;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);

/** Plain text of a block. */
export const blockText = (b: PTBlock) => (b.children ?? []).map((c) => c.text ?? "").join("");

function spans(b: PTBlock) {
	const defs = new Map((b.markDefs ?? []).map((d) => [d._key, d]));
	return (b.children ?? [])
		.map((c) => {
			let html = esc(c.text ?? "").replace(/\n/g, "<br>");
			for (const m of c.marks ?? []) {
				if (m === "strong") html = `<strong>${html}</strong>`;
				else if (m === "em") html = `<em>${html}</em>`;
				else if (m === "underline") html = `<u>${html}</u>`;
				else if (m === "code") html = `<code>${html}</code>`;
				else if (m === "strike-through") html = `<s>${html}</s>`;
				else {
					const d = defs.get(m);
					if (d?.href) html = `<a href="${esc(d.href)}"${d.blank ? ' target="_blank" rel="noopener"' : ""}>${html}</a>`;
				}
			}
			return html;
		})
		.join("");
}

function image(b: PTBlock) {
	const asset = (b.asset ?? {}) as Record<string, unknown>;
	const src = (asset.url ?? b.url ?? b.src ?? (asset._ref ? `/_emdash/api/media/file/${asset._ref}` : "")) as string;
	if (!src) return "";
	const alt = esc(String(b.alt ?? ""));
	const cap = b.caption ? `<figcaption>${esc(String(b.caption))}</figcaption>` : "";
	return `<figure><div class="fimg"><img src="${esc(src)}" alt="${alt}" loading="lazy"></div>${cap}</figure>`;
}

/**
 * Each top-level piece of HTML (a paragraph, a whole list...), so a page can
 * put something between them (the mid-article booking box), plus the H2s.
 */
export function ptParts(blocks: PTBlock[] | undefined | null) {
	const parts: { html: string; h2?: string }[] = [];
	const headings: { id: string; label: string }[] = [];
	const used = new Set<string>();
	const list = blocks ?? [];
	for (let i = 0; i < list.length; i++) {
		const b = list[i];
		if (b._type === "image") {
			const html = image(b);
			if (html) parts.push({ html });
			continue;
		}
		if (b._type !== "block") continue;
		if (b.listItem) {
			const tag = b.listItem === "number" ? "ol" : "ul";
			const items: string[] = [];
			while (i < list.length && list[i]._type === "block" && list[i].listItem === b.listItem) items.push(`<li>${spans(list[i++])}</li>`);
			i--;
			parts.push({ html: `<${tag}>${items.join("")}</${tag}>` });
			continue;
		}
		const inner = spans(b);
		if (!inner.trim()) continue;
		const style = b.style ?? "normal";
		if (style === "h2") {
			let id = slugify(blockText(b)) || "section";
			while (used.has(id)) id += "-2";
			used.add(id);
			headings.push({ id, label: blockText(b) });
			parts.push({ html: `<h2 id="${id}">${inner}</h2>`, h2: id });
		} else if (style === "h3" || style === "h4") parts.push({ html: `<${style}>${inner}</${style}>` });
		else if (style === "blockquote") parts.push({ html: `<blockquote>${inner}</blockquote>` });
		else parts.push({ html: `<p>${inner}</p>` });
	}
	return { parts, headings };
}

/** Rich text as one HTML string, plus its H2s for a "Jump to" list. */
export function ptToHtml(blocks: PTBlock[] | undefined | null) {
	const { parts, headings } = ptParts(blocks);
	return { html: parts.map((p) => p.html).join("\n"), headings };
}

/** True when a rich-text field has any content. */
export const ptHas = (blocks: unknown) => Array.isArray(blocks) && blocks.some((b) => (b as PTBlock)._type !== "block" || blockText(b as PTBlock).trim());
