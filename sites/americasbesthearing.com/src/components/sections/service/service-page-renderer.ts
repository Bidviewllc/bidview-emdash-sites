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

export function findServicePage(servicePages: unknown[], serviceSlug: string, routePath: string) {
	const normalized = localHref(routePath);
	return (servicePages || []).map(entryData).find((page) => {
		return String(page.slug || page.id) === serviceSlug || String(page.route_path || "") === normalized || localHref(page.route_path) === normalized;
	});
}

export function servicePageTitle(servicePage: any) {
	return String(servicePage?.page_title || "").trim() || (servicePage?.service_title ? `${servicePage.service_title} | America's Best Hearing` : "America's Best Hearing");
}

export function servicePageDescription(servicePage: any) {
	return String(servicePage?.meta_description || "").trim() || (servicePage?.service_title ? `${servicePage.service_title} at America's Best Hearing.` : "");
}

const SERVICE_CONTENT_CONTAINER_IDS: Record<string, string> = {
	"audiology-services": "d3f189f",
	"ear-wax-removal": "df098a3",
	"hearing-aid-fittings": "10eaa70",
	"hearing-aid-services": "bea3b1e",
	"hearing-tests": "f0f6feb",
	"custom-hearing-protection": "ce5e038",
	"hearing-aids-products": "e18ef72",
	"hearing-aid-batteries": "9800f09",
	"assistive-listening-devices": "d22f27d",
};

function portableTextToHtml(blocks: unknown) {
	const parsed = parseJsonLike(blocks);
	if (!Array.isArray(parsed)) return "";
	const renderSpan = (child: any, markDefs: any[]) => {
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
	};
	return parsed
		.map((block: any) => {
			const children = Array.isArray(block?.children) ? block.children : [];
			const markDefs = Array.isArray(block?.markDefs) ? block.markDefs : [];
			const text = children.map((child: any) => renderSpan(child, markDefs)).join("");
			if (!text.trim()) return "";
			const style = /^h[2-4]$/.test(block?.style) ? block.style : "p";
			return style === "p" ? `<p>${text}</p>` : `<${style}>${text}</${style}>`;
		})
		.filter(Boolean)
		.join("");
}

function cloneTextWidget($: CheerioAPI, template: Cheerio<any>, html: string, index: number) {
	const widget = template.length ? template.clone() : $('<div class="astro-element astro-widget astro-widget-text-editor"><div class="astro-widget-container"></div></div>');
	widget.attr("data-id", `service-text-${index}`);
	widget.find("> .astro-widget-container").first().html(html);
	return widget;
}

function cloneDivider($: CheerioAPI, template: Cheerio<any>, index: number) {
	const divider = template.length ? template.clone() : $('<div class="astro-element astro-widget-divider--view-line astro-widget astro-widget-divider"><div class="astro-widget-container"><div class="astro-divider"><span class="astro-divider-separator"></span></div></div></div>');
	divider.attr("data-id", `service-divider-${index}`);
	return divider;
}

function detailsFromTemplate($: CheerioAPI, templateDetail: Cheerio<any>, item: any, accordionIndex: number, itemIndex: number) {
	const detail = templateDetail.length ? templateDetail.clone() : $('<details class="e-n-accordion-item"><summary class="e-n-accordion-item-title"><span class="e-n-accordion-item-title-header"><h3 class="e-n-accordion-item-title-text"></h3></span></summary><div role="region"><div class="astro-widget-text-editor"><div class="astro-widget-container"></div></div></div></details>');
	const id = `e-n-accordion-service-${accordionIndex}-${itemIndex}`;
	const level = /^h[3-4]$/.test(item.heading_level) ? item.heading_level : "h3";
	detail.attr("id", id);
	detail.removeAttr("open");
	const summary = detail.find("summary").first();
	summary.attr("aria-controls", id).attr("aria-expanded", "false").attr("tabindex", itemIndex === 0 ? "0" : "-1").attr("data-accordion-index", String(itemIndex + 1));
	const title = summary.find(".e-n-accordion-item-title-text").first();
	const replacement = $(`<${level} class="e-n-accordion-item-title-text"> ${escapeHtml(item.accordion_title || item.heading_text || "")}</${level}>`);
	title.replaceWith(replacement);
	const region = detail.find('[role="region"]').first();
	region.attr("aria-labelledby", id);
	let bodyContainer = region.find(".astro-widget-text-editor .astro-widget-container").first();
	if (!bodyContainer.length) {
		region.html('<div class="astro-element astro-widget astro-widget-text-editor"><div class="astro-widget-container"></div></div>');
		bodyContainer = region.find(".astro-widget-container").first();
	}
	bodyContainer.html(item.accordion_body || item.body_content || "");
	return detail;
}

function cloneAccordion($: CheerioAPI, template: Cheerio<any>, items: any[], index: number) {
	const widget = template.length ? template.clone() : $('<div class="astro-element custom-accordion astro-widget astro-widget-n-accordion"><div class="astro-widget-container"><div class="e-n-accordion"></div></div></div>');
	widget.attr("data-id", `service-accordion-${index}`);
	const accordion = widget.find(".e-n-accordion").first();
	const templateDetail = accordion.find("details").first().clone();
	accordion.empty();
	items.forEach((item, itemIndex) => accordion.append(detailsFromTemplate($, templateDetail, item, index, itemIndex)));
	return widget;
}

function appendDividerIfUseful($: CheerioAPI, container: Cheerio<any>, dividerTemplate: Cheerio<any>, index: number) {
	if (dividerTemplate.length) container.append(cloneDivider($, dividerTemplate, index));
}

function renderBlocksIntoContainer($: CheerioAPI, container: Cheerio<any>, servicePage: any) {
	const originalChildren = container.children(".astro-element");
	const textTemplate = originalChildren.filter(".astro-widget-text-editor").first().clone();
	const dividerTemplate = originalChildren.filter(".astro-widget-divider--view-line").first().clone();
	const accordionTemplate = originalChildren.filter(".custom-accordion, .astro-widget-n-accordion").first().clone();
	const blocks = parseJsonLike(servicePage.content_blocks);
	let counter = 0;
	let pendingAccordion: any[] = [];
	container.empty();

	const flushAccordion = () => {
		if (!pendingAccordion.length) return;
		container.append(cloneAccordion($, accordionTemplate, pendingAccordion, counter++));
		pendingAccordion = [];
	};

	const introHtml = portableTextToHtml(servicePage.intro_content);
	if (introHtml) {
		container.append(cloneTextWidget($, textTemplate, introHtml, counter++));
	}

	for (const block of Array.isArray(blocks) ? blocks : []) {
		if (block?.block_type === "accordion_item") {
			pendingAccordion.push(block);
			continue;
		}
		flushAccordion();
		if (block?.block_type === "heading" && block.heading_text) {
			const level = /^h[2-4]$/.test(block.heading_level) ? block.heading_level : "h2";
			if (level === "h2" && container.children().length) appendDividerIfUseful($, container, dividerTemplate, counter++);
			container.append(cloneTextWidget($, textTemplate, `<${level}>${escapeHtml(block.heading_text)}</${level}>`, counter++));
			continue;
		}
		if (block?.block_type === "body" && block.body_content) {
			container.append(cloneTextWidget($, textTemplate, String(block.body_content), counter++));
		}
	}
	flushAccordion();
	let last = container.children(".astro-widget-divider--view-line").last();
	while (last.length && last.is(container.children().last())) {
		last.remove();
		last = container.children(".astro-widget-divider--view-line").last();
	}
}

export function renderServicePageHtml(rawHtml: string, servicePage: any, internalCta?: unknown) {
	const $ = load(rawHtml, { decodeEntities: false });
	if (!servicePage) return rawHtml;
	if (servicePage.service_title) $(".astro-element-c191118 h1.astro-heading-title, h1.astro-heading-title").first().text(String(servicePage.service_title));
	const serviceSlug = String(servicePage.slug || servicePage.id || "").trim();
	const containerId = String(servicePage.content_container_id || SERVICE_CONTENT_CONTAINER_IDS[serviceSlug] || "").trim();
	const container = containerId ? $(`[data-id="${containerId}"]`).first() : $();
	if (container.length) renderBlocksIntoContainer($, container, servicePage);
	updateInternalPageCta($, internalCta);
	return $("body").html() || $.root().html() || rawHtml;
}

