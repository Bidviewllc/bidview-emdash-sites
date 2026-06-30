import { getEmDashCollection, getEmDashEntry } from "emdash";

import { contentRouteMap } from "../generated/content-route-manifest";
import { getStaticPageHtml } from "./static-pages";

type ContentRouteConfig = (typeof contentRouteMap)[keyof typeof contentRouteMap];
type InternalContentMode = "accordion" | "divider" | "flat";

type EmDashEntryLike = {
	id?: string;
	slug?: string;
	data?: Record<string, unknown>;
};

type EmDashImageLike = {
	id?: string;
	src?: string;
	alt?: string;
	width?: number | string | null;
	height?: number | string | null;
};

type PortableTextSpan = {
	_type?: string;
	text?: string;
	marks?: string[];
};

type PortableTextBlock = {
	_type?: string;
	style?: string;
	listItem?: "bullet" | "number";
	level?: number;
	children?: PortableTextSpan[];
	markDefs?: Array<{ _key?: string; _type?: string; href?: string }>;
	code?: string;
	html?: string;
};

function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function renderPortableTextSpans(block: PortableTextBlock): string {
	const markDefs = new Map((block.markDefs || []).map((mark) => [mark._key, mark]));
	return (block.children || [])
		.map((span) => {
			let text = escapeHtml(span.text || "");
			for (const mark of span.marks || []) {
				if (mark === "strong") text = `<strong>${text}</strong>`;
				else if (mark === "em") text = `<em>${text}</em>`;
				else {
					const markDef = markDefs.get(mark);
					if (markDef?._type === "link" && markDef.href) {
						text = `<a href="${escapeHtml(markDef.href)}">${text}</a>`;
					}
				}
			}
			return text;
		})
		.join("");
}

function renderPortableTextContent(value: unknown): string {
	if (typeof value === "string") return value;
	if (!Array.isArray(value)) return "";
	return renderPortableTextBlocks(value as PortableTextBlock[]);
}

function renderPortableTextBlocks(blocks: PortableTextBlock[]): string {
	const parts: string[] = [];
	let openList: "bullet" | "number" | null = null;

	function closeList() {
		if (!openList) return;
		parts.push(openList === "number" ? "</ol>" : "</ul>");
		openList = null;
	}

	for (const block of blocks) {
		if (block._type === "rawHtml" && typeof block.html === "string") {
			closeList();
			parts.push(block.html);
			continue;
		}
		if (block._type === "code") {
			closeList();
			parts.push(`<pre><code>${escapeHtml(block.code || "")}</code></pre>`);
			continue;
		}
		if (block._type !== "block") continue;

		const inner = renderPortableTextSpans(block);
		if (!inner.trim()) continue;

		if (block.listItem) {
			if (openList !== block.listItem) {
				closeList();
				openList = block.listItem;
				parts.push(openList === "number" ? "<ol>" : "<ul>");
			}
			parts.push(`<li>${inner}</li>`);
			continue;
		}

		closeList();
		const tag = /^h[1-6]$/.test(block.style || "") ? block.style : "p";
		parts.push(`<${tag}>${inner}</${tag}>`);
	}

	closeList();
	return parts.join("");
}

function isPortableBlock(block: PortableTextBlock): boolean {
	return block._type === "block";
}

function blockStyle(block: PortableTextBlock): string {
	return block.style || "normal";
}

function isHeading(block: PortableTextBlock, style: "h2" | "h3" | "h4"): boolean {
	return isPortableBlock(block) && blockStyle(block) === style && !block.listItem;
}

type HeadingGroup = {
	heading: PortableTextBlock;
	body: PortableTextBlock[];
};

function splitIntoHeadingGroups(blocks: PortableTextBlock[], style: "h3" | "h4"): {
	before: PortableTextBlock[];
	groups: HeadingGroup[];
} {
	const before: PortableTextBlock[] = [];
	const groups: HeadingGroup[] = [];
	let current: HeadingGroup | null = null;

	for (const block of blocks) {
		if (isHeading(block, style)) {
			current = { heading: block, body: [] };
			groups.push(current);
			continue;
		}

		if (current) current.body.push(block);
		else before.push(block);
	}

	return { before, groups };
}

function headingText(block: PortableTextBlock): string {
	return renderPortableTextSpans(block).trim();
}

function isAnyHeading(block: PortableTextBlock): boolean {
	return isPortableBlock(block) && /^h[1-6]$/.test(blockStyle(block)) && !block.listItem;
}

function renderInternalDivider(): string {
	return `<div class="astro-element-element astro-element-widget astro-element-widget-divider local-internal-divider" aria-hidden="true"><div class="astro-element-widget-container"><div class="astro-element-divider"><span class="astro-element-divider-separator"></span></div></div></div>`;
}

function renderGeneratedAccordion(groups: HeadingGroup[], headingTag: "h3" | "h4"): string {
	if (!groups.length) return "";
	const items = groups
		.map((group, index) => {
			const itemId = `local-accordion-item-${headingTag}-${index}-${Math.abs(
				headingText(group.heading).split("").reduce((hash, char) => hash * 31 + char.charCodeAt(0), 7),
			)}`;
			const title = headingText(group.heading);
			const body = renderPortableTextBlocks(group.body);
			const openAttr = index === 0 ? ` open=""` : "";
			const expanded = index === 0 ? "true" : "false";
			const tabIndex = index === 0 ? "0" : "-1";
			return `<details class="e-n-accordion-item local-generated-accordion-item" id="${itemId}"${openAttr}><summary aria-controls="${itemId}" aria-expanded="${expanded}" class="e-n-accordion-item-title" data-accordion-index="${index + 1}" tabindex="${tabIndex}"><span class="e-n-accordion-item-title-header"><${headingTag} class="e-n-accordion-item-title-text">${title}</${headingTag}></span><span class="e-n-accordion-item-title-icon"><span class="e-opened"><i aria-hidden="true" class="fas fa-minus"></i></span><span class="e-closed"><i aria-hidden="true" class="fas fa-plus"></i></span></span></summary><div aria-labelledby="${itemId}" class="astro-element-element e-con-full e-flex e-con e-child local-generated-accordion-content" role="region"><div class="astro-element-widget-container">${body}</div></div></details>`;
		})
		.join("");
	return `<div class="astro-element-element astro-element-widget astro-element-widget-n-accordion local-generated-accordion" data-e-type="widget" data-element_type="widget" data-settings='{"default_state":"expanded","max_items_expended":"one","n_accordion_animation_duration":{"unit":"ms","size":300,"sizes":[]}}' data-widget_type="nested-accordion.default"><div class="astro-element-widget-container"><div aria-label="Accordion. Open links with Enter or Space, close with Escape, and navigate with Arrow Keys" class="e-n-accordion">${items}</div></div></div>`;
}

function groupHasHeading(group: HeadingGroup, style: "h4"): boolean {
	return group.body.some((block) => isHeading(block, style));
}

function renderH3Group(group: HeadingGroup): string {
	const { before, groups } = splitIntoHeadingGroups(group.body, "h4");
	const base = renderPortableTextBlocks([group.heading, ...before]);
	if (!groups.length) return base;
	return base + renderGeneratedAccordion(groups, "h4");
}

function renderH2Section(headings: PortableTextBlock[], body: PortableTextBlock[]): string {
	const { before, groups } = splitIntoHeadingGroups(body, "h3");
	let html = renderInternalDivider() + renderPortableTextBlocks([...headings, ...before]);

	if (!groups.length) return html;
	if (groups.length === 1) return html + renderH3Group(groups[0]);

	const allH3GroupsContainH4 = groups.every((group) => groupHasHeading(group, "h4"));
	if (allH3GroupsContainH4) {
		return html + groups.map((group) => renderH3Group(group)).join("");
	}

	const accordionGroups = groups.map((group) => {
		if (!groupHasHeading(group, "h4")) return group;
		const { before: beforeH4, groups: h4Groups } = splitIntoHeadingGroups(group.body, "h4");
		return {
			heading: group.heading,
			body: [...beforeH4, { _type: "rawHtml", html: renderGeneratedAccordion(h4Groups, "h4") }],
		};
	});
	return html + renderGeneratedAccordion(accordionGroups, "h3");
}

function renderInternalContentStylesAndScript(): string {
	return `<script>
document.addEventListener("toggle",function(event){
  var item=event.target;
  if(!item || !item.matches || !item.matches(".local-generated-accordion-item") || !item.open) return;
  var accordion=item.closest(".local-generated-accordion");
  if(!accordion) return;
  accordion.querySelectorAll(".local-generated-accordion-item[open]").forEach(function(other){
    if(other!==item) other.removeAttribute("open");
  });
},true);
document.addEventListener("click",function(event){
  var summary=event.target.closest && event.target.closest(".local-generated-accordion-item summary");
  if(!summary) return;
  setTimeout(function(){
    var item=summary.parentElement;
    if(!item) return;
    summary.setAttribute("aria-expanded", item.open ? "true" : "false");
  },0);
});
</script>`;
}

function renderInternalPortableTextContent(value: unknown): string {
	if (typeof value === "string") return value;
	if (!Array.isArray(value)) return "";

	const blocks = value as PortableTextBlock[];
	const parts: string[] = [];
	let preface: PortableTextBlock[] = [];
	let currentH2Headings: PortableTextBlock[] = [];
	let currentBody: PortableTextBlock[] = [];

	function flushH2() {
		if (!currentH2Headings.length) return;
		parts.push(renderH2Section(currentH2Headings, currentBody));
		currentH2Headings = [];
		currentBody = [];
	}

	for (const block of blocks) {
		if (isHeading(block, "h2")) {
			if (!currentH2Headings.length) {
				if (preface.length) {
					parts.push(renderPortableTextBlocks(preface));
					preface = [];
				}
			}
			if (currentH2Headings.length && currentBody.length) flushH2();
			currentH2Headings.push(block);
			continue;
		}

		if (currentH2Headings.length) currentBody.push(block);
		else preface.push(block);
	}

	if (preface.length) parts.push(renderPortableTextBlocks(preface));
	flushH2();

	return `<div class="local-internal-content">${renderInternalContentStylesAndScript()}${parts.join("")}</div>`;
}

function renderInternalDividerOnlyPortableTextContent(value: unknown): string {
	if (typeof value === "string") return value;
	if (!Array.isArray(value)) return "";

	const blocks = value as PortableTextBlock[];
	const parts: string[] = [];
	let preface: PortableTextBlock[] = [];
	let currentH2Headings: PortableTextBlock[] = [];
	let currentBody: PortableTextBlock[] = [];

	function flushH2() {
		if (!currentH2Headings.length) return;
		parts.push(renderInternalDivider() + renderPortableTextBlocks([...currentH2Headings, ...currentBody]));
		currentH2Headings = [];
		currentBody = [];
	}

	for (const block of blocks) {
		if (isHeading(block, "h2")) {
			if (!currentH2Headings.length && preface.length) {
				parts.push(renderPortableTextBlocks(preface));
				preface = [];
			}
			if (currentH2Headings.length && currentBody.length) flushH2();
			currentH2Headings.push(block);
			continue;
		}

		if (currentH2Headings.length) currentBody.push(block);
		else preface.push(block);
	}

	if (preface.length) parts.push(renderPortableTextBlocks(preface));
	flushH2();

	return `<div class="local-internal-content">${renderInternalContentStylesAndScript()}${parts.join("")}</div>`;
}

function renderInternalFlatPortableTextContent(value: unknown): string {
	return `<div class="local-internal-content">${renderPortableTextContent(value)}</div>`;
}

function replaceTagInner(html: string, tagName: string, replacement: string): string {
	const pattern = new RegExp(`(<${tagName}[^>]*>)([\\s\\S]*?)(</${tagName}>)`, "i");
	return html.replace(pattern, `$1${replacement}$3`);
}

function findElementBounds(html: string, className: string) {
	const classIndex = html.indexOf(className);
	if (classIndex === -1) return null;
	const start = html.lastIndexOf("<", classIndex);
	if (start === -1) return null;
	const startTagEnd = html.indexOf(">", start);
	if (startTagEnd === -1) return null;
	const tagMatch = /^<([a-zA-Z0-9:-]+)/.exec(html.slice(start, startTagEnd + 1));
	if (!tagMatch) return null;
	const tag = tagMatch[1].toLowerCase();
	const tokenPattern = new RegExp(`<\\/?${tag}(?=[\\s>/])[^>]*>`, "gi");
	tokenPattern.lastIndex = start;
	let depth = 0;
	let match: RegExpExecArray | null;
	while ((match = tokenPattern.exec(html))) {
		const token = match[0];
		const isClose = token.startsWith("</");
		const isSelfClosing = token.endsWith("/>");
		if (!isClose && !isSelfClosing) depth++;
		if (isClose) depth--;
		if (depth === 0) {
			return {
				start,
				startTagEnd: startTagEnd + 1,
				endStart: match.index,
				end: tokenPattern.lastIndex,
			};
		}
	}
	return null;
}

function findElementBoundsFromStart(html: string, start: number) {
	const startTagEnd = html.indexOf(">", start);
	if (start === -1 || startTagEnd === -1) return null;
	const tagMatch = /^<([a-zA-Z0-9:-]+)/.exec(html.slice(start, startTagEnd + 1));
	if (!tagMatch) return null;
	const tag = tagMatch[1].toLowerCase();
	const tokenPattern = new RegExp(`<\\/?${tag}(?=[\\s>/])[^>]*>`, "gi");
	tokenPattern.lastIndex = start;
	let depth = 0;
	let match: RegExpExecArray | null;
	while ((match = tokenPattern.exec(html))) {
		const token = match[0];
		const isClose = token.startsWith("</");
		const isSelfClosing = token.endsWith("/>");
		if (!isClose && !isSelfClosing) depth++;
		if (isClose) depth--;
		if (depth === 0) {
			return {
				start,
				startTagEnd: startTagEnd + 1,
				endStart: match.index,
				end: tokenPattern.lastIndex,
			};
		}
	}
	return null;
}

function findFirstElementBoundsByClassAttribute(html: string, className: string) {
	const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = new RegExp(
		`<([a-zA-Z0-9:-]+)\\b[^>]*class=(["'])[^"']*\\b${escapedClassName}\\b[^"']*\\2[^>]*>`,
		"i",
	);
	const match = pattern.exec(html);
	if (!match) return null;
	return findElementBoundsFromStart(html, match.index);
}

function findAllElementBoundsByClassAttribute(html: string, className: string) {
	const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = new RegExp(
		`<([a-zA-Z0-9:-]+)\\b[^>]*class=(["'])[^"']*\\b${escapedClassName}\\b[^"']*\\2[^>]*>`,
		"gi",
	);
	const boundsList: Array<NonNullable<ReturnType<typeof findElementBoundsFromStart>>> = [];
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(html))) {
		const bounds = findElementBoundsFromStart(html, match.index);
		if (!bounds) continue;
		boundsList.push(bounds);
		pattern.lastIndex = bounds.end;
	}
	return boundsList;
}

function replaceInnerByClass(html: string, className: string, inner: string): string {
	const bounds = findElementBounds(html, className);
	if (!bounds) return html;
	return html.slice(0, bounds.startTagEnd) + inner + html.slice(bounds.endStart);
}

function replaceInnerWithinHtmlByClass(html: string, className: string, inner: string): string {
	const bounds = findElementBounds(html, className);
	if (!bounds) return html;
	return html.slice(0, bounds.startTagEnd) + inner + html.slice(bounds.endStart);
}

function replaceFirstInsideClass(
	html: string,
	className: string,
	tagName: string,
	inner: string,
): string {
	const bounds = findElementBounds(html, className);
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	const section = html.slice(bounds.startTagEnd, bounds.endStart);
	const after = html.slice(bounds.endStart);
	return before + replaceTagInner(section, tagName, inner) + after;
}

function replaceFirstInsideClassWithHtml(
	html: string,
	className: string,
	tagName: string,
	inner: string,
): string {
	const bounds = findElementBounds(html, className);
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	const section = html.slice(bounds.startTagEnd, bounds.endStart);
	const after = html.slice(bounds.endStart);
	return before + replaceTagInner(section, tagName, inner) + after;
}

function normalizeHref(value: unknown, fallback = "/book-appointment/"): string {
	const raw = String(value || "").trim();
	if (!raw) return fallback;
	if (/^(https?:|mailto:|tel:|#)/i.test(raw)) return raw;
	const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
	return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function stripTags(value: string): string {
	return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function renderSitewideAppointmentLinks(html: string, href: string): string {
	return html.replace(
		/<a\b([^>]*)href=(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi,
		(full, before: string, quote: string, _oldHref: string, after: string, inner: string) => {
			if (!/\bbook\s+an\s+appointment\b/i.test(stripTags(inner))) return full;
			return `<a${before}href=${quote}${escapeHtml(href)}${quote}${after}>${inner}</a>`;
		},
	);
}

function renderHeaderMenuTweaks(html: string): string {
	let next = html.replace(
		/<a\b([^>]*)href=(["'])#\2([^>]*)>([\s\S]*?)<\/a>/gi,
		(full, before: string, _quote: string, after: string, inner: string) => {
			const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
			if (text === "Our Team") {
				return `<a${before}href="/about/" data-local-scroll-target="astro-element-element-5a5edc3"${after}>${inner}</a>`;
			}
			if (text === "Location") {
				return `<a${before}${after}>${inner}</a>`;
			}
			return full;
		},
	);
	if (next.includes("data-local-scroll-target") && !next.includes("local-header-scroll-script")) {
		next = next.replace(
			"</body>",
			`<script id="local-header-scroll-script">
document.addEventListener("click", function(event) {
  var link = event.target && event.target.closest ? event.target.closest("[data-local-scroll-target]") : null;
  if (!link) return;
  var targetClass = link.getAttribute("data-local-scroll-target");
  if (!targetClass) return;
  if (window.location.pathname.replace(/\\/+$/, "/") !== "/about/") {
    try { sessionStorage.setItem("localScrollTarget", targetClass); } catch (error) {}
    return;
  }
  var target = document.querySelector("." + targetClass);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  if (history.replaceState) history.replaceState(null, "", "/about/");
});
document.addEventListener("DOMContentLoaded", function() {
  var targetClass = null;
  try {
    targetClass = sessionStorage.getItem("localScrollTarget");
    sessionStorage.removeItem("localScrollTarget");
  } catch (error) {}
  if (!targetClass || window.location.pathname.replace(/\\/+$/, "/") !== "/about/") return;
  var target = document.querySelector("." + targetClass);
  if (!target) return;
  setTimeout(function() {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (history.replaceState) history.replaceState(null, "", "/about/");
  }, 80);
});
</script>
</body>`,
		);
	}
	return next;
}

function renderTextWithBreaks(value: unknown): string {
	const raw = String(value || "").trim();
	if (!raw) return "";
	if (/^it[’']s time to hear and be heard\.?$/i.test(raw)) {
		return "It’s time to hear <br/>\nand be heard.";
	}
	return escapeHtml(raw).replace(/\r?\n/g, "<br/>");
}

function parseImageField(value: unknown): EmDashImageLike | null {
	if (!value) return null;
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value) as EmDashImageLike;
			return parsed && typeof parsed === "object" ? parsed : null;
		} catch {
			return null;
		}
	}
	if (typeof value === "object") {
		const image = value as EmDashImageLike & { meta?: { storageKey?: string } };
		if (!image.src && image.meta?.storageKey) {
			return { ...image, src: `/_emdash/api/media/file/${image.meta.storageKey}` };
		}
		return image;
	}
	return null;
}

function replaceImageInClass(html: string, className: string, image: unknown): string {
	const imageData = parseImageField(image);
	if (!imageData?.src) return html;
	const bounds = findElementBounds(html, className);
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	const section = html.slice(bounds.startTagEnd, bounds.endStart);
	const after = html.slice(bounds.endStart);
	const existingImg = section.match(/<img\b[^>]*>/i)?.[0] || "";
	const classAttr = existingImg.match(/\bclass=(["'])(.*?)\1/i)?.[2] || "attachment-large size-large";
	const decodingAttr = existingImg.includes("decoding=") ? ` decoding="async"` : "";
	const loadingAttr = existingImg.includes("loading=") ? ` loading="lazy"` : "";
	const width = imageData.width ? ` width="${escapeHtml(imageData.width)}"` : "";
	const height = imageData.height ? ` height="${escapeHtml(imageData.height)}"` : "";
	const replacement = `<img alt="${escapeHtml(imageData.alt || "")}" class="${escapeHtml(
		classAttr,
	)}"${decodingAttr}${height}${loadingAttr} src="${escapeHtml(imageData.src)}"${width}/>`;
	return before + section.replace(/<img\b[^>]*>/i, replacement) + after;
}

function replaceImagesInClass(html: string, className: string, images: unknown[]): string {
	const imageData = images
		.map((image) => parseImageField(image))
		.filter((image): image is EmDashImageLike => Boolean(image?.src));
	if (!imageData.length) return html;
	const bounds = findElementBounds(html, className);
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	let section = html.slice(bounds.startTagEnd, bounds.endStart);
	const after = html.slice(bounds.endStart);
	let index = 0;
	section = section.replace(/<img\b[^>]*>/gi, (existingImg) => {
		const image = imageData[index++];
		if (!image) return existingImg;
		const classAttr = existingImg.match(/\bclass=(["'])(.*?)\1/i)?.[2] || "swiper-slide-image";
		const srcsetAttr = existingImg.match(/\bsrcset=(["'])(.*?)\1/i)?.[0] || "";
		const sizesAttr = existingImg.match(/\bsizes=(["'])(.*?)\1/i)?.[0] || "";
		const decodingAttr = existingImg.includes("decoding=") ? ` decoding="async"` : "";
		const loadingAttr = existingImg.includes("loading=") ? ` loading="lazy"` : "";
		const width = image.width ? ` width="${escapeHtml(image.width)}"` : "";
		const height = image.height ? ` height="${escapeHtml(image.height)}"` : "";
		const extraResponsiveAttrs = [srcsetAttr, sizesAttr].filter(Boolean).join(" ");
		return `<img alt="${escapeHtml(image.alt || "")}" class="${escapeHtml(
			classAttr,
		)}"${decodingAttr}${height}${loadingAttr}${extraResponsiveAttrs ? ` ${extraResponsiveAttrs}` : ""} src="${escapeHtml(
			image.src,
		)}"${width}/>`;
	});
	return before + section + after;
}

function portableTextInlineText(value: unknown): string {
	return stripTags(renderPortableTextContent(value)).trim();
}

function replaceFirstHrefInsideClass(html: string, className: string, href: unknown): string {
	const bounds = findElementBounds(html, className);
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	const section = html.slice(bounds.startTagEnd, bounds.endStart);
	const after = html.slice(bounds.endStart);
	return (
		before +
		section.replace(
			/(<a\b[^>]*\bhref=)(["'])(.*?)\2/i,
			`$1$2${escapeHtml(String(href || "#"))}$2`,
		) +
		after
	);
}

function renderMapEmbed(data: Record<string, unknown>): string {
	const locationName = String(data.location_name || "").trim();
	const addressText = portableTextInlineText(data.address);
	const mapLink = String(data.map_widget || data.map_url || "").trim();
	const query = encodeURIComponent(`Maico Audiological Services, ${addressText || locationName}`);
	const iframeSrc = `https://www.google.com/maps?q=${query}&output=embed`;
	return `<div class="astro-element-element astro-element-element-4abdbd9 astro-element-widget astro-element-widget-google_maps" data-e-type="widget" data-element_type="widget" data-id="4abdbd9" data-widget_type="google_maps.default"><div class="astro-element-widget-container"><div class="astro-element-custom-embed"><div class="local-google-map-widget" data-location="${escapeHtml(locationName)}"><iframe allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${escapeHtml(iframeSrc)}" title="Google map for ${escapeHtml(locationName)}"></iframe>${mapLink ? `<a class="local-google-map-link" href="${escapeHtml(mapLink)}" rel="noopener" target="_blank">Open ${escapeHtml(locationName)} in Google Maps</a>` : ""}</div></div></div></div>`;
}

function renderLocationGallery(data: Record<string, unknown>): string {
	const images = [1, 2, 3, 4, 5, 6]
		.map((index) => parseImageField(data[`location_image_${index}`]))
		.filter((image): image is EmDashImageLike => Boolean(image?.src));
	if (!images.length) return "";
	const figures = images
		.map((image, index) => {
			const width = image.width ? ` width="${escapeHtml(image.width)}"` : "";
			const height = image.height ? ` height="${escapeHtml(image.height)}"` : "";
			const src = escapeHtml(image.src);
			const alt = escapeHtml(image.alt || "");
			return `<figure class="gallery-item"><div class="gallery-icon landscape"><a data-astro-element-lightbox-slideshow="8172c8e" data-astro-element-lightbox-title="${alt || `Location image ${index + 1}`}" data-astro-element-open-lightbox="yes" href="${src}"><img alt="${alt}" class="attachment-full size-full" decoding="async"${height} loading="lazy" src="${src}"${width}/></a></div></figure>`;
		})
		.join("");
	return `<div class="astro-element-widget-container"><div class="astro-element-image-gallery"><div class="gallery galleryid-location gallery-columns-3 gallery-size-full" id="gallery-location">${figures}</div></div></div>`;
}

async function renderLocationTemplate(
	html: string,
	data: Record<string, unknown>,
	route: string,
	homepageData: Record<string, unknown> | null,
): Promise<string> {
	let next = replaceMeta(html, { ...data, title: data.h1_title }, route);
	next = replaceFirstInsideClass(next, "astro-element-element-7437c7e", "p", escapeHtml(data.hero_intro || ""));
	next = replaceFirstInsideClass(next, "astro-element-element-b9ef97d", "h1", escapeHtml(data.h1_title || ""));
	next = replaceFirstInsideClass(next, "astro-element-element-1917301", "h2", escapeHtml(data.location_name || ""));
	next = replaceFirstInsideClass(
		next,
		"astro-element-element-bf6d94b",
		"h2",
		escapeHtml(`Our Staff at ${data.location_name || ""}`),
	);
	next = replaceInnerByClass(
		next,
		"astro-element-element-600729f",
		`<div class="astro-element-widget-container"><h3 class="astro-element-heading-title astro-element-size-default"><a href="${escapeHtml(data.map_url || "#")}" rel="noopener" target="_blank">${escapeHtml(portableTextInlineText(data.address))}</a></h3> </div>`,
	);
	next = replaceInnerByClass(
		next,
		"astro-element-element-7a323de",
		`<div class="astro-element-widget-container"><h3 class="astro-element-heading-title astro-element-size-default"><a href="${escapeHtml(data.phone_number_url || "#")}">${escapeHtml(portableTextInlineText(data.phone_number))}</a></h3> </div>`,
	);
	next = replaceInnerByClass(
		next,
		"astro-element-element-c04eebe",
		`<div class="astro-element-widget-container">${escapeHtml(data.office_hours || "")}</div>`,
	);
	next = replaceFirstHrefInsideClass(next, "astro-element-element-bc84e98", data.phone_number_url);
	next = replaceFirstHrefInsideClass(next, "astro-element-element-bf1d32e", data.map_url);
	next = replaceInnerByClass(
		next,
		"astro-element-element-46629ce",
		`<div class="astro-element-widget-container">${renderPortableTextContent(data.location_body)}</div>`,
	);
	next = replaceImageInClass(next, "astro-element-element-aa83cd3", data.location_trust_badge_1);
	next = replaceImageInClass(next, "astro-element-element-3e7670d", data.location_trust_badge_2);
	next = replaceImageInClass(next, "astro-element-element-2b39537", data.featured_image);
	next = replaceInnerByClass(next, "astro-element-element-5a6d4bf", renderMapEmbed(data));
	const gallery = renderLocationGallery(data);
	if (gallery) next = replaceInnerByClass(next, "astro-element-element-8172c8e", gallery);
	const team = await getTeamEntries();
	next = renderTeamSectionsForLocation(next, team, String(data.location_name || ""));
	next = renderReusableHomepageFaqSection(next, homepageData);
	return next;
}

function splitHomepageIntroSections(value: unknown): HeadingGroup[] {
	if (!Array.isArray(value)) return [];
	const groups: HeadingGroup[] = [];
	let current: HeadingGroup | null = null;
	for (const block of value as PortableTextBlock[]) {
		if (isHeading(block, "h2")) {
			current = { heading: block, body: [] };
			groups.push(current);
			continue;
		}
		if (current) current.body.push(block);
	}
	return groups;
}

function renderHomepageFaqAccordion(value: unknown): string {
	if (!Array.isArray(value)) return "";
	const { groups } = splitIntoHeadingGroups(value as PortableTextBlock[], "h3");
	if (!groups.length) return "";
	const items = groups
		.map((group, index) => {
			const itemId = `e-n-accordion-item-home-${index}`;
			const openAttr = index === 0 ? ` open=""` : "";
			const expanded = index === 0 ? "true" : "false";
			const tabIndex = index === 0 ? "0" : "-1";
			return `<details class="e-n-accordion-item" id="${itemId}"${openAttr}>
<summary aria-controls="${itemId}" aria-expanded="${expanded}" class="e-n-accordion-item-title" data-accordion-index="${index + 1}" tabindex="${tabIndex}">
<span class="e-n-accordion-item-title-header"><h3 class="e-n-accordion-item-title-text"> ${headingText(group.heading)} </h3></span>
<span class="e-n-accordion-item-title-icon">
<span class="e-opened"><i aria-hidden="true" class="fas fa-minus"></i></span>
<span class="e-closed"><i aria-hidden="true" class="fas fa-plus"></i></span>
</span>
</summary>
<div aria-labelledby="${itemId}" class="astro-element-element astro-element-element-1f262445 e-con-full e-flex e-con e-child" data-e-type="container" data-element_type="container" data-id="1f262445" data-settings='{"background_background":"classic"}' role="region">
<div class="astro-element-element astro-element-element-3ce4c555 astro-element-widget astro-element-widget-text-editor" data-e-type="widget" data-element_type="widget" data-id="3ce4c555" data-widget_type="text-editor.default">
<div class="astro-element-widget-container">
${renderPortableTextBlocks(group.body)} </div>
</div>
</div>
</details>`;
		})
		.join("");
	return `<div class="astro-element-element astro-element-element-489d2816 astro-element-widget astro-element-widget-n-accordion" data-e-type="widget" data-element_type="widget" data-id="489d2816" data-settings='{"default_state":"expanded","max_items_expended":"one","n_accordion_animation_duration":{"unit":"ms","size":400,"sizes":[]}}' data-widget_type="nested-accordion.default">
<div class="astro-element-widget-container">
<div aria-label="Accordion. Open links with Enter or Space, close with Escape, and navigate with Arrow Keys" class="e-n-accordion">
${items}
</div>
</div>
</div>`;
}

function replaceFirstExistingTagInsideClass(
	html: string,
	className: string,
	tagNames: string[],
	inner: string,
): string {
	for (const tagName of tagNames) {
		const updated = replaceFirstInsideClassWithHtml(html, className, tagName, inner);
		if (updated !== html) return updated;
	}
	return html;
}

function renderHomepageAccordionFromExistingMarkup(
	html: string,
	className: string,
	value: unknown,
): string {
	if (!Array.isArray(value)) return html;
	const { groups } = splitIntoHeadingGroups(value as PortableTextBlock[], "h3");
	if (!groups.length) return html;

	const bounds = findElementBounds(html, className);
	if (!bounds) return html;

	const before = html.slice(0, bounds.startTagEnd);
	const section = html.slice(bounds.startTagEnd, bounds.endStart);
	const after = html.slice(bounds.endStart);
	let groupIndex = 0;
	const updatedSection = section.replace(
		/<details\b[^>]*\be-n-accordion-item\b[^>]*>[\s\S]*?<\/details>/gi,
		(itemHtml) => {
			const group = groups[groupIndex++];
			if (!group) return itemHtml;
			let item = itemHtml.replace(
				/(<[^>]+class=(["'])[^"']*\be-n-accordion-item-title-text\b[^"']*\2[^>]*>)([\s\S]*?)(<\/[^>]+>)/i,
				`$1 ${headingText(group.heading)} $4`,
			);
			item = replaceInnerWithinHtmlByClass(
				item,
				"astro-element-widget-text-editor",
				`<div class="astro-element-widget-container">
${renderPortableTextBlocks(group.body)} </div>`,
			);
			return item;
		},
	);
	return before + updatedSection + after;
}

async function getHomepageData(): Promise<Record<string, unknown> | null> {
	try {
		const { entry } = await getEmDashEntry("homepage", "home");
		return (entry?.data as unknown as Record<string, unknown>) || null;
	} catch {
		return null;
	}
}

function replaceBreadcrumbLast(html: string, title: string): string {
	return html.replace(
		/(<span[^>]*class="[^"]*\blast\b[^"]*"[^>]*>)([\s\S]*?)(<\/span>)/i,
		`$1${escapeHtml(title)}$3`,
	);
}

function replaceMeta(html: string, data: Record<string, unknown>, route: string): string {
	const title = escapeHtml(data.meta_title || data.title || "");
	const description = escapeHtml(data.meta_description || "");
	let next = html;
	if (title) {
		next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
		next = next.replace(
			/(<meta[^>]+property=["']og:title["'][^>]+content=["'])([^"']*)(["'][^>]*>)/i,
			`$1${title}$3`,
		);
		next = next.replace(
			/(<meta[^>]+name=["']twitter:title["'][^>]+content=["'])([^"']*)(["'][^>]*>)/i,
			`$1${title}$3`,
		);
	}
	if (description) {
		next = next.replace(
			/(<meta[^>]+name=["']description["'][^>]+content=["'])([^"']*)(["'][^>]*>)/i,
			`$1${description}$3`,
		);
		next = next.replace(
			/(<meta[^>]+property=["']og:description["'][^>]+content=["'])([^"']*)(["'][^>]*>)/i,
			`$1${description}$3`,
		);
		next = next.replace(
			/(<meta[^>]+name=["']twitter:description["'][^>]+content=["'])([^"']*)(["'][^>]*>)/i,
			`$1${description}$3`,
		);
	}
	next = next.replace(
		/(<link[^>]+rel=["']canonical["'][^>]+href=["'])([^"']*)(["'][^>]*>)/i,
		`$1${route}$3`,
	);
	return next;
}

function titleCaseSlug(value: string): string {
	return value
		.split("-")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function extractStaticPostCategory(html: string): string {
	const categoryMatches = [...html.matchAll(/\bcategory-([a-z0-9-]+)/gi)]
		.map((match) => match[1])
		.filter((category) => category && category !== "uncategorized");
	return categoryMatches[0] ? titleCaseSlug(categoryMatches[0]) : "";
}

function normalizeBlogHeroMetadata(html: string, categoryValue?: unknown): string {
	if (!html.includes("astro-element-widget-post-info")) return html;

	let next = html.replace(/\b(?:far|fas) fa-user-circle\b/g, "fas fa-circle-user");
	const category = String(categoryValue || extractStaticPostCategory(next) || "").trim();
	if (category && !next.includes("astro-element-repeater-item-category")) {
		const categoryItem = `<li class="astro-element-icon-list-item astro-element-repeater-item-category astro-element-inline-item"><span class="astro-element-icon-list-icon"><i aria-hidden="true" class="fas fa-tags"></i></span><span class="astro-element-icon-list-text astro-element-post-info__item astro-element-post-info__item--type-category">${escapeHtml(category)}</span></li>`;
		next = next.replace(
			/(<li[^>]*astro-element-repeater-item-43f5193[^>]*>[\s\S]*?<\/li>)/i,
			`$1${categoryItem}`,
		);
	}
	return next;
}

function parsePublishDate(value: unknown): number {
	if (value instanceof Date) return value.getTime();
	const raw = String(value || "").trim();
	const timestamp = Date.parse(raw);
	return Number.isFinite(timestamp) ? timestamp : 0;
}

function getEntrySlug(entry: EmDashEntryLike): string {
	const dataSlug = typeof entry.data?.slug === "string" ? entry.data.slug : "";
	const entrySlug = typeof entry.slug === "string" ? entry.slug : "";
	return (entrySlug || dataSlug).replace(/^\/+|\/+$/g, "");
}

function getEntryTitle(entry: EmDashEntryLike): string {
	return String(
		entry.data?.title ||
			entry.data?.blog_title ||
			entry.data?.name ||
			entry.data?.location_name ||
			"",
	).trim();
}

function renderRecentNewsArticles(entries: EmDashEntryLike[]): string {
	return entries
		.map((entry) => {
			const slug = getEntrySlug(entry);
			const title = getEntryTitle(entry);
			if (!slug || !title) return "";
			const safeTitle = escapeHtml(title);
			const safeHref = `/${escapeHtml(slug)}/`;
			const postClass = `astro-element-post astro-element-grid-item post-${escapeHtml(
				entry.id || slug,
			)} post type-post status-publish format-standard has-post-thumbnail hentry`;
			return `<article class="${postClass}" role="listitem">
<div class="astro-element-post__text">
<h3 class="astro-element-post__title">
<a href="${safeHref}">
				${safeTitle}			</a>
</h3>
</div>
</article>`;
		})
		.join("");
}

async function getLatestBlogPostEntries(limit = 5): Promise<EmDashEntryLike[]> {
	const result = await getEmDashCollection("blog_post", {
		status: "published",
		limit: 50,
	});
	if (result.error) return [];
	return (result.entries as unknown as EmDashEntryLike[])
		.filter((entry) => getEntryTitle(entry) && getEntrySlug(entry))
		.sort((a, b) => {
			const byDate =
				parsePublishDate(b.data?.publish_date) - parsePublishDate(a.data?.publish_date);
			if (byDate !== 0) return byDate;
			return String(b.data?.createdAt || "").localeCompare(String(a.data?.createdAt || ""));
		})
		.slice(0, limit);
}

async function renderDynamicRecentNewsArticles(html: string): Promise<string> {
	if (!html.includes("astro-element-element-569094f")) return html;
	const latestPosts = await getLatestBlogPostEntries();
	if (!latestPosts.length) return html;

	const recentBounds = findElementBounds(html, "astro-element-element-569094f");
	if (!recentBounds) return html;
	const before = html.slice(0, recentBounds.startTagEnd);
	const recentSection = html.slice(recentBounds.startTagEnd, recentBounds.endStart);
	const after = html.slice(recentBounds.endStart);
	const updatedSection = replaceInnerWithinHtmlByClass(
		recentSection,
		"astro-element-posts-container",
		renderRecentNewsArticles(latestPosts),
	);
	return before + updatedSection + after;
}

function renderBlogPostCardFromTemplate(template: string, entry: EmDashEntryLike): string {
	const data = entry.data || {};
	const slug = getEntrySlug(entry);
	const href = slug ? `/${escapeHtml(slug)}/` : "#";
	const title = escapeHtml(getEntryTitle(entry));
	const publishDate = escapeHtml(data.publish_date || "");
	const category = escapeHtml(data.category || "");
	let next = template.replace(
		/<a\b([^>]*)href=(["'])(.*?)\2([^>]*)>/gi,
		`<a$1href="${href}"$4>`,
	);
	next = replaceImageInClass(next, "astro-element-element-8c3f3d4", data.featured_image);
	next = replaceInnerByClass(
		next,
		"astro-element-element-effc8d9",
		`<div class="astro-element-widget-container">
<ul class="astro-element-inline-items astro-element-icon-list-items astro-element-post-info">
<li class="astro-element-icon-list-item astro-element-repeater-item-77abf86 astro-element-inline-item" itemprop="datePublished">
<span class="astro-element-icon-list-icon">
<i aria-hidden="true" class="fas fa-calendar"></i> </span>
<span class="astro-element-icon-list-text astro-element-post-info__item astro-element-post-info__item--type-date">
<time>${publishDate}</time> </span>
</li>
<li class="astro-element-icon-list-item astro-element-repeater-item-f504b9f astro-element-inline-item" itemprop="about">
<span class="astro-element-icon-list-icon">
<i aria-hidden="true" class="fas fa-tags"></i> </span>
<span class="astro-element-icon-list-text astro-element-post-info__item astro-element-post-info__item--type-terms">
<span class="astro-element-post-info__terms-list">
<span class="astro-element-post-info__terms-list-item">${category}</span> </span>
</span>
</li>
</ul>
</div>`,
	);
	next = replaceFirstExistingTagInsideClass(
		next,
		"astro-element-element-bd5b2e6",
		["h1", "h2", "h3", "h4"],
		title,
	);
	next = replaceFirstHrefInsideClass(next, "astro-element-element-704ba47", href);
	return next;
}

function replaceBlogPostCardsInsideExistingContainer(
	containerHtml: string,
	entries: EmDashEntryLike[],
): string {
	const cardBounds = findAllElementBoundsByClassAttribute(containerHtml, "astro-element-367");
	const templates = cardBounds.map((bounds) => containerHtml.slice(bounds.start, bounds.end));
	const cards = entries
		.map((entry, index) => {
			const template = templates[index] || templates[0];
			return template ? renderBlogPostCardFromTemplate(template, entry) : "";
		})
		.join("");
	if (!cardBounds.length) return containerHtml;
	const firstCard = cardBounds[0];
	const lastCard = cardBounds[cardBounds.length - 1];
	return containerHtml.slice(0, firstCard.start) + cards + containerHtml.slice(lastCard.end);
}

async function renderDynamicNewsArticlesSection(html: string): Promise<string> {
	if (!html.includes("astro-element-element-bc235fd")) return html;
	const latestPosts = await getLatestBlogPostEntries(4);
	if (!latestPosts.length) return html;
	const bounds = findElementBounds(html, "astro-element-element-bc235fd");
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	const section = html.slice(bounds.startTagEnd, bounds.endStart);
	const after = html.slice(bounds.endStart);
	const loopBounds = findFirstElementBoundsByClassAttribute(section, "astro-element-loop-container");
	if (!loopBounds) return html;
	const loopInner = section.slice(loopBounds.startTagEnd, loopBounds.endStart);
	const updatedLoopInner = replaceBlogPostCardsInsideExistingContainer(loopInner, latestPosts);
	const updatedSection =
		section.slice(0, loopBounds.startTagEnd) + updatedLoopInner + section.slice(loopBounds.endStart);
	return before + updatedSection + after;
}

function locationOrder(entry: EmDashEntryLike): number {
	const name = String(entry.data?.location_name || "");
	const order = ["Newport News, VA", "Chesapeake, VA", "Smithfield, VA"];
	const index = order.indexOf(name);
	return index === -1 ? 100 : index;
}

async function getLocationEntries(): Promise<EmDashEntryLike[]> {
	const result = await getEmDashCollection("locations", { status: "published", limit: 100 });
	if (result.error) return [];
	return (result.entries as unknown as EmDashEntryLike[])
		.filter((entry) => entry.data?.location_name)
		.sort(
			(a, b) =>
				locationOrder(a) - locationOrder(b) ||
				String(a.data?.location_name || "").localeCompare(String(b.data?.location_name || "")),
		);
}

function teamOrder(entry: EmDashEntryLike): number {
	const name = String(entry.data?.name || "");
	const order = [
		"Stephanie Howard, M.A., CCC-A",
		"Jennifer Flamini, H.I.S, CDP",
		"Tracey E. Hudson, Au.D., CCC-A",
	];
	const index = order.indexOf(name);
	return index === -1 ? 100 : index;
}

async function getTeamEntries(): Promise<EmDashEntryLike[]> {
	const result = await getEmDashCollection("team", { status: "published", limit: 100 });
	if (result.error) return [];
	return (result.entries as unknown as EmDashEntryLike[])
		.filter((entry) => entry.data?.name)
		.sort(
			(a, b) =>
				teamOrder(a) - teamOrder(b) ||
				String(a.data?.name || "").localeCompare(String(b.data?.name || "")),
		);
}

function entryMatchesLocation(entry: EmDashEntryLike, locationName: string): boolean {
	const haystack = String(entry.data?.location || "").toLowerCase();
	const normalized = locationName.toLowerCase();
	return Boolean(haystack && normalized && haystack.includes(normalized));
}

function renderTeamCard(entry: EmDashEntryLike, index: number, options: { carousel?: boolean } = {}): string {
	const data = entry.data || {};
	const image = parseImageField(data.featured_image);
	const slug = getEntrySlug(entry);
	const href = slug ? `/${escapeHtml(slug)}/` : "#";
	const name = escapeHtml(data.name || "");
	const title = escapeHtml(data.team_title || data.title || "");
	const location = escapeHtml(data.location || "");
	const slideAttrs = options.carousel
		? ` aria-roledescription="slide" class="astro-element astro-element-349 swiper-slide e-loop-item e-loop-item-${escapeHtml(entry.id || slug || String(index + 1))} post-${escapeHtml(entry.id || slug || String(index + 1))} team type-team status-publish hentry e-con e-child" role="group"`
		: ` class="astro-element astro-element-349 e-loop-item e-loop-item-${escapeHtml(entry.id || slug || String(index + 1))} post-${escapeHtml(entry.id || slug || String(index + 1))} team type-team status-publish hentry e-con e-child"`;
	const src = escapeHtml(image?.src || "");
	const alt = escapeHtml(image?.alt || data.name || "");
	const width = image?.width ? ` width="${escapeHtml(image.width)}"` : "";
	const height = image?.height ? ` height="${escapeHtml(image.height)}"` : "";
	return `<div${slideAttrs} data-astro-element-type="loop-item" data-id="${escapeHtml(entry.id || slug || String(index + 1))}">
<div class="astro-element-element astro-element-element-5a1d13c e-con-full e-flex e-con e-parent" data-e-type="container" data-element_type="container" data-id="5a1d13c">
<div class="astro-element-element astro-element-element-2704910 e-con-full e-flex e-con e-child" data-e-type="container" data-element_type="container" data-id="2704910">
<div class="astro-element-element astro-element-element-b422eb0 astro-element-widget astro-element-widget-theme-post-featured-image astro-element-widget-image" data-e-type="widget" data-element_type="widget" data-id="b422eb0" data-widget_type="theme-post-featured-image.default">
<div class="astro-element-widget-container">${src ? `<a href="${href}"><img alt="${alt}" class="attachment-full size-full" decoding="async"${height} loading="lazy" src="${src}"${width}/></a>` : ""}</div>
</div>
</div>
<div class="astro-element-element astro-element-element-40c6e71 e-con-full e-flex e-con e-child" data-e-type="container" data-element_type="container" data-id="40c6e71">
<div class="astro-element-element astro-element-element-cfaaa32 astro-element-widget astro-element-widget-theme-post-title astro-element-page-title astro-element-widget-heading" data-e-type="widget" data-element_type="widget" data-id="cfaaa32" data-widget_type="theme-post-title.default">
<div class="astro-element-widget-container"><h3 class="astro-element-heading-title astro-element-size-default"><a href="${href}">${name}</a></h3></div>
</div>
<div class="astro-element-element astro-element-element-7a9762c astro-element-widget astro-element-widget-heading" data-e-type="widget" data-element_type="widget" data-id="7a9762c" data-widget_type="heading.default">
<div class="astro-element-widget-container"><span class="astro-element-heading-title astro-element-size-default">${title}</span></div>
</div>
<div class="astro-element-element astro-element-element-1d84b99 astro-element-widget astro-element-widget-heading" data-e-type="widget" data-element_type="widget" data-id="1d84b99" data-widget_type="heading.default">
<div class="astro-element-widget-container"><span class="astro-element-heading-title astro-element-size-default">${location}</span></div>
</div>
<div class="astro-element-element astro-element-element-d66c23f astro-element-align-left astro-element-widget__width-auto astro-element-widget astro-element-widget-button" data-e-type="widget" data-element_type="widget" data-id="d66c23f" data-widget_type="button.default">
<div class="astro-element-widget-container"><div class="astro-element-button-wrapper"><a class="astro-element-button astro-element-button-link astro-element-size-sm" href="${href}"><span class="astro-element-button-content-wrapper"><span class="astro-element-button-icon"><i aria-hidden="true" class="fas fa-arrow-right"></i></span><span class="astro-element-button-text">Learn More</span></span></a></div></div>
</div>
</div>
</div>
</div>`;
}

function renderTeamCardFromTemplate(template: string, entry: EmDashEntryLike): string {
	const data = entry.data || {};
	const slug = getEntrySlug(entry);
	const href = slug ? `/${escapeHtml(slug)}/` : "#";
	const name = escapeHtml(data.name || "");
	const title = escapeHtml(data.team_title || data.title || "");
	const location = escapeHtml(data.location || "");
	let next = template.replace(
		/<a\b([^>]*)href=(["'])(.*?)\2([^>]*)>/gi,
		`<a$1href="${href}"$4>`,
	);
	next = replaceImageInClass(next, "astro-element-element-b422eb0", data.featured_image);
	next = replaceFirstExistingTagInsideClass(
		next,
		"astro-element-element-cfaaa32",
		["h1", "h2", "h3", "h4", "span"],
		`<a href="${href}">${name}</a>`,
	);
	next = replaceInnerByClass(
		next,
		"astro-element-element-7a9762c",
		`<div class="astro-element-widget-container"><span class="astro-element-heading-title astro-element-size-default">${title}</span></div>`,
	);
	next = replaceInnerByClass(
		next,
		"astro-element-element-1d84b99",
		`<div class="astro-element-widget-container"><span class="astro-element-heading-title astro-element-size-default">${location}</span></div>`,
	);
	return next;
}

function replaceTeamCardsInsideExistingContainer(
	containerHtml: string,
	entries: EmDashEntryLike[],
	options: { carousel?: boolean } = {},
): string {
	const cardBounds = findAllElementBoundsByClassAttribute(containerHtml, "astro-element-349");
	const templates = cardBounds.map((bounds) => containerHtml.slice(bounds.start, bounds.end));
	const cards = entries
		.map((entry, index) => {
			const template = templates[index] || templates[0];
			return template ? renderTeamCardFromTemplate(template, entry) : renderTeamCard(entry, index, options);
		})
		.join("");
	if (!cardBounds.length) return containerHtml + cards;
	const firstCard = cardBounds[0];
	const lastCard = cardBounds[cardBounds.length - 1];
	return containerHtml.slice(0, firstCard.start) + cards + containerHtml.slice(lastCard.end);
}

function replaceLoopCardsInClass(
	html: string,
	className: string,
	entries: EmDashEntryLike[],
	options: { carousel?: boolean } = {},
): string {
	const bounds = findElementBounds(html, className);
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	const section = html.slice(bounds.startTagEnd, bounds.endStart);
	const after = html.slice(bounds.endStart);
	const loopBounds = findFirstElementBoundsByClassAttribute(section, "astro-element-loop-container");
	if (!loopBounds) return html;
	const loopInner = section.slice(loopBounds.startTagEnd, loopBounds.endStart);
	const swiperBounds = findFirstElementBoundsByClassAttribute(loopInner, "swiper-wrapper");
	if (swiperBounds) {
		const swiperInner = loopInner.slice(swiperBounds.startTagEnd, swiperBounds.endStart);
		const updatedSwiperInner = replaceTeamCardsInsideExistingContainer(swiperInner, entries, options);
		const updatedLoopInner =
			loopInner.slice(0, swiperBounds.startTagEnd) +
			updatedSwiperInner +
			loopInner.slice(swiperBounds.endStart);
		const updatedSection =
			section.slice(0, loopBounds.startTagEnd) + updatedLoopInner + section.slice(loopBounds.endStart);
		return before + (updatedSection === section ? section : updatedSection) + after;
	}
	const updatedLoopInner = replaceTeamCardsInsideExistingContainer(loopInner, entries, options);
	const updated =
		section.slice(0, loopBounds.startTagEnd) + updatedLoopInner + section.slice(loopBounds.endStart);
	return before + (updated === section ? section : updated) + after;
}

function replaceTeamSectionsByClass(html: string, entries: EmDashEntryLike[], classNames: string[], carousel = false): string {
	let next = html;
	for (const className of classNames) {
		if (next.includes(className)) {
			next = replaceLoopCardsInClass(next, className, entries, { carousel });
		}
	}
	return next;
}

async function renderDynamicTeamSections(html: string): Promise<string> {
	if (
		!html.includes("astro-element-element-a2ad7ff") &&
		!html.includes("astro-element-element-73df30b")
	) {
		return html;
	}
	const team = await getTeamEntries();
	if (!team.length) return html;
	let next = replaceTeamSectionsByClass(html, team, ["astro-element-element-a2ad7ff"], false);
	next = replaceTeamSectionsByClass(next, team, ["astro-element-element-73df30b"], false);
	return next;
}

function renderTeamSectionsForLocation(html: string, team: EmDashEntryLike[], locationName: string): string {
	const matchingTeam = team.filter((entry) => entryMatchesLocation(entry, locationName));
	if (!matchingTeam.length) return html;
	return replaceTeamSectionsByClass(
		html,
		matchingTeam,
		[
			"astro-element-element-2a497b0",
			"astro-element-element-621fac7",
			"astro-element-element-fcda538",
			"astro-element-element-c92f774",
			"astro-element-element-77ae09a",
			"astro-element-element-53ad32c",
			"astro-element-element-7839299",
		],
		html.includes("astro-element-widget-loop-carousel"),
	);
}

function renderHomepageLocationButton(entry: EmDashEntryLike, index: number): string {
	const locationName = String(entry.data?.location_name || "").trim();
	if (!locationName) return "";
	const presetIds = ["c2148ad", "d681262", "5610691"];
	const elementId = presetIds[index] || `dynamic-location-${index + 1}`;
	const href = `/${escapeHtml(getEntrySlug(entry))}/`;
	const text = escapeHtml(locationName);
	return `<div class="astro-element-element astro-element-element-${elementId} astro-element-widget astro-element-widget-button" data-e-type="widget" data-element_type="widget" data-id="${elementId}" data-widget_type="button.default">
<div class="astro-element-widget-container">
<div class="astro-element-button-wrapper">
<a class="astro-element-button astro-element-button-link astro-element-size-sm" href="${href}">
<span class="astro-element-button-content-wrapper">
<span class="astro-element-button-icon">
<i aria-hidden="true" class="fas fa-map-marker-alt"></i> </span>
<span class="astro-element-button-text">${text}</span>
</span>
</a>
</div>
</div>
</div>`;
}

async function renderDynamicHomepageLocationButtons(html: string): Promise<string> {
	if (!html.includes("astro-element-element-d4a9893")) return html;
	const locations = await getLocationEntries();
	if (!locations.length) return html;
	return replaceInnerByClass(
		html,
		"astro-element-element-d4a9893",
		locations.map((entry, index) => renderHomepageLocationButton(entry, index)).join(""),
	);
}

function renderExistingLocationCardFromData(cardHtml: string, data: Record<string, unknown>): string {
	let next = replaceFirstInsideClass(cardHtml, "astro-element-element-1917301", "h2", escapeHtml(data.location_name || ""));
	next = replaceInnerByClass(
		next,
		"astro-element-element-600729f",
		`<div class="astro-element-widget-container"><h3 class="astro-element-heading-title astro-element-size-default"><a href="${escapeHtml(data.map_url || "#")}" rel="noopener" target="_blank">${escapeHtml(portableTextInlineText(data.address))}</a></h3> </div>`,
	);
	next = replaceInnerByClass(
		next,
		"astro-element-element-7a323de",
		`<div class="astro-element-widget-container"><h3 class="astro-element-heading-title astro-element-size-default"><a href="${escapeHtml(data.phone_number_url || "#")}">${escapeHtml(portableTextInlineText(data.phone_number))}</a></h3> </div>`,
	);
	next = replaceInnerByClass(
		next,
		"astro-element-element-c04eebe",
		`<div class="astro-element-widget-container">${escapeHtml(data.office_hours || "")}</div>`,
	);
	next = replaceFirstHrefInsideClass(next, "astro-element-element-bf1d32e", data.map_url);
	next = replaceInnerByClass(next, "astro-element-element-5a6d4bf", renderMapEmbed(data));
	return next;
}

async function renderDynamicLocationTabs(html: string): Promise<string> {
	if (!html.includes("astro-element-element-2724809")) return html;
	const locations = await getLocationEntries();
	if (!locations.length) return html;
	const team = await getTeamEntries();
	const bounds = findElementBounds(html, "astro-element-element-2724809");
	if (!bounds) return html;
	let section = html.slice(bounds.start, bounds.end);

	let titleIndex = 0;
	section = section.replace(
		/(<span class="e-n-tab-title-text">)([\s\S]*?)(<\/span>)/g,
		(full, before: string, _oldTitle: string, after: string) => {
			const location = locations[titleIndex++];
			if (!location) return full;
			return `${before}
				${escapeHtml(location.data?.location_name || "")}			${after}`;
		},
	);

	const chunks = section.split(/(?=<div class="astro-element astro-element-540\b)/);
	const rebuilt = chunks
		.map((chunk, index) => {
			if (index === 0) return chunk;
			const location = locations[index - 1];
			if (!location?.data) return chunk;
			const locationName = String(location.data.location_name || "");
			return renderTeamSectionsForLocation(
				renderExistingLocationCardFromData(chunk, location.data),
				team,
				locationName,
			);
		})
		.join("");

	return html.slice(0, bounds.start) + rebuilt + html.slice(bounds.end);
}

function cleanSitemapTitle(value: unknown, route: string): string {
	let title = String(value || "").trim();
	title = title
		.replace(/\s*[|]\s*Maico Audiological Services\s*$/i, "")
		.replace(/\s*[-]\s*Maico Audiological Services\s*$/i, "")
		.trim();
	if (route === "/" && (!title || /audiologists?\s*&?\s*hearing aids/i.test(title))) {
		return "Home Page";
	}
	return title || titleCaseSlug(route.replace(/^\/+|\/+$/g, "").split("/").pop() || "home");
}

function routeFromEntrySlug(entry: EmDashEntryLike): string {
	const slug = getEntrySlug(entry);
	return slug ? `/${slug}/` : "/";
}

function renderSitemapList(items: Array<{ href: string; title: string }>, listClass: string): string {
	return `<ul class="${listClass} main">${items
		.map(
			(item, index) =>
				`<li class="sitemap-item page_item page-item-${index + 1}"><a href="${escapeHtml(
					item.href,
				)}">${escapeHtml(item.title)}</a></li>`,
		)
		.join("")}</ul>`;
}

function renderSitemapSection(title: string, items: Array<{ href: string; title: string }>, listClass: string): string {
	return `<div class="simple-sitemap-wrap"><h3 class="post-type">${escapeHtml(title)}</h3>${renderSitemapList(
		items,
		listClass,
	)}</div>`;
}

function appendSitemapSection(html: string, sectionHtml: string, listClass: string): string {
	if (html.includes(listClass)) return html;
	const bounds = findElementBounds(html, "simple-sitemap-container");
	if (!bounds) return html;
	return html.slice(0, bounds.endStart) + sectionHtml + html.slice(bounds.endStart);
}

const legacyStaticSitemapPages = [
	{ href: "/", title: "Home Page" },
	{ href: "/book-appointment/", title: "Book Appointment" },
	{ href: "/news/", title: "News" },
	{
		href: "/microsuction-vs-irrigation-which-ear-wax-removal-method-is-right-for-you/",
		title: "Microsuction vs Irrigation: Which Ear Wax Removal Method Is Right for You?",
	},
	{ href: "/sitemap/", title: "Sitemap" },
	{ href: "/thank-you/", title: "Thank You" },
	{ href: "/thank-you-for-contacting-us/", title: "Thank you for contacting us" },
];

const legacyStaticHearingAidBrands = [
	{ href: "/hearing-aid/phonak/", title: "Phonak Hearing Aids" },
	{ href: "/hearing-aid/oticon/", title: "Oticon Hearing Aids" },
	{ href: "/hearing-aid/resound/", title: "ReSound Hearing Aids" },
	{ href: "/hearing-aid/starkey/", title: "Starkey Hearing Aids" },
	{ href: "/hearing-aid/unitron/", title: "Unitron Hearing Aids" },
	{ href: "/hearing-aid/widex/", title: "Widex Hearing Aids" },
	{ href: "/hearing-aid/signia/", title: "Signia Hearing Aids" },
];

async function getCollectionEntries(collection: string): Promise<EmDashEntryLike[]> {
	const result = await getEmDashCollection(collection, {
		status: "published",
		limit: 200,
	});
	if (result.error) return [];
	return result.entries as EmDashEntryLike[];
}

async function renderDynamicSitemap(html: string, route: string): Promise<string> {
	if (route !== "/sitemap/" || !html.includes("simple-sitemap-container")) return html;

	const [
		services,
		hearingAidBrands,
		utilityPages,
		aboutPages,
		contactPages,
		locations,
		team,
		blogPosts,
	] = await Promise.all([
		getCollectionEntries("services"),
		getCollectionEntries("hearing_aid_brands"),
		getCollectionEntries("utility_pages"),
		getCollectionEntries("about"),
		getCollectionEntries("contact_page"),
		getCollectionEntries("locations"),
		getCollectionEntries("team"),
		getCollectionEntries("blog_post"),
	]);

	const hasDynamicSitemapEntries = [
		services,
		hearingAidBrands,
		utilityPages,
		aboutPages,
		contactPages,
		locations,
		team,
		blogPosts,
	].some((entries) => entries.length > 0);
	if (!hasDynamicSitemapEntries) {
		return appendSitemapSection(
			html,
			renderSitemapSection("Hearing Aids", legacyStaticHearingAidBrands, "simple-sitemap-hearing-aid"),
			"simple-sitemap-hearing-aid",
		);
	}

	const pageItems = [
		...legacyStaticSitemapPages,
		...services.map((entry) => ({
			href: routeFromEntrySlug(entry),
			title: cleanSitemapTitle(entry.data?.title, routeFromEntrySlug(entry)),
		})),
		...utilityPages.map((entry) => ({
			href: routeFromEntrySlug(entry),
			title: cleanSitemapTitle(entry.data?.title, routeFromEntrySlug(entry)),
		})),
		...aboutPages.map((entry) => ({
			href: routeFromEntrySlug(entry),
			title: cleanSitemapTitle(entry.data?.title, routeFromEntrySlug(entry)),
		})),
		...contactPages.map((entry) => ({
			href: routeFromEntrySlug(entry),
			title: "Contact",
		})),
		...locations.map((entry) => ({
			href: routeFromEntrySlug(entry),
			title: cleanSitemapTitle(entry.data?.location_name, routeFromEntrySlug(entry)),
		})),
		...team.map((entry) => ({
			href: routeFromEntrySlug(entry),
			title: cleanSitemapTitle(entry.data?.name, routeFromEntrySlug(entry)),
		})),
	];

	const uniquePages = [...new Map(pageItems.map((item) => [item.href, item])).values()].sort((a, b) =>
		a.title.localeCompare(b.title),
	);
	const hearingAidBrandItems = (
		hearingAidBrands.length
			? hearingAidBrands.map((entry) => ({
					href: routeFromEntrySlug(entry),
					title: cleanSitemapTitle(entry.data?.title, routeFromEntrySlug(entry)),
				}))
			: legacyStaticHearingAidBrands
	)
		.filter((item) => item.href && item.title)
		.sort((a, b) => a.title.localeCompare(b.title));
	const postItems = blogPosts
		.map((entry) => ({
			href: routeFromEntrySlug(entry),
			title: cleanSitemapTitle(entry.data?.title, routeFromEntrySlug(entry)),
		}))
		.filter((item) => item.href && item.title)
		.sort((a, b) => a.title.localeCompare(b.title));

	const sitemapHtml = `${renderSitemapSection(
		"Pages",
		uniquePages,
		"simple-sitemap-page",
	)}${renderSitemapSection(
		"Hearing Aids",
		hearingAidBrandItems,
		"simple-sitemap-hearing-aid",
	)}${renderSitemapSection(
		"Posts",
		postItems,
		"simple-sitemap-post",
	)}`;
	return replaceInnerByClass(html, "simple-sitemap-container", sitemapHtml) + "";
}

function renderInternalTemplate(
	html: string,
	data: Record<string, unknown>,
	route: string,
	options: { mode: InternalContentMode },
): string {
	let next = replaceMeta(html, data, route);
	const title = String(data.title || "");
	next = replaceFirstInsideClass(next, "astro-element-element-02e5a91", "h1", escapeHtml(title));
	next = replaceBreadcrumbLast(next, title);
	next = replaceInnerByClass(
		next,
		"astro-element-element-23d0c19",
		options.mode === "accordion"
			? renderInternalPortableTextContent(data.content)
			: options.mode === "divider"
				? renderInternalDividerOnlyPortableTextContent(data.content)
				: renderInternalFlatPortableTextContent(data.content),
	);
	return next;
}

function renderBlogTemplate(html: string, data: Record<string, unknown>, route: string): string {
	let next = replaceMeta(html, data, route);
	const title = String(data.title || "");
	next = replaceFirstInsideClass(next, "astro-element-element-3d35e74", "h1", escapeHtml(title));
	next = replaceBreadcrumbLast(next, title);
	next = replaceInnerByClass(
		next,
		"astro-element-widget-theme-post-content",
		`<div class="astro-element-widget-container">${renderPortableTextContent(data.content)}</div>`,
	);
	next = next.replace(
		/(<li[^>]*astro-element-repeater-item-bece311[^>]*>[\s\S]*?<time[^>]*>)([\s\S]*?)(<\/time>[\s\S]*?<\/li>)/i,
		`$1${escapeHtml(data.publish_date)}$3`,
	);
	next = next.replace(
		/(<li[^>]*astro-element-repeater-item-43f5193[^>]*>[\s\S]*?<span[^>]*astro-element-icon-list-text[^>]*>)([\s\S]*?)(<\/span>[\s\S]*?<\/li>)/i,
		`$1${escapeHtml(data.author)}$3`,
	);
	return normalizeBlogHeroMetadata(next, data.category);
}

function renderContactTemplate(html: string, data: Record<string, unknown>, route: string): string {
	let next = replaceMeta(html, { ...data, title: data.meta_title || "Contact" }, route);
	const blocks = Array.isArray(data.content_body) ? (data.content_body as PortableTextBlock[]) : [];
	const firstContentHeading = blocks.find((block) => isAnyHeading(block));
	const bodyBlocks = firstContentHeading
		? blocks.filter((block) => block !== firstContentHeading)
		: blocks;

	if (firstContentHeading) {
		next = replaceFirstInsideClass(
			next,
			"astro-element-element-1db5aae",
			"h2",
			headingText(firstContentHeading),
		);
	}

	if (bodyBlocks.length || typeof data.content_body === "string") {
		next = replaceInnerByClass(
			next,
			"astro-element-element-584d815",
			`<div class="astro-element-widget-container">${renderPortableTextContent(
				typeof data.content_body === "string" ? data.content_body : bodyBlocks,
			)} </div>`,
		);
	}

	return next;
}

function renderAboutTemplate(html: string, data: Record<string, unknown>, route: string): string {
	let next = replaceMeta(html, data, route);
	const title = String(data.title || "");
	next = replaceFirstInsideClass(next, "astro-element-element-b0734d9", "h1", escapeHtml(title));
	next = replaceBreadcrumbLast(next, title);
	next = replaceInnerByClass(
		next,
		"astro-element-element-57f437f2",
		`<div class="astro-element-widget-container">${renderPortableTextContent(data.content)}</div>`,
	);
	next = replaceImageInClass(next, "astro-element-element-783e638", data.featured_image);
	return next;
}

async function renderTeamTemplate(
	html: string,
	data: Record<string, unknown>,
	route: string,
	homepageData: Record<string, unknown> | null,
): Promise<string> {
	let next = replaceMeta(html, { ...data, title: data.name }, route);
	const name = escapeHtml(data.name || "");
	const title = escapeHtml(data.team_title || data.title || "");
	for (const className of [
		"astro-element-element-4387623",
		"astro-element-element-d36683e",
		"astro-element-element-2184d99",
	]) {
		next = replaceFirstInsideClass(next, className, "h1", name);
	}
	for (const className of [
		"astro-element-element-117119c",
		"astro-element-element-b2d1dec",
		"astro-element-element-03c2f4b",
	]) {
		next = replaceFirstInsideClass(next, className, "h2", title);
	}
	for (const className of [
		"astro-element-element-bf08b70",
		"astro-element-element-b0d2f9a",
		"astro-element-element-b7d46cb",
	]) {
		next = replaceInnerByClass(
			next,
			className,
			`<div class="astro-element-widget-container">${renderPortableTextContent(data.biography)}</div>`,
		);
	}
	for (const className of [
		"astro-element-element-4361497",
		"astro-element-element-c5f074b",
		"astro-element-element-bbbf869",
	]) {
		next = replaceImageInClass(next, className, data.featured_image);
	}
	next = replaceBreadcrumbLast(next, String(data.name || ""));
	next = await renderDynamicTeamSections(next);
	next = renderReusableHomepageFaqSection(next, homepageData);
	return next;
}

function renderHomepageTemplate(html: string, data: Record<string, unknown>): string {
	let next = html;
	next = replaceFirstInsideClassWithHtml(
		next,
		"astro-element-element-bde6a98",
		"p",
		renderTextWithBreaks(data.hero_intro),
	);
	next = replaceFirstInsideClass(
		next,
		"astro-element-element-e66b37e",
		"h1",
		escapeHtml(data.intro_section_title || ""),
	);

	const introSections = splitHomepageIntroSections(data.intro_body);
	if (introSections[0]) {
		next = replaceFirstInsideClass(
			next,
			"astro-element-element-adc2d42",
			"h2",
			headingText(introSections[0].heading),
		);
		next = replaceInnerByClass(
			next,
			"astro-element-element-dfec2ac",
			`<div class="astro-element-widget-container">${renderPortableTextBlocks(
				introSections[0].body,
			)} </div>`,
		);
	}
	if (introSections[1]) {
		next = replaceFirstInsideClass(
			next,
			"astro-element-element-dabee58",
			"h2",
			headingText(introSections[1].heading),
		);
		next = replaceInnerByClass(
			next,
			"astro-element-element-0992367",
			`<div class="astro-element-widget-container">${renderPortableTextBlocks(
				introSections[1].body,
			)} </div>`,
		);
	}

	next = replaceImageInClass(next, "astro-element-element-ce4fe2d", data.badge_1);
	next = replaceImageInClass(next, "astro-element-element-b3d020b", data.badge_2);
	next = replaceImageInClass(next, "astro-element-element-f995dfc", data.badge_3);
	next = replaceImageInClass(
		next,
		"astro-element-element-bc2b857",
		data.audiology_services_featured_image,
	);
	next = renderHomepageAccordionFromExistingMarkup(
		next,
		"astro-element-element-ebe9a8f",
		data.audiology_services_body,
	);
	next = replaceImageInClass(
		next,
		"astro-element-element-87db981",
		data.hearing_aids_protection_solutions_image,
	);
	next = renderHomepageAccordionFromExistingMarkup(
		next,
		"astro-element-element-224ec4f",
		data.hearing_aids_protection_solutions_body,
	);
	next = replaceImagesInClass(
		next,
		"astro-element-element-810fc70",
		[1, 2, 3, 4, 5, 6, 7].map((index) => data[`hearing_aid_brand_image_${index}`]),
	);

	next = replaceFirstInsideClass(
		next,
		"astro-element-element-49a3649e",
		"h2",
		escapeHtml(data.testimonial_section_title || ""),
	);
	next = replaceInnerByClass(
		next,
		"astro-element-element-1c18e3c6",
		`<div class="astro-element-widget-container"><p>${escapeHtml(data.testimonial_eyebrow || "")}</p> </div>`,
	);

	next = replaceFirstInsideClass(
		next,
		"astro-element-element-73b85cb",
		"h2",
		escapeHtml(data.faq_eyebrow || ""),
	);
	next = replaceFirstInsideClass(
		next,
		"astro-element-element-7ee0e45",
		"h2",
		escapeHtml(data.faq_section_title || ""),
	);
	next = replaceInnerByClass(
		next,
		"astro-element-element-70190f28",
		`<div class="astro-element-widget-container">${renderPortableTextContent(data.faq_description)} </div>`,
	);
	const faqAccordion = renderHomepageFaqAccordion(data.faq_content);
	if (faqAccordion) {
		next = replaceInnerByClass(next, "astro-element-element-ab46a59", faqAccordion);
	}

	return next;
}

function renderReusableHomepageFaqSection(
	html: string,
	homepageData: Record<string, unknown> | null,
): string {
	if (
		!homepageData ||
		(!html.includes("astro-element-element-9eb992f") &&
			!html.includes("astro-element-element-65d2079"))
	) {
		return html;
	}
	const homepageShell = getStaticPageHtml("/");
	if (!homepageShell) return html;
	const renderedHomepage = renderHomepageTemplate(homepageShell, homepageData);
	const faqBounds = findElementBounds(renderedHomepage, "astro-element-element-3950689");
	const targetBounds =
		findElementBounds(html, "astro-element-element-9eb992f") ||
		findElementBounds(html, "astro-element-element-65d2079");
	if (!faqBounds || !targetBounds) return html;
	const faqSection = renderedHomepage.slice(faqBounds.start, faqBounds.end);
	const normalizedFaqSection = faqSection.replace(
		/(<div[^>]*\bclass=(["'])(?=[^"']*\bastro-element-element-3950689\b)([^"']*)\2[^>]*)(>)/i,
		(full, before: string, quote: string, classes: string, after: string) => {
			if (/\blocal-reusable-faq-clean\b/.test(classes)) return full;
			return before.replace(`class=${quote}${classes}${quote}`, `class=${quote}${classes} local-reusable-faq-clean${quote}`) + after;
		},
	);
	const withFaq =
		html.slice(0, targetBounds.start) + normalizedFaqSection + html.slice(targetBounds.end);
	return ensureStylesheetFromSource(withFaq, homepageShell, "post-150-");
}

function ensureStylesheetFromSource(html: string, sourceHtml: string, hrefNeedle: string): string {
	if (html.includes(hrefNeedle)) return html;
	const sourceLink = sourceHtml.match(
		new RegExp(`<link\\b[^>]*rel=(["'])stylesheet\\1[^>]*href=(["'])[^"']*${hrefNeedle}[^"']*\\2[^>]*>`, "i"),
	)?.[0] || sourceHtml.match(
		new RegExp(`<link\\b[^>]*href=(["'])[^"']*${hrefNeedle}[^"']*\\1[^>]*rel=(["'])stylesheet\\2[^>]*>`, "i"),
	)?.[0];
	if (!sourceLink) return html;
	return html.replace("</head>", `${sourceLink}\n</head>`);
}

function renderReusableHomepageSourceSections(
	html: string,
	homepageData: Record<string, unknown> | null,
): string {
	if (!homepageData) return html;
	const sourceClasses = [
		"astro-element-element-a16b6f2",
		"astro-element-element-bc5b656",
		"astro-element-element-c152dff",
	];
	if (!sourceClasses.some((className) => html.includes(className))) return html;
	const homepageShell = getStaticPageHtml("/");
	if (!homepageShell) return html;
	const renderedHomepage = renderHomepageTemplate(homepageShell, homepageData);
	let next = html;
	for (const className of sourceClasses) {
		const sourceBounds = findElementBounds(renderedHomepage, className);
		const targetBounds = findElementBounds(next, className);
		if (!sourceBounds || !targetBounds) continue;
		const sourceSection = renderedHomepage.slice(sourceBounds.start, sourceBounds.end);
		next = next.slice(0, targetBounds.start) + sourceSection + next.slice(targetBounds.end);
	}
	return next;
}

export function normalizeMojibake(html: string): string {
	return html
		.replaceAll("\u00e2\u20ac\u2122", "'")
		.replaceAll("\u00e2\u20ac\u02dc", "'")
		.replaceAll("\u00e2\u20ac\u0153", '"')
		.replaceAll("\u00e2\u20ac\u009d", '"')
		.replaceAll("\u00e2\u20ac\u201c", "-")
		.replaceAll("\u00e2\u20ac\u201d", "-")
		.replaceAll("\u00c2\u00bb", "\u00bb")
		.replaceAll("\u00c2\u00a9", "\u00a9")
		.replaceAll("\u00c2\u00ae", "\u00ae")
		.replaceAll("\u00c2\u00a0", " ")
		.replaceAll("\u00c2", "");
}

function finalizeRenderedHtml(html: string, appointmentHref: string): string {
	return normalizeMojibake(renderHeaderMenuTweaks(renderSitewideAppointmentLinks(html, appointmentHref)));
}

export async function getRenderedContentPageHtml(route: string): Promise<string | undefined> {
	const staticHtml = getStaticPageHtml(route);
	if (!staticHtml) return undefined;
	const homepageData = await getHomepageData();
	const appointmentHref = normalizeHref(homepageData?.hero_cta);
	const config = contentRouteMap[route as keyof typeof contentRouteMap] as
		| ContentRouteConfig
		| undefined;
	if (!config) {
		const pageHtml = route === "/" && homepageData ? renderHomepageTemplate(staticHtml, homepageData) : staticHtml;
		const metadataHtml = normalizeBlogHeroMetadata(pageHtml);
		const sitemapHtml = await renderDynamicSitemap(metadataHtml, route);
		const recentHtml = await renderDynamicRecentNewsArticles(sitemapHtml);
		const locationButtonsHtml = await renderDynamicHomepageLocationButtons(recentHtml);
		const locationTabsHtml = await renderDynamicLocationTabs(locationButtonsHtml);
		const teamHtml = await renderDynamicTeamSections(locationTabsHtml);
		const newsHtml = await renderDynamicNewsArticlesSection(teamHtml);
		const reusableHtml = renderReusableHomepageSourceSections(newsHtml, homepageData);
		return finalizeRenderedHtml(reusableHtml, appointmentHref);
	}

	let { entry } = await getEmDashEntry(config.collection, config.slug);
	if (!entry && route === "/insurance-and-billing-faqs/") {
		({ entry } = await getEmDashEntry(config.collection, "insurance"));
	}
	if (!entry) {
		const recentHtml = await renderDynamicRecentNewsArticles(staticHtml);
		const locationButtonsHtml = await renderDynamicHomepageLocationButtons(recentHtml);
		const locationTabsHtml = await renderDynamicLocationTabs(locationButtonsHtml);
		const teamHtml = await renderDynamicTeamSections(locationTabsHtml);
		const newsHtml = await renderDynamicNewsArticlesSection(teamHtml);
		const reusableHtml = renderReusableHomepageSourceSections(newsHtml, homepageData);
		return finalizeRenderedHtml(reusableHtml, appointmentHref);
	}
	const data = entry.data as unknown as Record<string, unknown>;
	const templateHtml =
		config.template === "team"
			? getStaticPageHtml("/hearing-instrument-specialist/jenny-flamini/") || staticHtml
			: staticHtml;
	const rendered = config.template === "blog"
		? renderBlogTemplate(templateHtml, data, route)
		: config.template === "location"
			? await renderLocationTemplate(templateHtml, data, route, homepageData)
			: config.template === "team"
				? await renderTeamTemplate(templateHtml, data, route, homepageData)
				: config.template === "contact"
					? renderContactTemplate(templateHtml, data, route)
					: config.template === "about"
						? renderAboutTemplate(templateHtml, data, route)
				: renderInternalTemplate(templateHtml, data, route, {
				mode:
					config.collection === "services"
						? "accordion"
						: config.collection === "hearing_aid_brands"
							? "divider"
							: "flat",
				});
	const recentHtml = await renderDynamicRecentNewsArticles(rendered);
	const locationButtonsHtml = await renderDynamicHomepageLocationButtons(recentHtml);
	const locationTabsHtml = await renderDynamicLocationTabs(locationButtonsHtml);
	const teamHtml = await renderDynamicTeamSections(locationTabsHtml);
	const newsHtml = await renderDynamicNewsArticlesSection(teamHtml);
	const reusableHtml = renderReusableHomepageSourceSections(newsHtml, homepageData);
	return finalizeRenderedHtml(reusableHtml, appointmentHref);
}
