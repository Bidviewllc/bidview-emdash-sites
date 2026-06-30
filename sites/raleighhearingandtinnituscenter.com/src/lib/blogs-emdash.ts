import { getEmDashCollection, type CacheHint, type PortableTextBlock } from "emdash";

type CacheTarget = {
	set(cacheHint: CacheHint): void;
};

type ImageValue = {
	src?: string;
	alt?: string;
	asset?: { url?: string };
	meta?: { storageKey?: string };
};

type BlogEntry = {
	id: string;
	publishedAt?: string;
	updatedAt?: string;
	data: {
		post_title?: string;
		route?: string;
		category?: string;
		featured_image?: ImageValue;
		body_content?: PortableTextBlock[];
	};
};

export async function wireBlogCards(contentHtml: string, cache: CacheTarget, limit?: number) {
	const blogs = (await getBlogs(cache)).slice(0, limit);
	if (blogs.length === 0) return contentHtml;

	const items: NonNullable<ReturnType<typeof findLoopItemByDataId>>[] = [];
	let cursor = 0;
	while (true) {
		const item = findLoopItemByDataId(contentHtml, "aa77e49", cursor);
		if (!item) break;
		if (!items.some((existing) => existing.start === item.start)) items.push(item);
		cursor = item.end;
	}
	if (items.length === 0) return contentHtml;

	const rendered = blogs.map((blog, index) => renderBlogCard(items[Math.min(index, items.length - 1)]!.html, blog));
	return `${contentHtml.slice(0, items[0]!.start)}${rendered.join("")}${contentHtml.slice(items[items.length - 1]!.end)}`;
}

export async function sitemapIndexXml(origin: string) {
	const base = normalizeOrigin(origin);
	const now = new Date().toISOString();
	return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
		"/post-sitemap.xml",
		"/page-sitemap.xml",
		"/local-sitemap.xml",
	]
		.map((url) => `  <sitemap><loc>${escapeXml(`${base}${url}`)}</loc><lastmod>${now}</lastmod></sitemap>`)
		.join("\n")}\n</sitemapindex>`;
}

export async function postSitemapXml(cache: CacheTarget, origin: string) {
	const blogs = await getCollection("blogs", cache);
	return sitemapUrlSetXml(blogs.map((entry) => `/${entry.id}/`), origin);
}

export async function pageSitemapXml(cache: CacheTarget, origin: string) {
	const [singlePages, brands, staff, utility] = await Promise.all([
		getCollection("single_page_with_sidebar", cache),
		getCollection("hearing_aid_brands", cache),
		getCollection("staff", cache),
		getCollection("utility_pages", cache),
	]);
	const urls = [
		"/",
		"/contact-us/",
		"/blog/",
		"/sitemap/",
		...singlePages.map((entry) => `/${entry.id}/`),
		...brands.map((entry) => `/${entry.id}/`),
		...staff.map((entry) => `/audiologist/${entry.id}/`),
		...utility.map((entry) => `/${entry.id}/`),
	];
	return sitemapUrlSetXml(urls, origin);
}

export async function localSitemapXml(origin: string) {
	return sitemapUrlSetXml(["/locations.kml"], origin);
}

export async function sitemapXml(cache: CacheTarget, origin: string) {
	const [singlePages, brands, blogs, staff, utility] = await Promise.all([
		getCollection("single_page_with_sidebar", cache),
		getCollection("hearing_aid_brands", cache),
		getCollection("blogs", cache),
		getCollection("staff", cache),
		getCollection("utility_pages", cache),
	]);
	const urls = [
		"/",
		"/contact-us/",
		"/blog/",
		"/sitemap/",
		...singlePages.map((entry) => `/${entry.id}/`),
		...brands.map((entry) => `/${entry.id}/`),
		...blogs.map((entry) => `/${entry.id}/`),
		...staff.map((entry) => `/audiologist/${entry.id}/`),
		...utility.map((entry) => `/${entry.id}/`),
		"/locations.kml",
	];
	return sitemapUrlSetXml(urls, origin);
}

function sitemapUrlSetXml(urls: string[], origin: string) {
	const base = normalizeOrigin(origin);
	const uniqueUrls = [...new Set(urls.map((url) => url.startsWith("/") ? url : `/${url}`))];
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniqueUrls
		.map((url) => `  <url><loc>${escapeXml(`${base}${url}`)}</loc></url>`)
		.join("\n")}\n</urlset>`;
}

function normalizeOrigin(origin: string) {
	return origin.replace(/\/+$/g, "");
}

function escapeXml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

async function getBlogs(cache: CacheTarget) {
	const entries = await getCollection("blogs", cache) as BlogEntry[];
	return entries.sort((a, b) => getBlogTimestamp(b) - getBlogTimestamp(a));
}

async function getCollection(collection: string, cache: CacheTarget) {
	const result = await getEmDashCollection(collection as never, { limit: 100 });
	cache.set(result.cacheHint);
	return (result.entries ?? []) as unknown as BlogEntry[];
}

function renderBlogCard(template: string, blog: BlogEntry) {
	const href = normalizeHref(blog.data.route || `/${blog.id}/`);
	let card = template;
	card = replaceImage(card, "dcb65e6", blog.data.featured_image, getBlogFallbackImage(blog.id));
	card = replacePostInfo(card, blog);
	card = replaceWidgetHtml(card, "a9934b4", `<h3 class="astro-heading-title astro-size-default">${escapeHtml(blog.data.post_title ?? "")}</h3>`);
	card = replaceWidgetLink(card, "6ee36f1", href);
	card = replaceAllLinks(card, href);
	return card;
}

function getBlogFallbackImage(slug: string) {
	const images: Record<string, string> = {
		"ear-candles-are-they-safe-and-effective": "/assets/media/Ear-Candles-What-They-Are-What-They-Claim-and-What-You-Should-Know-5f5833268a.jpg",
		"hearing-aids-for-tinnitus": "/assets/media/Hearing-Aids-for-Tinnitus-How-the-Right-Care-Can-Bring-Relief-1-39dad4dc74.jpg",
		"lenire-side-effects-insurance-and-how-it-compares-with-hearing-aids": "/assets/media/featured_featured-4926fca9d4.jpg",
		"swimmers-ear-signs-causes-when-to-see-an-audiologist": "/assets/media/Swimmers-Ear-Signs-Causes-and-When-to-See-a-Doctor-38ae7f0645.jpg",
	};
	return images[slug] ?? "";
}

function replacePostInfo(html: string, blog: BlogEntry) {
	const date = getBlogPublishedDate(blog.id) || formatDate(blog.publishedAt || blog.updatedAt) || "";
	return replaceWidgetHtml(
		html,
		"eda8faf",
		`<ul class="astro-inline-items astro-icon-list-items astro-post-info"><li class="astro-icon-list-item astro-repeater-item-f257433 astro-inline-item" itemprop="datePublished"><span class="astro-icon-list-icon"><i aria-hidden="true" class="fas fa-calendar"></i></span><span class="astro-icon-list-text astro-post-info__item astro-post-info__item--type-date"><time>${escapeHtml(date)}</time></span></li><li class="astro-icon-list-item astro-repeater-item-245176a astro-inline-item" itemprop="about"><span class="astro-icon-list-icon"><i aria-hidden="true" class="fas fa-tags"></i></span><span class="astro-icon-list-text astro-post-info__item astro-post-info__item--type-terms"><span class="astro-post-info__terms-list"><span class="astro-post-info__terms-list-item">${escapeHtml(blog.data.category ?? "Hearing")}</span></span></span></li></ul>`,
	);
}

function getBlogPublishedDate(slug: string) {
	const dates: Record<string, string> = {
		"ear-candles-are-they-safe-and-effective": "March 12, 2025",
		"hearing-aids-for-tinnitus": "March 4, 2025",
		"lenire-side-effects-insurance-and-how-it-compares-with-hearing-aids": "April 15, 2026",
		"swimmers-ear-signs-causes-when-to-see-an-audiologist": "March 20, 2025",
	};
	return dates[slug] ?? "";
}

function getBlogTimestamp(blog: BlogEntry) {
	const migratedDates: Record<string, string> = {
		"ear-candles-are-they-safe-and-effective": "2025-03-12T13:40:00+00:00",
		"hearing-aids-for-tinnitus": "2025-03-04T13:41:00+00:00",
		"lenire-side-effects-insurance-and-how-it-compares-with-hearing-aids": "2026-04-15T00:00:00+00:00",
		"swimmers-ear-signs-causes-when-to-see-an-audiologist": "2025-03-20T13:10:00+00:00",
	};
	const value = migratedDates[blog.id] ?? blog.publishedAt ?? blog.updatedAt ?? "";
	const timestamp = new Date(value).getTime();
	return Number.isNaN(timestamp) ? 0 : timestamp;
}

function replaceImage(html: string, dataId: string, image?: ImageValue, fallbackSrc = "") {
	const src = image?.asset?.url ?? image?.src ?? (image?.meta?.storageKey ? `/_emdash/api/media/file/${image.meta.storageKey}` : fallbackSrc);
	if (!src) return html;
	return replaceElementByDataId(html, dataId, (widget) => widget.replace(/<img\b[^>]*>/i, (img) => {
		let next = setAttr(img.replace(/\ssrcset="[^"]*"/i, "").replace(/\ssizes="[^"]*"/i, ""), "src", src);
		next = setAttr(next, "alt", image?.alt ?? "");
		return next;
	}));
}

function replaceWidgetLink(html: string, dataId: string, href: string) {
	return replaceElementByDataId(html, dataId, (widget) => widget.replace(/\shref="[^"]*"/g, ` href="${escapeAttr(href)}"`));
}

function replaceAllLinks(html: string, href: string) {
	return html.replace(/\shref="[^"]*"/g, ` href="${escapeAttr(href)}"`);
}

function replaceWidgetHtml(html: string, dataId: string, innerHtml: string) {
	return replaceElementByDataId(html, dataId, (widget) => {
		const containerIndex = widget.indexOf('class="astro-widget-container"');
		if (containerIndex < 0) return widget;
		const start = widget.lastIndexOf("<div", containerIndex);
		const end = findClosingDiv(widget, start);
		if (start < 0 || end < 0) return widget;
		const openEnd = widget.indexOf(">", start) + 1;
		return `${widget.slice(0, openEnd)}${innerHtml}${widget.slice(end - "</div>".length)}`;
	});
}

function replaceElementByDataId(html: string, dataId: string, replacement: (element: string) => string) {
	const element = findElementByDataId(html, dataId);
	if (!element) return html;
	return `${html.slice(0, element.start)}${replacement(element.html)}${html.slice(element.end)}`;
}

function findLoopItemByDataId(html: string, dataId: string, fromIndex = 0) {
	const card = findElementByDataId(html, dataId, fromIndex);
	if (!card) return null;
	const before = html.slice(0, card.start);
	const loopStartMatch = [...before.matchAll(/<div\b[^>]*\be-loop-item\b[^>]*>/gi)].pop();
	if (!loopStartMatch) return card;
	const start = loopStartMatch.index ?? card.start;
	const end = findClosingDiv(html, start);
	if (end < 0 || end < card.end) return card;
	return { start, end, html: html.slice(start, end) };
}

function findElementByDataId(html: string, dataId: string, fromIndex = 0) {
	const dataIndex = html.indexOf(`data-id="${dataId}"`, fromIndex);
	if (dataIndex < 0) return null;
	const start = html.lastIndexOf("<div", dataIndex);
	const end = findClosingDiv(html, start);
	if (start < 0 || end < 0) return null;
	return { start, end, html: html.slice(start, end) };
}

function findClosingDiv(html: string, start: number) {
	const re = /<\/?div\b[^>]*>/gi;
	re.lastIndex = start;
	let depth = 0;
	let match: RegExpExecArray | null;
	while ((match = re.exec(html))) {
		if (match[0][1] === "/") depth -= 1;
		else depth += 1;
		if (depth === 0) return re.lastIndex;
	}
	return -1;
}

function setAttr(tag: string, attr: string, value: string) {
	const escaped = escapeAttr(value);
	const pattern = new RegExp(`\\s${attr}="[^"]*"`, "i");
	if (pattern.test(tag)) return tag.replace(pattern, ` ${attr}="${escaped}"`);
	return tag.replace(/\/?>$/, ` ${attr}="${escaped}"$&`);
}

function normalizeHref(href: string) {
	if (/^(https?:|mailto:|tel:|\/|#)/.test(href)) return href;
	return `/${href.replace(/^\/+/, "")}`;
}

function formatDate(value?: string) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function escapeHtml(value: string) {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
	return escapeHtml(value).replace(/'/g, "&#39;");
}
