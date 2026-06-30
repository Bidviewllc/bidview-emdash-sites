import { load, type Cheerio, type CheerioAPI } from "cheerio";
import { updateInternalPageCta } from "../internal-page-cta-renderer";

const escapeHtml = (value: unknown) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");

export const entryData = (item: any) => (item?.data ? { id: item.id, slug: item.slug || item.id, ...item.data } : item ?? {});

function parseJsonLike(value: any) {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return value;
	try {
		return JSON.parse(trimmed);
	} catch {
		return value;
	}
}

function localHref(value: unknown) {
	const href = String(value || "").trim();
	return (href.replace(/^https?:\/\/(?:www\.)?americasbesthearing\.com/i, "").replace(/^https?:\/\/localhost:4321/i, "").replace(/^https?:\/\/127\.0\.0\.1:4321/i, "") || "/").replace(/\/+$/, "/");
}

export function findHearingAidBrandPage(brandPages: unknown[], brandSlug: string, routePath: string) {
	const normalized = localHref(routePath);
	return (brandPages || []).map(entryData).find((page) => {
		return String(page.slug || page.id) === brandSlug || String(page.route_path || "") === normalized || localHref(page.route_path) === normalized;
	});
}

export function hearingAidBrandPageTitle(brandPage: any) {
	return String(brandPage?.page_title || "").trim() || (brandPage?.page_heading ? `${brandPage.page_heading} | America's Best Hearing` : "America's Best Hearing");
}

export function hearingAidBrandPageDescription(brandPage: any) {
	return String(brandPage?.meta_description || "").trim() || (brandPage?.page_heading ? `${brandPage.page_heading} at America's Best Hearing.` : "");
}

function renderSpan(child: any, markDefs: any[]) {
	let html = escapeHtml(child?.text || "");
	for (const mark of Array.isArray(child?.marks) ? child.marks : []) {
		const linkDef = markDefs.find((def) => def?._key === mark && def?._type === "link");
		if (linkDef?.href) {
			html = `<a href="${escapeHtml(linkDef.href)}">${html}</a>`;
			continue;
		}
		if (mark === "strong") html = `<strong>${html}</strong>`;
		if (mark === "em") html = `<em>${html}</em>`;
		if (mark === "underline") html = `<u>${html}</u>`;
		if (mark === "strike-through") html = `<s>${html}</s>`;
		if (mark === "code") html = `<code>${html}</code>`;
	}
	return html;
}

function portableTextToHtml(blocks: unknown) {
	const parsed = parseJsonLike(blocks);
	if (!Array.isArray(parsed)) return typeof blocks === "string" ? blocks : "";
	let html = "";
	let listType = "";
	const closeList = () => {
		if (listType) html += `</${listType}>`;
		listType = "";
	};
	for (const block of parsed) {
		const children = Array.isArray(block?.children) ? block.children : [];
		const markDefs = Array.isArray(block?.markDefs) ? block.markDefs : [];
		const text = children.map((child: any) => renderSpan(child, markDefs)).join("");
		if (!text.trim()) continue;
		if (block?.listItem === "bullet" || block?.listItem === "number") {
			const wantedList = block.listItem === "number" ? "ol" : "ul";
			if (listType !== wantedList) {
				closeList();
				html += `<${wantedList}>`;
				listType = wantedList;
			}
			html += `<li>${text}</li>`;
			continue;
		}
		closeList();
		const style = /^h[2-4]$/.test(block?.style) ? block.style : "p";
		html += style === "p" ? `<p>${text}</p>` : `<${style}>${text}</${style}>`;
	}
	closeList();
	return html;
}

function imageData(value: any) {
	const parsed = parseJsonLike(value);
	if (!parsed) return parsed;
	if (parsed?.image) return imageData(parsed.image);
	if (parsed?.featured_image) return imageData(parsed.featured_image);
	if (parsed?.value) return imageData(parsed.value);
	return parsed;
}

function setImage($: CheerioAPI, img: Cheerio<any>, image: any) {
	const data = imageData(image);
	const src = data?.src || data?.url || (data?.meta?.storageKey ? `/_emdash/api/media/file/${data.meta.storageKey}` : "");
	if (!img.length || !src) return;
	img.attr("src", src);
	img.attr("alt", data.alt || "");
	img.removeAttr("srcset");
	img.removeAttr("sizes");
	if (data.width) img.attr("width", String(data.width));
	if (data.height) img.attr("height", String(data.height));
}

function sortedItems(value: unknown) {
	const parsed = parseJsonLike(value);
	return Array.isArray(parsed) ? [...parsed].sort((a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0)) : [];
}

function setTextWidgetHtml($: CheerioAPI, selector: string, html: string) {
	const container = $(selector).first().find("> .astro-widget-container").first();
	if (container.length) container.html(html);
}

function renderBreadcrumb($: CheerioAPI, brandPage: any) {
	const brandName = String(brandPage.brand_name || brandPage.page_heading || "")
		.replace(/\s+Hearing Aids$/i, "")
		.trim();
	const label = brandName || "Hearing Aids";
	const container = $('[data-id="feb84f5"] > .astro-widget-container').first();
	if (!container.length) return;
	container.html(`<nav aria-label="breadcrumbs" class="rank-math-breadcrumb"><p><a href="/">Home</a><span class="separator"> » </span><span class="last">${escapeHtml(label)}</span></p></nav>`);
}

function carouselImageItems(carouselImages: unknown[]) {
	const items = sortedItems(carouselImages);
	if (!items.length) return [];
	const first = items[0] || {};
	const galleryImages = Array.from({ length: 15 }, (_, index) => first[`image_${index + 1}`])
		.filter(Boolean)
		.map((image, index) => ({ image, sort_order: index + 1 }));
	return galleryImages.length ? galleryImages : items;
}

function renderCarousel($: CheerioAPI, carouselImages: unknown[]) {
	const images = carouselImageItems(carouselImages);
	if (!images.length) return;
	const carousel = $('[data-id="e37280d"]').first();
	const wrapper = carousel.find(".astro-image-carousel.swiper-wrapper").first();
	if (!wrapper.length) return;
	const template = wrapper.children(".swiper-slide").first().clone();
	if (!template.length) return;
	wrapper.empty();
	images.forEach((item, index) => {
		const slide = template.clone();
		slide.attr("aria-label", `${index + 1} of ${images.length}`);
		setImage($, slide.find("img").first(), item.image);
		wrapper.append(slide);
	});
	carousel.find(".swiper-pagination").empty();
}

function renderModels($: CheerioAPI, modelsValue: unknown[]) {
	const models = sortedItems(modelsValue);
	if (!models.length) return;
	const loop = $(".astro-widget-loop-grid").first();
	const container = loop.find(".astro-loop-container").first();
	if (!container.length) return;
	const style = container.children("style").first().clone();
	const template = container.children(".e-loop-item").first().clone();
	if (!template.length) return;
	container.empty();
	if (style.length) container.append(style);
	models.forEach((model, index) => {
		const item = template.clone();
		item.removeClass((_, className) => (className.match(/post-\S+|e-loop-item-\S+/g) || []).join(" "));
		item.addClass(`e-loop-item-brand-${index + 1}`);
		setImage($, item.find('[data-widget_type="theme-post-featured-image.default"] img, img').first(), model.featured_image || model.image);
		item.find('[data-widget_type="theme-post-title.default"] h1, [data-widget_type="theme-post-title.default"] h2, [data-widget_type="theme-post-title.default"] h3, h3').first().text(String(model.model_name || ""));
		item.find('[data-widget_type="theme-post-content.default"] .astro-widget-container').first().html(portableTextToHtml(model.short_description || model.description));
		item.find('[data-id="66d8400"] .astro-widget-container').first().html(portableTextToHtml(model.key_features));
		container.append(item);
	});
}

function renderFaqs($: CheerioAPI, faqsValue: unknown[]) {
	const faqs = sortedItems(faqsValue);
	if (!faqs.length) return;
	const widget = $('[data-id="ec8b759"]').first();
	const accordion = widget.find(".e-n-accordion").first();
	const template = accordion.children("details").first().clone();
	if (!accordion.length || !template.length) return;
	accordion.empty();
	faqs.forEach((faq, index) => {
		const detail = template.clone();
		const id = `e-n-accordion-brand-faq-${index + 1}`;
		detail.attr("id", id);
		detail.removeAttr("open");
		const summary = detail.find("summary").first();
		summary.attr("aria-expanded", "false").attr("aria-controls", id).attr("data-accordion-index", String(index + 1)).attr("tabindex", index === 0 ? "0" : "-1");
		summary.find(".e-n-accordion-item-title-text").first().text(String(faq.question || ""));
		detail.find('[role="region"]').first().attr("aria-labelledby", id);
		detail.find('[role="region"] .astro-widget-text-editor .astro-widget-container').first().html(portableTextToHtml(faq.answer));
		accordion.append(detail);
	});
}

export function renderHearingAidBrandPageHtml(rawHtml: string, brandPage: any, related: { carouselImages?: any[]; models?: any[]; faqs?: any[]; internalCta?: unknown } = {}) {
	const $ = load(rawHtml, { decodeEntities: false });
	if (!brandPage) return rawHtml;
	const h1 = String(brandPage.page_heading || "").trim();
	if (h1) {
		$("h1.astro-heading-title").first().text(h1);
	}
	renderBreadcrumb($, brandPage);
	setTextWidgetHtml($, '[data-id="9b6b67c"]', portableTextToHtml(brandPage.intro_content));
	renderCarousel($, related.carouselImages || []);
	if (brandPage.models_heading) $('[data-id="8879430"] h2').first().text(String(brandPage.models_heading));
	renderModels($, related.models || []);
	setTextWidgetHtml($, '[data-id="02a700e"]', `<h2>${escapeHtml(brandPage.assistive_devices_heading || "")}</h2>${portableTextToHtml(brandPage.assistive_devices_content)}`);
	setTextWidgetHtml($, '[data-id="51e47ca"]', `<h2>${escapeHtml(brandPage.older_models_heading || "")}</h2>${portableTextToHtml(brandPage.older_models_content)}`);
	updateInternalPageCta($, related.internalCta);
	if (brandPage.faq_heading) $('[data-id="b9bac0e"] h2').first().text(String(brandPage.faq_heading));
	renderFaqs($, related.faqs || []);
	setTextWidgetHtml($, '[data-id="f88c1cc"]', `<h2>${escapeHtml(brandPage.closing_heading || "")}</h2>${portableTextToHtml(brandPage.closing_content)}`);
	return $("body").html() || $.root().html() || rawHtml;
}

