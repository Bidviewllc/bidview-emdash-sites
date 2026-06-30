import { load, type CheerioAPI } from "cheerio";

const escapeHtml = (value: unknown) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const entryData = (item: any) => item?.data ? { id: item.id, slug: item.slug || item.id, ...item.data } : item ?? {};
const sortEntries = (items: unknown[]) =>
	[...(items || [])].sort(
		(a: any, b: any) =>
			Number(entryData(a).sort_order ?? entryData(a).sortOrder ?? 0) -
			Number(entryData(b).sort_order ?? entryData(b).sortOrder ?? 0),
	);

const postTimestamp = (item: unknown) => {
	const data = entryData(item);
	const value = data.publishedAt || data.published_at || data.date || data.createdAt || data.created_at || "";
	const time = Date.parse(String(value));
	return Number.isFinite(time) ? time : 0;
};

const sortPosts = (items: unknown[]) => [...(items || [])].sort((a, b) => postTimestamp(b) - postTimestamp(a));

function localHref(value: unknown) {
	const href = String(value || "").trim();
	if (!href) return "#";
	return href
		.replace(/^https?:\/\/(?:www\.)?americasbesthearing\.com/i, "")
		.replace(/^https?:\/\/localhost:4321/i, "")
		.replace(/^https?:\/\/127\.0\.0\.1:4321/i, "") || "/";
}

function imageData(value: any) {
	const image = value?.featured_image || value?.image || value;
	const storageKey = image?.meta?.storageKey || image?.storageKey;
	return {
		src: image?.src || image?.url || (storageKey ? `/_emdash/api/media/file/${storageKey}` : ""),
		alt: image?.alt || value?.title || "",
	};
}

function truncateWords(value: unknown, maxWords = 15) {
	const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
	if (words.length <= maxWords) return words.join(" ");
	return `${words.slice(0, maxWords).join(" ")}...`;
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
	return value.map((block) => (Array.isArray(block?.children) ? block.children.map((child: any) => child?.text || "").join("") : "")).filter(Boolean).join(" ");
}

function formatDate(value: unknown) {
	if (!value) return "";
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function markToHtml(text: string, marks: string[] = [], markDefs: any[] = []) {
	const linkifyEscapedText = (html: string) =>
		html
			.replace(
				/(https?:\/\/[^\s<]+)/g,
				(url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`,
			)
			.replace(
				/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
				(email) => `<a href="mailto:${email}">${email}</a>`,
			);
	const hasLinkMark = marks.some((mark) => {
		const def = markDefs.find((item) => item._key === mark || item.key === mark);
		return def?._type === "link" || def?.type === "link";
	});
	return marks.reduce((html, mark) => {
		const def = markDefs.find((item) => item._key === mark || item.key === mark);
		if (mark === "strong") return `<strong>${html}</strong>`;
		if (mark === "em") return `<em>${html}</em>`;
		if (def?._type === "link" || def?.type === "link") return `<a href="${escapeHtml(def.href)}">${html}</a>`;
		return html;
	}, hasLinkMark ? escapeHtml(text) : linkifyEscapedText(escapeHtml(text)));
}

export function richTextToHtml(value: any) {
	if (!value) return "";
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return richTextToHtml(parsed);
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
	let listItems: string[] = [];
	const flushList = () => {
		if (!listItems.length) return;
		html.push(`<ul>${listItems.join("")}</ul>`);
		listItems = [];
	};

	for (const block of value) {
		const children = Array.isArray(block?.children) ? block.children : [];
		const inner = children.map((child: any) => markToHtml(child?.text || "", child?.marks, block?.markDefs)).join("");
		if (!inner.trim()) continue;
		if (block?.listItem === "bullet") {
			listItems.push(`<li>${inner}</li>`);
			continue;
		}
		flushList();
		const style = block?.style || "normal";
		if (["h2", "h3", "h4"].includes(style)) html.push(`<${style}>${inner}</${style}>`);
		else html.push(`<p>${inner}</p>`);
	}
	flushList();
	return html.join("");
}
function setText($: CheerioAPI, selector: string, value: unknown) {
	if (value !== undefined && value !== null) $(selector).first().text(String(value));
}

function setHtml($: CheerioAPI, selector: string, value: unknown) {
	if (value !== undefined && value !== null) $(selector).first().html(richTextToHtml(value));
}

function setButton($: CheerioAPI, selector: string, text: unknown, href: unknown) {
	const button = $(selector).first();
	if (!button.length) return;
	if (href) button.attr("href", String(href));
	if (text) button.find(".astro-button-text").first().text(String(text));
}

function updateIntroCarousel($: CheerioAPI, images: unknown[]) {
	const section = $(".astro-element-f3e1e4c");
	const wrapper = section.find(".astro-element-b4c8e33 .swiper-wrapper").first();
	const template = wrapper.find(".swiper-slide").first().clone();
	if (!wrapper.length || !template.length) return;
	const sorted = sortEntries(images);
	if (!sorted.length) return;
	wrapper.empty();
	sorted.forEach((item, index) => {
		const data = entryData(item);
		const img = imageData(data);
		const slide = template.clone();
		slide.attr("aria-label", `${index + 1} / ${sorted.length}`);
		slide.find("img").first().attr("src", img.src).attr("alt", img.alt).removeAttr("srcset").removeAttr("sizes");
		wrapper.append(slide);
	});
}

function locationsHtml(value: string) {
	const parts = String(value || "").split("|").map((item) => item.trim()).filter(Boolean);
	return parts.length ? parts.map((part) => `<span>${escapeHtml(part)}</span>`).join(" | ") : "";
}

function parseStringList(value: unknown) {
	if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
		} catch {}
		return value.split("|").map((item) => item.trim()).filter(Boolean);
	}
	return [];
}

function locationLookup(locations: unknown[]) {
	const bySlug = new Map<string, string>();
	sortEntries(locations).forEach((item) => {
		const data = entryData(item);
		const slug = locationSlugOf(data);
		const name = String(data.name || "").trim();
		if (slug && name) bySlug.set(slug, name);
	});
	return bySlug;
}

function slugifyLocationName(name: unknown) {
	return String(name || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function locationSlugOf(data: any) {
	const explicit = String(data.slug || data.id || "").trim();
	if (explicit.includes("-")) return explicit;
	return slugifyLocationName(data.name);
}

function staffSlugs(data: any) {
	return parseStringList(data.location_slugs);
}

function staffLocationLabels(data: any, locationsBySlug: Map<string, string>) {
	const labels = staffSlugs(data).map((slug) => locationsBySlug.get(slug)).filter(Boolean);
	return labels.length ? labels.join(" | ") : String(data.locations || "");
}

function updateStaffCard($: CheerioAPI, card: any, data: any, index: number, locationsBySlug: Map<string, string>) {
	const img = imageData(data);
	const href = localHref(data.profileUrl || data.profile_url);
	card.removeClass((_, className) => (className.match(/e-loop-item-\S+|post-\S+|location-\S+/g) || []).join(" "));
	card.addClass(`e-loop-item-${index + 1}`);
	staffSlugs(data).forEach((slug: string) => card.addClass(`location-${slug}`));
	card.attr("data-swiper-slide-index", String(index));
	card.find("a").attr("href", href);
	card.find("img").first().attr("src", img.src).attr("alt", img.alt).removeAttr("srcset").removeAttr("sizes");
	card.find(".astro-element-8234441 .astro-heading-title, .astro-element-a22e63f .astro-heading-title a").first().text(data.name || "");
	card.find(".astro-element-1866741 .astro-heading-title, .astro-element-0ee14bb .astro-heading-title").first().text(data.role || "");
	card.find(".astro-element-3cd6206 .astro-heading-title").first().html(locationsHtml(staffLocationLabels(data, locationsBySlug)));
}

function updateStaffCarousel($: CheerioAPI, staff: unknown[], locations: unknown[]) {
	const section = $(".astro-element-6e2ff94");
	const wrapper = section.find(".swiper-wrapper").first();
	const template = wrapper.find(".swiper-slide").first().clone();
	const style = wrapper.children("style").first().clone();
	if (!wrapper.length || !template.length) return;
	const sorted = sortEntries(staff);
	if (!sorted.length) return;
	const locationsBySlug = locationLookup(locations);
	wrapper.empty();
	if (style.length) wrapper.append(style);
	sorted.forEach((item, index) => {
		const data = entryData(item);
		const slide = template.clone();
		slide.attr("aria-label", `${index + 1} / ${sorted.length}`);
		updateStaffCard($, slide, data, index, locationsBySlug);
		wrapper.append(slide);
	});
}

export function setSplitHeading($: CheerioAPI, sectionSelector: string, heading: unknown, continuation: unknown) {
	const title = $(sectionSelector).find("h2.astro-heading-title").first();
	if (!title.length || !heading) return;
	const main = String(heading);
	const sub = continuation ? String(continuation) : "";
	title.html(sub ? `${escapeHtml(main)} <br><span class="sub-heading-design">${escapeHtml(sub)}</span>` : escapeHtml(main));
}
function phoneToTelHref(phone: unknown) {
	const digits = String(phone || "").replace(/\D/g, "");
	if (!digits) return "#";
	if (digits.length === 10) return `tel:+1${digits}`;
	if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
	return `tel:+${digits}`;
}

function mapsEmbedUrl(query: unknown) {
	const text = String(query || "").trim();
	if (!text) return "";
	return `https://maps.google.com/maps?q=${encodeURIComponent(text)}&t=m&z=14&output=embed&iwloc=near`;
}

function fieldValue(data: any, camel: string, snake: string) {
	return data?.[camel] ?? data?.[snake] ?? "";
}

function locationPageLookup(locationPages: unknown[] = []) {
	const bySlug = new Map<string, any>();
	sortEntries(locationPages).forEach((item) => {
		const data = entryData(item);
		const slug = String(data.location_slug || data.slug || data.id || "").trim();
		if (slug) bySlug.set(slug, data);
	});
	return bySlug;
}

function mergedLocationData(location: any, locationPagesBySlug: Map<string, any>) {
	const slug = locationSlugOf(location);
	return { ...location, ...(locationPagesBySlug.get(slug) || {}) };
}

function updateImageElement(image: any, imageValue: any) {
	const data = imageData(imageValue);
	if (!image.length || !data.src) return;
	image.attr("src", data.src).attr("alt", data.alt).removeAttr("srcset").removeAttr("sizes");
}

function updateGalleryImage(element: any, imageValue: any) {
	const data = imageData(imageValue);
	if (!element.length || !data.src) return;
	element.attr("data-thumbnail", data.src).attr("aria-label", data.alt).css("background-image", `url(${data.src})`);
}

function updateLocationPanelStaff($: CheerioAPI, panel: any, locationSlug: string, staff: unknown[], locationsBySlug: Map<string, string>) {
	const grid = panel.find(".astro-loop-container").filter((_, element) => $(element).find(".e-loop-item.astro-220").length > 0).first();
	const template = grid.find(".e-loop-item.astro-220").first().clone();
	if (!grid.length || !template.length) return;
	grid.find(".e-loop-item.astro-220").remove();
	const assigned = sortEntries(staff).filter((item) => staffSlugs(entryData(item)).includes(locationSlug));
	assigned.forEach((item, index) => {
		const card = template.clone();
		updateStaffCard($, card, entryData(item), index, locationsBySlug);
		grid.append(card);
	});
}

function updateLocationPanel($: CheerioAPI, panel: any, data: any, staff: unknown[], locationsBySlug: Map<string, string>) {
	const address = fieldValue(data, "address", "address");
	const phone = fieldValue(data, "phone", "phone");
	const appointmentUrl = fieldValue(data, "appointmentUrl", "appointment_url");
	const directionsUrl = fieldValue(data, "directionsUrl", "directions_url");
	const mapsQuery = fieldValue(data, "googleMapsQuery", "google_maps_query") || `America's Best Hearing ${address}`;
	const mapSrc = mapsEmbedUrl(mapsQuery);
	const locationSlug = locationSlugOf(data);

	panel.find(".astro-element-b4da925 h2.astro-heading-title").first().text(data.name);
	panel.find(".astro-element-7389a81 .astro-heading-title").first().text(`Our Staff at ${data.name}`);
	panel.find(".astro-element-6d13856").first().attr("href", directionsUrl || "#");
	panel.find(".astro-element-ff4b181 h3.astro-heading-title").first().text(address);
	panel.find(".astro-element-b13c42d").first().attr("href", phoneToTelHref(phone));
	panel.find(".astro-element-a8ef483 h3.astro-heading-title").first().html(`<strong> Text or call: </strong>${escapeHtml(phone)}`);
	panel.find(".astro-element-b977eb5 a").first().attr("href", directionsUrl || "#").attr("target", "_blank").attr("rel", "noopener");
	panel.find(".astro-element-62dc465 a").first().attr("href", appointmentUrl || "#");
	if (mapSrc) panel.find("iframe").first().attr("src", mapSrc).attr("title", String(mapsQuery)).attr("aria-label", String(mapsQuery));

	updateImageElement(panel.find(".astro-widget-theme-post-featured-image img, .astro-widget-image img").first(), data.featured_image);
	const galleryImages = panel.find(".astro-widget-gallery .e-gallery-image");
	updateGalleryImage(galleryImages.eq(0), data.gallery_image_1);
	updateGalleryImage(galleryImages.eq(1), data.gallery_image_2);
	if (locationSlug) updateLocationPanelStaff($, panel, locationSlug, staff, locationsBySlug);
}

export function updateOfficeLocationTabs($: CheerioAPI, sectionSelector: string, locations: unknown[], staff: unknown[], locationPages: unknown[] = []) {
	const section = $(sectionSelector).first();
	if (!section.length) return;
	const sorted = sortEntries(locations);
	if (!sorted.length) return;
	const locationsBySlug = locationLookup(sorted);
	const locationPagesBySlug = locationPageLookup(locationPages);
	const buttons = section.find(".e-n-tabs-heading .e-n-tab-title");
	const panels = section.find('[role="tabpanel"]');
	const heading = section.find(".e-n-tabs-heading").first();
	const panelParent = panels.first().parent();
	const buttonTemplate = buttons.first().clone();
	const panelTemplate = panels.first().clone();

	if (!heading.length || !panelParent.length || !buttonTemplate.length || !panelTemplate.length) return;

	buttons.remove();
	panels.remove();

	sorted.forEach((item, index) => {
		const baseData = entryData(item);
		const data = mergedLocationData(baseData, locationPagesBySlug);
		const slug = locationSlugOf(baseData);
		const titleId = `abh-location-tab-${slug}`;
		const panelId = `abh-location-panel-${slug}`;
		const active = index === 0;
		const button = buttonTemplate.clone();

		button.attr("id", titleId);
		button.attr("aria-controls", panelId);
		button.attr("aria-selected", active ? "true" : "false");
		button.attr("tabindex", active ? "0" : "-1");
		button.find(".e-n-tab-title-text").first().text(` ${data.name} `);
		heading.append(button);

		const panel = panelTemplate.clone();
		panel.attr("id", panelId);
		panel.attr("aria-labelledby", titleId);
		panel.attr("aria-hidden", active ? "false" : "true");
		if (active) panel.removeAttr("hidden");
		else panel.attr("hidden", "hidden");
		panel.toggleClass("e-active", active);
		panel.css("display", active ? "flex" : "none");
		updateLocationPanel($, panel, data, staff, locationsBySlug);
		panelParent.append(panel);
	});
}

function updateLocationTabs($: CheerioAPI, locations: unknown[], staff: unknown[], locationPages: unknown[] = []) {
	updateOfficeLocationTabs($, ".astro-element-dd08e84", locations, staff, locationPages);
}
export function updateAccordion($: CheerioAPI, sectionSelector: string, heading: unknown, items: unknown[]) {
	const section = $(sectionSelector).first();
	if (!section.length) return;
	if (heading) section.find("h2.astro-heading-title").first().text(String(heading));
	const details = section.find("details.e-n-accordion-item");
	const sorted = sortEntries(items);
	if (!sorted.length) return;
	details.each((index, element) => {
		const detail = $(element);
		const data = entryData(sorted[index]);
		if (!data?.title && !data?.question) {
			detail.remove();
			return;
		}
		detail.find(".e-n-accordion-item-title-text").first().text(data.title || data.question || "");
		const body = data.body || data.answer;
		if (body) detail.find(".astro-widget-text-editor .astro-widget-container").first().html(richTextToHtml(body));
		const linkUrl = data.link_url || data.button_url || data.url || "";
		if (linkUrl) detail.find(".astro-button").first().attr("href", String(linkUrl));
	});
}

function updateNews($: CheerioAPI, home: any, posts: unknown[]) {
	const section = $(".astro-element-f660051").first();
	if (!section.length) return;
	if (home?.news?.kicker) section.find(".astro-element-eb79a67 .astro-heading-title").first().text(home.news.kicker);
	if (home?.news?.heading) section.find(".astro-element-ae5e690 h2.astro-heading-title").first().text(home.news.heading);
	if (home?.news?.body) section.find(".astro-element-27258ea .astro-widget-container").first().html(richTextToHtml(home.news.body));
	const sorted = sortPosts(posts);
	if (!sorted.length) return;
	const cards = section.find(".e-loop-item");
	if (!cards.length) return;
	cards.each((index, element) => {
		const card = $(element);
		const data = entryData(sorted[index]);
		if (!data?.title) {
			card.remove();
			return;
		}
		const img = imageData(data);
		const href = localHref(data.url || data.link_url || `/${data.slug || data.id || ""}/`);
		const dateText = formatDate(data.date || data.publishedAt || data.published_at || data.createdAt || data.created_at);
		const excerpt = truncateWords(plainTextFromPortable(data.content), 15);
		const category = data.category || data.category_label || "";
		card.find("a").attr("href", href);
		if (img.src) card.find("img").first().attr("src", img.src).attr("alt", img.alt || data.title || "").removeAttr("srcset").removeAttr("sizes");
		card.find(".astro-heading-title").first().html(`<a href="${escapeHtml(href)}">${escapeHtml(data.title)}</a>`);
		card.find(".astro-post-info__item--type-date time").first().text(dateText).attr("datetime", String(data.publishedAt || data.published_at || data.createdAt || data.created_at || ""));
		const infoItems = card.find(".astro-post-info__item");
		if (category && infoItems.length > 1) infoItems.eq(1).text(category);
		card.find(".astro-widget-theme-post-excerpt .astro-widget-container").first().text(excerpt);
	});
}

export function renderHomepageHtml(rawHtml: string, props: any) {
	const $ = load(rawHtml, { decodeEntities: false });
	const home = props.home || {};

	setText($, ".astro-element-82bd10f .astro-heading-title", home.hero?.eyebrow);
	setText($, ".astro-element-23947cf .astro-heading-title", home.hero?.headline);
	setButton($, ".astro-element-26a33ab a", home.hero?.ctaText, home.hero?.ctaUrl);

	setText($, ".astro-element-338f4ee .astro-heading-title", home.intro?.kicker);
	setText($, ".astro-element-4521674 .astro-heading-title", home.intro?.headline);
	setHtml($, ".astro-element-b0f1c35 .astro-widget-container", home.intro?.body);
	setButton($, ".astro-element-8c7d959 a", home.intro?.primaryCtaText, home.intro?.primaryCtaUrl);
	setButton($, ".astro-element-060c211 a", home.intro?.secondaryCtaText, home.intro?.secondaryCtaUrl);
	updateIntroCarousel($, props.images || []);

	setText($, ".astro-element-19e710b .astro-heading-title", home.about?.heading);
	setHtml($, ".astro-element-286c6b3 .astro-widget-container", home.about?.body);
	updateStaffCarousel($, props.staff || [], props.locations || []);

	setText($, ".astro-element-dd08e84 h2.astro-heading-title", home.locations?.heading);
	setHtml($, ".astro-element-dd08e84 .astro-widget-text-editor .astro-widget-container", home.locations?.body);
	updateLocationTabs($, props.locations || [], props.staff || [], props.locationPages || []);

	setSplitHeading($, ".astro-element-a213ca1", home.audiologyServices?.heading, home.audiologyServices?.continuation);
	updateAccordion($, ".astro-element-a213ca1", null, props.audiologyServices || []);
	setSplitHeading($, ".astro-element-1d16746", home.hearingAidServices?.heading, home.hearingAidServices?.continuation);
	updateAccordion($, ".astro-element-1d16746", null, props.hearingAidServices || []);
	updateAccordion($, ".astro-element-cc96ae1", home.faq?.heading, props.faqs || []);
	setHtml($, ".astro-element-cc96ae1 .astro-widget-text-editor .astro-widget-container", home.faq?.body);

	setText($, ".astro-element-b8edb83 .astro-element-18be67f3 .astro-heading-title", home.testimonials?.heading);
	setText($, ".astro-element-b8edb83 .astro-element-2737805 h2.astro-heading-title", home.testimonials?.subheading);
	updateNews($, home, props.posts || []);

	return $.root().html() || rawHtml;
}







