import { load, type CheerioAPI } from "cheerio";
import { homepageDefaults } from "../../../data/homepage-defaults";
import { setSplitHeading, updateAccordion } from "../home/homepage-original-renderer";

const escapeHtml = (value: unknown) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

export const entryData = (item: any) => (item?.data ? { id: item.id, slug: item.slug || item.id, ...item.data } : item ?? {});

const sortEntries = (items: unknown[]) =>
	[...(items || [])].sort(
		(a: any, b: any) =>
			Number(entryData(a).sort_order ?? entryData(a).sortOrder ?? 0) -
			Number(entryData(b).sort_order ?? entryData(b).sortOrder ?? 0),
	);

function localHref(value: unknown) {
	const href = String(value || "").trim();
	if (!href) return "#";
	return (
		href
			.replace(/^https?:\/\/(?:www\.)?americasbesthearing\.com/i, "")
			.replace(/^https?:\/\/localhost:4321/i, "")
			.replace(/^https?:\/\/127\.0\.0\.1:4321/i, "") || "/"
	);
}

function imageData(value: any) {
	const image = value?.featured_image || value?.image || value;
	const storageKey = image?.meta?.storageKey || image?.storageKey;
	return {
		src: image?.src || image?.url || (storageKey ? `/_emdash/api/media/file/${storageKey}` : ""),
		alt: image?.alt || value?.title || value?.name || "",
	};
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

function slugifyLocationName(name: unknown) {
	return String(name || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function locationSlugOf(data: any) {
	const explicit = String(data.slug || data.id || "").trim();
	if (explicit.includes("-")) return explicit;
	return slugifyLocationName(data.name);
}

function parseStringList(value: unknown) {
	if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
		} catch {}
		return value
			.split("|")
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [];
}

function staffSlugs(data: any) {
	return parseStringList(data.location_slugs);
}

export function findLocation(locations: unknown[], locationSlug: string) {
	return sortEntries(locations)
		.map(entryData)
		.find((location) => locationSlugOf(location) === locationSlug);
}

export function locationPageTitle(location: any) {
	const cityName = String(location?.name || "").trim();
	return String(location?.page_title || "").trim() || (cityName ? `America’s Best Hearing | Hearing Aids In ${cityName}` : "America’s Best Hearing");
}

export function locationPageDescription(location: any) {
	const cityName = String(location?.name || "").trim();
	return String(location?.meta_description || "").trim() || (cityName ? `America’s Best Hearing provides expert hearing care and hearing aids in ${cityName}.` : "");
}

function findLocationPage(locationPages: unknown[] = [], locationSlug: string) {
	return sortEntries(locationPages)
		.map(entryData)
		.find((page) => page.location_slug === locationSlug || page.slug === locationSlug || page.id === locationSlug);
}

function portableTextToHtml(blocks: unknown) {
	if (!Array.isArray(blocks)) return "";
	return blocks
		.map((block: any) => {
			const children = Array.isArray(block?.children) ? block.children : [];
			const text = children.map((child: any) => escapeHtml(child?.text || "")).join("");
			if (!text.trim()) return "";
			if (block?.style === "h2") return `<h2>${text}</h2>`;
			if (block?.style === "h3") return `<h3>${text}</h3>`;
			return `<p>${text}</p>`;
		})
		.filter(Boolean)
		.join("");
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

function locationPageLookup(locationPages: unknown[] = []) {
	const bySlug = new Map<string, any>();
	sortEntries(locationPages).forEach((item) => {
		const data = entryData(item);
		const slug = String(data.location_slug || data.slug || data.id || "").trim();
		if (slug) bySlug.set(slug, data);
	});
	return bySlug;
}

function updateButton(button: any, href: unknown, text?: unknown) {
	if (!button.length) return;
	if (href) button.attr("href", String(href));
	if (text) button.find(".astro-button-text").first().text(String(text));
}

function updateStaffCard($: CheerioAPI, card: any, data: any, index: number) {
	const href = localHref(data.profile_url || data.profileUrl);
	const img = imageData(data);
	card.removeClass((_, className) => (className.match(/e-loop-item-\S+|post-\S+|location-\S+/g) || []).join(" "));
	card.addClass(`e-loop-item-${index + 1}`);
	staffSlugs(data).forEach((slug: string) => card.addClass(`location-${slug}`));
	card.find("a").attr("href", href);
	if (img.src) {
		card.find("img").first().attr("src", img.src).attr("alt", img.alt).removeAttr("srcset").removeAttr("sizes");
	}
	card.find(".astro-element-a22e63f .astro-heading-title a, .astro-element-8234441 .astro-heading-title").first().text(data.name || "");
	card.find(".astro-element-0ee14bb .astro-heading-title, .astro-element-1866741 .astro-heading-title").first().text(data.role || "");
	card.find(".astro-element-45c9425 a").attr("href", href);
}

function updateStaffGrid($: CheerioAPI, root: any, locationSlug: string, staff: unknown[]) {
	const grid = root
		.find(".astro-loop-container")
		.filter((_, element) => $(element).find(".e-loop-item.astro-220").length > 0)
		.first();
	const template = grid.find(".e-loop-item.astro-220").first().clone();
	const style = grid.children("style").first().clone();
	if (!grid.length || !template.length) return;
	const assigned = sortEntries(staff).filter((item) => staffSlugs(entryData(item)).includes(locationSlug));
	if (!assigned.length) return;
	grid.empty();
	if (style.length) grid.append(style);
	assigned.forEach((item, index) => {
		const card = template.clone();
		updateStaffCard($, card, entryData(item), index);
		grid.append(card);
	});
}

function updateCurrentLocationSections($: CheerioAPI, location: any, locationSlug: string, staff: unknown[]) {
	const address = String(location.address || "");
	const phone = String(location.phone || "");
	const appointmentUrl = localHref(location.appointment_url || location.appointmentUrl || `/request-an-appointment-${locationSlug}/`);
	const directionsUrl = String(location.directions_url || location.directionsUrl || "#");
	const mapQuery = location.google_maps_query || location.googleMapsQuery || `America's Best Hearing ${address}`;
	const mapSrc = mapsEmbedUrl(mapQuery);
	const cityName = String(location.name || "");
	const hero = $(".hero-con, .astro-element-9b030e2").first();

	if (location.hero_eyebrow) hero.find(".astro-heading-title").filter((_, element) => /Your Hearing|Our Expertise/i.test($(element).text())).first().text(String(location.hero_eyebrow));
	if (location.hero_heading) hero.find(".astro-heading-title").filter((_, element) => /Expert Hearing Care/i.test($(element).text())).first().text(String(location.hero_heading));
	else $(".astro-element-0a3f41e .astro-heading-title").first().text(`Expert Hearing Care in ${cityName}`);
	updateButton($(".astro-element-436a971 a").first(), appointmentUrl);
	updateButton($(".astro-element-0a2f4a8 a").first(), phoneToTelHref(phone), phone);
	const h1 = $("h1.astro-heading-title").first();
	const h1Eyebrow = String(location.h1_eyebrow || "Hearing Instrument Specialist & Hearing Aids in").trim();
	const h1Heading = String(location.h1_heading || cityName).trim();
	if (h1.length) {
		h1.html(`<span class="sub-heading-design">${escapeHtml(h1Eyebrow)}</span><br> ${escapeHtml(h1Heading)}`);
	}
	const introBody = portableTextToHtml(location.intro_body);
	if (introBody) h1.closest(".e-con, .e-con-full").nextAll(".astro-widget-text-editor").first().find(".astro-widget-container").html(introBody);
	$(".astro-element-852ff14 h2.astro-heading-title").first().text(cityName);
	$(".astro-element-772d429").first().attr("href", directionsUrl).attr("target", "_blank").attr("rel", "noopener");
	$(".astro-element-7b2f70c h3.astro-heading-title").first().text(address);
	$(".astro-element-834ed7a").first().attr("href", phoneToTelHref(phone));
	$(".astro-element-f53b7e0 h3.astro-heading-title").first().html(`<strong> Text or call: </strong>${escapeHtml(phone)}`);
	updateButton($(".astro-element-8eb5048 a").first(), directionsUrl);
	updateButton($(".astro-element-65061ed a").first(), appointmentUrl);
	if (mapSrc) $(".astro-widget-google_maps iframe").first().attr("src", mapSrc).attr("title", String(mapQuery)).attr("aria-label", String(mapQuery));
	updateImageElement($(".astro-widget-theme-post-featured-image img, .astro-widget-image img").first(), location.featured_image);
	const galleryImages = $(".astro-widget-gallery .e-gallery-image");
	updateGalleryImage(galleryImages.eq(0), location.gallery_image_1);
	updateGalleryImage(galleryImages.eq(1), location.gallery_image_2);
	$(".astro-element-36f4a33 .astro-heading-title, .astro-element-fbd5118 .astro-heading-title").first().text(`Our Staff at ${cityName}`);
	updateStaffGrid($, $.root(), locationSlug, staff);
}

function updateLocationPanel($: CheerioAPI, panel: any, data: any, locationSlug: string, staff: unknown[]) {
	const address = String(data.address || "");
	const phone = String(data.phone || "");
	const appointmentUrl = localHref(data.appointment_url || data.appointmentUrl || `/request-an-appointment-${locationSlug}/`);
	const directionsUrl = String(data.directions_url || data.directionsUrl || "#");
	const mapQuery = data.google_maps_query || data.googleMapsQuery || `America's Best Hearing ${address}`;
	const mapSrc = mapsEmbedUrl(mapQuery);

	panel.find(".astro-element-b4da925 h2.astro-heading-title").first().text(data.name);
	panel.find(".astro-element-7389a81 .astro-heading-title").first().text(`Our Staff at ${data.name}`);
	panel.find(".astro-element-6d13856, .astro-element-772d429").first().attr("href", directionsUrl).attr("target", "_blank").attr("rel", "noopener");
	panel.find(".astro-element-ff4b181 h3.astro-heading-title, .astro-element-7b2f70c h3.astro-heading-title").first().text(address);
	panel.find(".astro-element-b13c42d, .astro-element-834ed7a").first().attr("href", phoneToTelHref(phone));
	panel.find(".astro-element-a8ef483 h3.astro-heading-title, .astro-element-f53b7e0 h3.astro-heading-title").first().html(`<strong> Text or call: </strong>${escapeHtml(phone)}`);
	panel.find(".astro-element-b977eb5 a, .astro-element-8eb5048 a").first().attr("href", directionsUrl);
	panel.find(".astro-element-62dc465 a, .astro-element-65061ed a").first().attr("href", appointmentUrl);
	if (mapSrc) panel.find("iframe").first().attr("src", mapSrc).attr("title", String(mapQuery)).attr("aria-label", String(mapQuery));
	updateImageElement(panel.find(".astro-widget-theme-post-featured-image img, .astro-widget-image img").first(), data.featured_image);
	const galleryImages = panel.find(".astro-widget-gallery .e-gallery-image");
	updateGalleryImage(galleryImages.eq(0), data.gallery_image_1);
	updateGalleryImage(galleryImages.eq(1), data.gallery_image_2);
	updateStaffGrid($, panel, locationSlug, staff);
}

function findOfficeLocationsSection($: CheerioAPI) {
	const lansingSection = $(".astro-element-9cf2d78").first();
	if (lansingSection.length) return lansingSection;

	const heading = $(".astro-heading-title, h2, h3")
		.filter((_, element) => $(element).text().trim().toLowerCase() === "our office locations")
		.first();
	return heading.parents(".e-parent, .e-con").filter((_, element) => $(element).find(".e-n-tabs").length > 0).first();
}

function updateLocationTabs($: CheerioAPI, locations: unknown[], staff: unknown[], locationPages: unknown[] = []) {
	const section = findOfficeLocationsSection($);
	if (!section.length) return;
	const sorted = sortEntries(locations);
	if (!sorted.length) return;
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
		const locationSlug = locationSlugOf(baseData);
		const data = { ...baseData, ...(locationPagesBySlug.get(locationSlug) || {}) };
		const active = index === 0;
		const titleId = `abh-location-tab-${locationSlug}`;
		const panelId = `abh-location-panel-${locationSlug}`;
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
		updateLocationPanel($, panel, data, locationSlug, staff);
		panelParent.append(panel);
	});
}

function normalizeSharedSections(home: any = {}, page: any = {}) {
	return {
		audiologyServices: {
			heading: page.audiology_services_heading || home.audiology_services_heading || homepageDefaults.audiologyServices.heading,
			continuation: page.audiology_services_heading_continuation || home.audiology_services_heading_continuation || homepageDefaults.audiologyServices.continuation,
		},
		hearingAidServices: {
			heading: page.hearing_aid_services_heading || home.hearing_aid_services_heading || homepageDefaults.hearingAidServices.heading,
			continuation: page.hearing_aid_services_heading_continuation || home.hearing_aid_services_heading_continuation || homepageDefaults.hearingAidServices.continuation,
		},
		faq: {
			heading: home.faq_heading || homepageDefaults.faq.heading,
			body: home.faq_body || homepageDefaults.faq.body,
		},
	};
}

export function renderLocationPageHtml(
	rawHtml: string,
	props: {
		locationSlug: string;
		locations: unknown[];
		locationPages?: unknown[];
		staff: unknown[];
		home?: any;
		audiologyServices?: unknown[];
		hearingAidServices?: unknown[];
		faqs?: unknown[];
	},
) {
	const $ = load(rawHtml, { decodeEntities: false });
	const location = findLocation(props.locations, props.locationSlug);
	if (!location) return rawHtml;
	const locationPage = findLocationPage(props.locationPages || [], props.locationSlug);
	const pageLocation = { ...location, ...locationPage };
	const shared = normalizeSharedSections(props.home, pageLocation);

	updateCurrentLocationSections($, pageLocation, props.locationSlug, props.staff || []);
	updateLocationTabs($, props.locations || [], props.staff || [], props.locationPages || []);
	setSplitHeading($, ".astro-element-a213ca1, .astro-element-217ba24", shared.audiologyServices.heading, shared.audiologyServices.continuation);
	updateAccordion($, ".astro-element-a213ca1, .astro-element-217ba24", null, props.audiologyServices || []);
	setSplitHeading($, ".astro-element-1d16746, .astro-element-5afd0204", shared.hearingAidServices.heading, shared.hearingAidServices.continuation);
	updateAccordion($, ".astro-element-1d16746, .astro-element-5afd0204", null, props.hearingAidServices || []);
	updateAccordion($, ".astro-element-cc96ae1, .astro-element-6bf3c8af", shared.faq.heading, props.faqs || []);
	if (shared.faq.body) $(".astro-element-cc96ae1 .astro-widget-text-editor .astro-widget-container, .astro-element-6bf3c8af .astro-widget-text-editor .astro-widget-container").first().html(portableTextToHtml(shared.faq.body));

	return $("body").html() || $.root().html() || rawHtml;
}


