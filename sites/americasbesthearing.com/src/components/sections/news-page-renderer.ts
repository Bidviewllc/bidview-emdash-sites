import { load } from "cheerio";

const escapeHtml = (value: unknown) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");

const entryData = (item: any) => item?.data ? { id: item.id, slug: item.slug || item.id, ...item.data } : item ?? {};

const postTimestamp = (item: unknown) => {
	const data = entryData(item);
	const value = data.publishedAt || data.published_at || data.date || data.createdAt || data.created_at || "";
	const time = Date.parse(String(value));
	return Number.isFinite(time) ? time : 0;
};

const sortPosts = (items: unknown[]) => [...(items || [])].sort((a, b) => postTimestamp(b) - postTimestamp(a));

function imageData(value: any) {
	const image = value?.featured_image || value?.image || value;
	const storageKey = image?.meta?.storageKey || image?.storageKey;
	return {
		src: image?.src || image?.url || (storageKey ? `/_emdash/api/media/file/${storageKey}` : ""),
		alt: image?.alt || value?.title || "",
	};
}

function plainTextFromPortable(value: any): string {
	if (!value) return "";
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return plainTextFromPortable(parsed);
		} catch {}
		return value;
	}
	if (!Array.isArray(value)) return String(value || "");
	return value
		.map((block) => (Array.isArray(block?.children) ? block.children.map((child: any) => child?.text || "").join("") : ""))
		.filter(Boolean)
		.join(" ");
}

function truncateWords(value: unknown, maxWords = 15) {
	const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
	if (words.length <= maxWords) return words.join(" ");
	return `${words.slice(0, maxWords).join(" ")}...`;
}

function formatDate(value: unknown) {
	if (!value) return "";
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

export function renderNewsPageHtml(rawHtml: string, posts: unknown[]) {
	const $ = load(rawHtml, { decodeEntities: false });
	const grid = $(".astro-element-4e0e628 .astro-loop-container").first();
	const template = grid.find(".e-loop-item").first().clone();
	const style = grid.children("style").first().clone();
	const sorted = sortPosts(posts);
	if (!grid.length || !template.length || !sorted.length) return rawHtml;

	grid.empty();
	if (style.length) grid.append(style);

	sorted.forEach((item, index) => {
		const data = entryData(item);
		const card = template.clone();
		const img = imageData(data);
		const href = data.url || data.link_url || `/${data.slug || data.id || ""}/`;
		const dateValue = data.date || data.publishedAt || data.published_at || data.createdAt || data.created_at;
		const category = data.category || data.category_label || "";
		const excerpt = truncateWords(plainTextFromPortable(data.content), 15);

		card.removeClass((_, className) => (className.match(/e-loop-item-\S+|post-\S+|category-\S+|tag-\S+/g) || []).join(" "));
		card.addClass(`e-loop-item-${index + 1}`);
		if (category) card.addClass(`category-${String(category).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`);
		card.find("a").attr("href", String(href));
		if (img.src) card.find("img").first().attr("src", img.src).attr("alt", img.alt || data.title || "").removeAttr("srcset").removeAttr("sizes");
		card.find(".astro-heading-title").first().html(`<a href="${escapeHtml(href)}">${escapeHtml(data.title || "")}</a>`);
		card.find(".astro-post-info__item--type-date time").first().text(formatDate(dateValue)).attr("datetime", String(dateValue || ""));
		const infoItems = card.find(".astro-post-info__item");
		if (category && infoItems.length > 1) infoItems.eq(1).text(String(category));
		card.find(".astro-widget-theme-post-excerpt .astro-widget-container").first().html(`<p>${escapeHtml(excerpt)}</p>`);
		grid.append(card);
	});

	return $.root().html() || rawHtml;
}
