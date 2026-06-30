import { getEmDashCollection } from "emdash";

import { getRenderedContentPageHtml, normalizeMojibake } from "../../lib/render-content-page";

export const prerender = false;
export const cacheHint = 3600;

type Entry = {
	slug?: string | null;
	data?: Record<string, unknown>;
};

function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function getRoute(entry: Entry): string {
	const slug = String(entry.slug || "").replace(/^\/+|\/+$/g, "");
	return slug ? `/${slug}/` : "/";
}

function getTitle(entry: Entry): string {
	return String(entry.data?.title || entry.data?.blog_title || entry.slug || "Untitled");
}

function getPostDate(entry: Entry): string {
	return String(entry.data?.publish_date || entry.data?.publishDate || "");
}

function getCategory(entry: Entry): string {
	return String(entry.data?.category || "");
}

function getTimestamp(entry: Entry): number {
	const time = Date.parse(getPostDate(entry));
	return Number.isFinite(time) ? time : 0;
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
	const bounds = findFirstElementBoundsByClassAttribute(html, className);
	if (!bounds) return html;
	return html.slice(0, bounds.startTagEnd) + inner + html.slice(bounds.endStart);
}

function replaceFirstExistingTagInsideClass(
	html: string,
	className: string,
	tagNames: string[],
	inner: string,
): string {
	const bounds = findFirstElementBoundsByClassAttribute(html, className);
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	let section = html.slice(bounds.startTagEnd, bounds.endStart);
	const after = html.slice(bounds.endStart);
	for (const tagName of tagNames) {
		const pattern = new RegExp(`(<${tagName}[^>]*>)([\\s\\S]*?)(</${tagName}>)`, "i");
		if (!pattern.test(section)) continue;
		section = section.replace(pattern, `$1${inner}$3`);
		return before + section + after;
	}
	return html;
}

function replaceFirstHrefInsideClass(html: string, className: string, href: string): string {
	const bounds = findFirstElementBoundsByClassAttribute(html, className);
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	const section = html.slice(bounds.startTagEnd, bounds.endStart).replace(
		/<a\b([^>]*)href=(["'])(.*?)\2([^>]*)>/i,
		`<a$1href="${escapeHtml(href)}"$4>`,
	);
	const after = html.slice(bounds.endStart);
	return before + section + after;
}

type ImageLike = {
	src?: string;
	alt?: string;
	width?: number | string | null;
	height?: number | string | null;
	meta?: {
		storageKey?: string;
	};
};

function parseImageField(value: unknown): ImageLike | null {
	if (!value) return null;
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value) as ImageLike;
			return parsed && typeof parsed === "object" ? parsed : null;
		} catch {
			return null;
		}
	}
	if (typeof value === "object") {
		const image = value as ImageLike;
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
	const bounds = findFirstElementBoundsByClassAttribute(html, className);
	if (!bounds) return html;
	const before = html.slice(0, bounds.startTagEnd);
	const section = html.slice(bounds.startTagEnd, bounds.endStart).replace(
		/<img\b[^>]*>/i,
		`<img alt="${escapeHtml(imageData.alt || "")}" class="attachment-large size-large" decoding="async" height="${escapeHtml(
			imageData.height || 400,
		)}" loading="lazy" src="${escapeHtml(imageData.src)}" width="${escapeHtml(imageData.width || 800)}"/>`,
	);
	const after = html.slice(bounds.endStart);
	return before + section + after;
}

function renderBlogCardFromHomepageTemplate(template: string, entry: Entry): string {
	const href = getRoute(entry);
	let next = template.replace(
		/<a\b([^>]*)href=(["'])(.*?)\2([^>]*)>/gi,
		`<a$1href="${escapeHtml(href)}"$4>`,
	);
	next = replaceImageInClass(next, "astro-element-element-8c3f3d4", entry.data?.featured_image);
	next = replaceInnerByClass(
		next,
		"astro-element-element-effc8d9",
		`<div class="astro-element-widget-container">
<ul class="astro-element-inline-items astro-element-icon-list-items astro-element-post-info">
<li class="astro-element-icon-list-item astro-element-repeater-item-77abf86 astro-element-inline-item" itemprop="datePublished">
<span class="astro-element-icon-list-icon">
<i aria-hidden="true" class="fas fa-calendar"></i> </span>
<span class="astro-element-icon-list-text astro-element-post-info__item astro-element-post-info__item--type-date">
<time>${escapeHtml(getPostDate(entry))}</time> </span>
</li>
<li class="astro-element-icon-list-item astro-element-repeater-item-f504b9f astro-element-inline-item" itemprop="about">
<span class="astro-element-icon-list-icon">
<i aria-hidden="true" class="fas fa-tags"></i> </span>
<span class="astro-element-icon-list-text astro-element-post-info__item astro-element-post-info__item--type-terms">
<span class="astro-element-post-info__terms-list">
<span class="astro-element-post-info__terms-list-item">${escapeHtml(getCategory(entry))}</span> </span>
</span>
</li>
</ul>
</div>`,
	);
	next = replaceFirstExistingTagInsideClass(
		next,
		"astro-element-element-bd5b2e6",
		["h1", "h2", "h3", "h4"],
		escapeHtml(getTitle(entry)),
	);
	next = replaceFirstHrefInsideClass(next, "astro-element-element-704ba47", href);
	return next;
}

function forceSingleColumnNewsGrid(section: string): string {
	return section
		.replace(/\bastro-element-grid-2\b/g, "astro-element-grid-1")
		.replace(/"columns"\s*:\s*2/g, '"columns":1')
		.replace(
			/(<div class="[^"]*\bastro-element-widget-loop-grid\b[^"]*)(")/i,
			"$1 local-news-card-feed$2",
		)
		.replace(
			/(<div class="[^"]*\bastro-element-loop-container\b[^"]*)(")/i,
			"$1 local-news-card-feed-grid$2",
		);
}

function ensureNewsStylesheet(html: string): string {
	const stylesheet = "/assets/styles/news-card-feed.css";
	if (html.includes(stylesheet)) return html;
	return html.replace("</head>", `<link rel="stylesheet" href="${stylesheet}" />\n</head>`);
}

function renderNewsCardSection(homepageHtml: string, entries: Entry[]): string {
	const sectionBounds = findFirstElementBoundsByClassAttribute(homepageHtml, "astro-element-element-bc235fd");
	if (!sectionBounds) return "";
	let section = homepageHtml.slice(sectionBounds.start, sectionBounds.end);
	section = forceSingleColumnNewsGrid(section);

	const loopBounds = findFirstElementBoundsByClassAttribute(section, "astro-element-loop-container");
	if (!loopBounds) return section;

	const loopInner = section.slice(loopBounds.startTagEnd, loopBounds.endStart);
	const cardBounds = findAllElementBoundsByClassAttribute(loopInner, "astro-element-367");
	const templates = cardBounds.map((bounds) => loopInner.slice(bounds.start, bounds.end));
	const template = templates[0];
	if (!template) return section;

	const cards = entries.map((entry) => renderBlogCardFromHomepageTemplate(template, entry)).join("");
	const updatedLoopInner = loopInner.slice(0, cardBounds[0].start) + cards + loopInner.slice(cardBounds[cardBounds.length - 1].end);
	return section.slice(0, loopBounds.startTagEnd) + updatedLoopInner + section.slice(loopBounds.endStart);
}

export async function GET() {
	const shell = await getRenderedContentPageHtml("/sitemap/");
	const homepage = await getRenderedContentPageHtml("/");
	if (!shell || !homepage) {
		return new Response(null, { status: 404, statusText: "Not Found" });
	}

	const result = await getEmDashCollection("blog_post", {
		status: "published",
		limit: 200,
	});
	const posts = result.error ? [] : (result.entries as unknown as Entry[]);

	const sortedPosts = posts
		.sort((a, b) => getTimestamp(b) - getTimestamp(a))
		.filter((entry) => getTitle(entry) && getRoute(entry));
	const newsHtml = renderNewsCardSection(homepage, sortedPosts);

	let html = shell
		.replace(/<title>[\s\S]*?<\/title>/i, "<title>News - Maico Audiological Services</title>")
		.replace(/(<meta\s+name=["']description["']\s+content=["'])[\s\S]*?(["'][^>]*>)/i, "$1Stay informed with the latest hearing health news, audiology updates, and hearing aid technology from Maico Audiological Services.$2")
		.replace(/(<span class=["']last["']>)Sitemap(<\/span>)/i, "$1News$2")
		.replace(/(<h1[^>]*>)Sitemap(<\/h1>)/i, "$1News$2")
		.replace(/<link rel=["']canonical["'] href=["'][^"']*["']\s*\/?>/i, '<link rel="canonical" href="/news/" />');

	const sitemapBounds = findFirstElementBoundsByClassAttribute(html, "simple-sitemap-container");
	if (sitemapBounds && newsHtml) {
		html = html.slice(0, sitemapBounds.start) + newsHtml + html.slice(sitemapBounds.end);
	}

	html = ensureNewsStylesheet(html);
	html = normalizeMojibake(html);

	return new Response(html, {
		headers: {
			"content-type": "text/html; charset=utf-8",
		},
	});
}
