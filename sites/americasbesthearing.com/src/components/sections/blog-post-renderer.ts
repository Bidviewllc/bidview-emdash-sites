import { load } from "cheerio";
import { updateInternalPageCta } from "./internal-page-cta-renderer";

const escapeHtml = (value: unknown) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");

function markToHtml(text: string, marks: string[] = [], markDefs: any[] = []) {
	return marks.reduce((html, mark) => {
		const def = markDefs.find((item) => item?._key === mark || item?.key === mark);
		if (mark === "strong") return `<strong>${html}</strong>`;
		if (mark === "em") return `<em>${html}</em>`;
		if (def?._type === "link" || def?.type === "link") {
			const href = escapeHtml(def.href || "#");
			return `<a href="${href}">${html}</a>`;
		}
		return html;
	}, escapeHtml(text));
}

function portableTextToHtml(value: any) {
	if (!value) return "";
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return portableTextToHtml(parsed);
		} catch {}
		return value
			.split(/\n\s*\n/)
			.map((paragraph) => paragraph.trim())
			.filter(Boolean)
			.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
			.join("");
	}
	if (!Array.isArray(value)) return `<p>${escapeHtml(value)}</p>`;

	const html: string[] = [];
	let activeList: "bullet" | "number" | null = null;
	let listItems: string[] = [];
	const flushList = () => {
		if (!activeList || !listItems.length) return;
		html.push(`<${activeList === "number" ? "ol" : "ul"}>${listItems.join("")}</${activeList === "number" ? "ol" : "ul"}>`);
		activeList = null;
		listItems = [];
	};

	for (const block of value) {
		const children = Array.isArray(block?.children) ? block.children : [];
		const inner = children.map((child: any) => markToHtml(child?.text || "", child?.marks || [], block?.markDefs || [])).join("");
		if (!inner.trim()) continue;
		if (block?.listItem === "bullet" || block?.listItem === "number") {
			const listType = block.listItem === "number" ? "number" : "bullet";
			if (activeList && activeList !== listType) flushList();
			activeList = listType;
			listItems.push(`<li>${inner}</li>`);
			continue;
		}
		flushList();
		const style = block?.style || "normal";
		if (["h2", "h3", "h4", "h5", "h6"].includes(style)) html.push(`<${style}>${inner}</${style}>`);
		else if (style === "blockquote") html.push(`<blockquote>${inner}</blockquote>`);
		else html.push(`<p>${inner}</p>`);
	}
	flushList();
	return html.join("");
}

function imageData(value: any) {
	const image = value?.featured_image || value?.image || value;
	const storageKey = image?.meta?.storageKey || image?.storageKey;
	return {
		src: image?.src || image?.url || (storageKey ? `/_emdash/api/media/file/${storageKey}` : ""),
		alt: image?.alt || value?.title || "",
	};
}

function formatDate(value: unknown) {
	if (!value) return "";
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function slugify(value: unknown) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function addHeadingIds($: ReturnType<typeof load>, content: any) {
	content.find("h2, h3, h4, h5, h6").each((_, element) => {
		const heading = $(element);
		if (!heading.attr("id")) heading.attr("id", slugify(heading.text()));
	});
}

export function renderBlogPostHtml(rawHtml: string, post: any, category = "", authorName = "", internalCta?: unknown) {
	const data = post?.data ? { id: post.id, slug: post.slug || post.id, ...post.data } : post || {};
	if (!data?.title) return rawHtml;

	const $ = load(rawHtml, { decodeEntities: false });
	const href = `/${data.slug || data.id || ""}/`;
	const image = imageData(data);
	const dateValue = data.publishedAt || data.published_at || data.date || data.createdAt || data.created_at;
	const dateText = formatDate(dateValue);
	const categoryText = category || data.category || data.category_label || "";
	const authorText = authorName || data.author || data.author_name || "";

	$(".rank-math-breadcrumb .last").first().text(data.title);
	$("h1.astro-heading-title").first().text(data.title);
	const postInfoItems = $(".astro-element-7df9c26 .astro-post-info__item");
	postInfoItems.filter(".astro-post-info__item--type-date").find("time").first().text(dateText).attr("datetime", String(dateValue || ""));
	postInfoItems.filter(".astro-post-info__item--type-terms").first().text(categoryText);
	if (authorText) postInfoItems.filter(".astro-post-info__item--type-author").first().text(` ${authorText} `);

	if (image.src) {
		const featured = $(".astro-widget-theme-post-featured-image img").first();
		featured.attr("src", image.src).attr("alt", image.alt || data.title).removeAttr("srcset").removeAttr("sizes");
	}

	const content = $(".astro-element-7d35f86 .astro-widget-container").first();
	content.html(portableTextToHtml(data.content));
	addHeadingIds($, content);

	$(".astro-element-f70e36c .e-loop-item").each((_, element) => {
		const card = $(element);
		const link = card.find(".astro-heading-title a").first();
		if (link.attr("href") === href) {
			link.text(data.title);
		}
	});

	updateInternalPageCta($, internalCta);
	return $.root().html() || rawHtml;
}
