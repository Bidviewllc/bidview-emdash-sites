// Renders EmDash rich text (Portable Text) to HTML for the design's ".rt"
// styles: paragraphs, H2/H3/H4, bulleted and numbered lists, block quotes,
// bold/italic/underline/code, links and images with captions. H2s get ids so
// pages can build a "Jump to" list from them. Unknown block types are skipped.
import { keptHref } from "./resource-paths";

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
					if (d?.href) html = `<a href="${esc(keptHref(d.href))}"${d.blank ? ' target="_blank" rel="noopener"' : ""}>${html}</a>`;
				}
			}
			return html;
		})
		.join("");
}

/** The alignment chosen in the editor (left, right, center, wide, full) as a class; none = right. */
const ALIGNS = ["left", "right", "center", "wide", "full"];
const alignClass = (b: PTBlock) => (ALIGNS.includes(String(b.alignment)) ? ` al-${b.alignment}` : "");

/** maxH = the tallest it may show (px). */
function image(b: PTBlock, maxH = 460) {
	const asset = (b.asset ?? {}) as Record<string, unknown>;
	const src = (asset.url ?? b.url ?? b.src ?? (asset._ref ? `/_emdash/api/media/file/${asset._ref}` : "")) as string;
	if (!src) return "";
	const alt = esc(String(b.alt ?? ""));
	const cap = b.caption ? `<figcaption>${esc(String(b.caption))}</figcaption>` : "";
	// An image that knows its size shows whole, at most that size (logos, product shots,
	// the old site's photos; Liz, 2026-11-16). Without a size: the design's 3:2 cropped photo.
	const w = Number(b.width ?? asset.width) || 0;
	const hgt = Number(b.height ?? asset.height) || 0;
	if (w && hgt) {
		// The editor's own resize (displayWidth) wins over the height cap.
		const dw = Number(b.displayWidth) || 0;
		const show = dw || Math.round(Math.min(w, (maxH * w) / hgt));
		return `<figure class="rt-pic${alignClass(b)}"><img src="${esc(src)}" alt="${alt}" width="${w}" height="${hgt}" style="width:${show}px" loading="lazy">${cap}</figure>`;
	}
	return `<figure><div class="fimg"><img src="${esc(src)}" alt="${alt}" loading="lazy"></div>${cap}</figure>`;
}

/**
 * Each top-level piece of HTML (a paragraph, a whole list...), so a page can
 * put something between them (the mid-article booking box), plus the H2s.
 */
export function ptParts(blocks: PTBlock[] | undefined | null) {
	const parts: { html: string; h2?: string; kind?: "img" | "head" }[] = [];
	const headings: { id: string; label: string }[] = [];
	const used = new Set<string>();
	const list = blocks ?? [];
	for (let i = 0; i < list.length; i++) {
		const b = list[i];
		if (b._type === "image") {
			// Images one after another sit in a row (a row of brand logos).
			const run: PTBlock[] = [];
			while (i < list.length && list[i]._type === "image") run.push(list[i++]);
			i--;
			// A long row is logos (kept short); a pair or three can be photos or a QR code.
			const pics = run.map((x) => image(x, run.length >= 4 ? 60 : run.length > 1 ? 260 : 460)).filter(Boolean);
			// 4+ = a full-width row of logos; 2-3 = one column beside the text (wrapped like a single image).
			// An image beside the text (not centred, wide or full; not a logo row) can start a section.
			const beside = /^(left|right|undefined)$/.test(String(run[0].alignment)) && /class="rt-pic/.test(pics[0] ?? "") ? ("img" as const) : undefined;
			if (pics.length >= 4) parts.push({ html: `<div class="rt-pics">${pics.join("")}</div>` });
			else if (pics.length > 1) parts.push({ html: `<div class="rt-group${alignClass(run[0])}">${pics.join("")}</div>`, kind: beside });
			else if (pics.length) parts.push({ html: pics[0], kind: beside });
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
			parts.push({ html: `<h2 id="${id}">${inner}</h2>`, h2: id, kind: "head" });
		} else if (style === "h3" || style === "h4") parts.push({ html: `<${style}>${inner}</${style}>`, kind: "head" });
		else if (style === "blockquote") parts.push({ html: `<blockquote>${inner}</blockquote>` });
		else parts.push({ html: `<p>${inner}</p>` });
	}
	return { parts: sections(parts), headings };
}

/**
 * An image placed just above a heading sits beside that heading and its text (as on the old
 * site; Liz, 2026-11-17). Image, heading and the text up to the next heading or image go in
 * one box, so the next section always starts below the image, however short the text.
 */
function sections(parts: { html: string; h2?: string; kind?: "img" | "head" }[]) {
	const out: { html: string; h2?: string }[] = [];
	for (let k = 0; k < parts.length; k++) {
		if (parts[k].kind === "img" && parts[k + 1]?.kind === "head") {
			const body = [parts[k].html, parts[k + 1].html];
			const h2 = parts[k + 1].h2;
			k += 2;
			while (k < parts.length && !parts[k].kind) body.push(parts[k++].html);
			k--;
			out.push({ html: `<div class="rt-sec">${body.join("\n")}</div>`, h2 });
		} else out.push({ html: parts[k].html, h2: parts[k].h2 });
	}
	return out;
}

/** Rich text as one HTML string, plus its H2s for a "Jump to" list. */
export function ptToHtml(blocks: PTBlock[] | undefined | null) {
	const { parts, headings } = ptParts(blocks);
	return { html: parts.map((p) => p.html).join("\n"), headings };
}

/** True when a rich-text field has any content. */
export const ptHas = (blocks: unknown) => Array.isArray(blocks) && blocks.some((b) => (b as PTBlock)._type !== "block" || blockText(b as PTBlock).trim());
