import { load, type CheerioAPI } from "cheerio";
import { homepageDefaults } from "../../../data/homepage-defaults";
import { setSplitHeading, updateAccordion } from "../home/homepage-original-renderer";
import { locationSlugOf } from "../location/location-page-renderer";

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

function parseStringList(value: unknown) {
	const parsed = parseJsonLike(value);
	if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
	if (typeof parsed === "string") {
		return parsed
			.split("|")
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [];
}

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
	const image = parseJsonLike(value?.featured_image || value?.image || value);
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

function portableTextToHtml(blocks: unknown) {
	const parsed = parseJsonLike(blocks);
	if (!Array.isArray(parsed)) return "";
	return parsed
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

function updateButton(button: any, href: unknown, text?: unknown) {
	if (!button.length) return;
	if (href) button.attr("href", String(href));
	if (text) button.find(".astro-button-text").first().text(String(text));
}

function findBySlug(items: unknown[], slug: string) {
	return sortEntries(items)
		.map(entryData)
		.find((item) => String(item.slug || item.id) === slug || String(item.location_slug || item.staff_slug) === slug);
}

export function findStaff(staff: unknown[], staffSlug: string, profilePath: string) {
	const normalizedPath = localHref(profilePath).replace(/\/+$/, "/");
	return sortEntries(staff)
		.map(entryData)
		.find((item) => {
			const profile = localHref(item.profile_url || item.profileUrl).replace(/\/+$/, "/");
			return String(item.slug || item.id) === staffSlug || profile === normalizedPath;
		});
}

function findStaffPage(staffPages: unknown[], staffSlug: string) {
	return sortEntries(staffPages)
		.map(entryData)
		.find((item) => String(item.staff_slug || item.slug || item.id) === staffSlug);
}

function locationLabelsForStaff(staff: any, locations: unknown[]) {
	const bySlug = new Map(sortEntries(locations).map((item) => [locationSlugOf(entryData(item)), entryData(item)]));
	const labels = parseStringList(staff.location_slugs).map((slug) => bySlug.get(slug)?.name).filter(Boolean);
	if (labels.length) return labels.join(" | ");
	return String(staff.locations || "");
}

function updateLocationItem($: CheerioAPI, item: any, location: any, locationPage: any) {
	const pageLocation = { ...location, ...locationPage };
	const locationSlug = locationSlugOf(location);
	const address = String(location.address || "");
	const phone = String(location.phone || "");
	const appointmentUrl = localHref(location.appointment_url || location.appointmentUrl || `/request-an-appointment-${locationSlug}/`);
	const directionsUrl = String(location.directions_url || location.directionsUrl || "#");
	const mapQuery = location.google_maps_query || location.googleMapsQuery || `America's Best Hearing ${address}`;
	const mapSrc = mapsEmbedUrl(mapQuery);

	item.find(".astro-element-b4da925 h2.astro-heading-title").first().text(location.name || "");
	item.find(".astro-element-6d13856").first().attr("href", directionsUrl).attr("target", "_blank").attr("rel", "noopener");
	item.find(".astro-element-ff4b181 h3.astro-heading-title").first().text(address);
	item.find(".astro-element-b13c42d").first().attr("href", phoneToTelHref(phone));
	item.find(".astro-element-a8ef483 h3.astro-heading-title").first().html(`<strong> Text or call: </strong>${escapeHtml(phone)}`);
	item.find(".astro-element-b977eb5 a").first().attr("href", directionsUrl);
	item.find(".astro-element-62dc465 a").first().attr("href", appointmentUrl);
	if (mapSrc) item.find("iframe").first().attr("src", mapSrc).attr("title", String(mapQuery)).attr("aria-label", String(mapQuery));
	updateImageElement(item.find(".astro-element-5d11163 img").first(), pageLocation.featured_image);
	const galleryImages = item.find(".astro-element-da4b4b2 .e-gallery-image");
	updateGalleryImage(galleryImages.eq(0), pageLocation.gallery_image_1);
	updateGalleryImage(galleryImages.eq(1), pageLocation.gallery_image_2);
}

function updateStaffAssignedLocations($: CheerioAPI, staff: any, locations: unknown[], locationPages: unknown[]) {
	const grid = $(".astro-element-e8a3fc8 .astro-loop-container").first();
	const template = grid.find(".e-loop-item").first().clone();
	const style = grid.children("style").first().clone();
	if (!grid.length || !template.length) return;
	const slugs = parseStringList(staff.location_slugs);
	const locationData = slugs.map((slug) => findBySlug(locations, slug)).filter(Boolean);
	if (!locationData.length) return;
	grid.empty();
	if (style.length) grid.append(style);
	locationData.forEach((location, index) => {
		const item = template.clone();
		item.removeClass((_, className) => (className.match(/e-loop-item-\S+|post-\S+|location-\S+/g) || []).join(" "));
		item.addClass(`e-loop-item-${index + 1} location-${locationSlugOf(location)}`);
		const locationPage = findBySlug(locationPages, locationSlugOf(location));
		updateLocationItem($, item, location, locationPage || {});
		grid.append(item);
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
	};
}

export function staffPageTitle(staff: any, staffPage: any) {
	return String(staffPage?.page_title || "").trim() || (staff?.name ? `${staff.name} | America's Best Hearing` : "America's Best Hearing");
}

export function staffPageDescription(staff: any, staffPage: any) {
	return String(staffPage?.meta_description || "").trim() || (staff?.name ? `${staff.name} is part of the America's Best Hearing team.` : "");
}

export function renderStaffPageHtml(
	rawHtml: string,
	props: {
		staffSlug: string;
		profilePath: string;
		staff: unknown[];
		staffPages?: unknown[];
		locations: unknown[];
		locationPages?: unknown[];
		home?: any;
		audiologyServices?: unknown[];
		hearingAidServices?: unknown[];
	},
) {
	const $ = load(rawHtml, { decodeEntities: false });
	const staff = findStaff(props.staff || [], props.staffSlug, props.profilePath);
	if (!staff) return rawHtml;
	const staffPage = findStaffPage(props.staffPages || [], String(staff.slug || staff.id)) || {};
	const shared = normalizeSharedSections(props.home, staffPage);

	$(".astro-element-3caea1a h1.astro-heading-title").first().text(staff.name || "");
	$(".astro-element-41449f0 .astro-heading-title").first().text(staff.role || "");
	updateImageElement($(".astro-element-ee60029 img").first(), staff.image || staff);
	$(".astro-element-31c12d5 .astro-heading-title").first().text(`Location: ${locationLabelsForStaff(staff, props.locations || [])}`);
	const introHtml = portableTextToHtml(staffPage.intro_body);
	if (introHtml) $(".astro-element-9736eea .astro-widget-container").first().html(introHtml);
	updateStaffAssignedLocations($, staff, props.locations || [], props.locationPages || []);

	setSplitHeading($, ".astro-element-a213ca1, .astro-element-217ba24", shared.audiologyServices.heading, shared.audiologyServices.continuation);
	updateAccordion($, ".astro-element-a213ca1, .astro-element-217ba24", null, props.audiologyServices || []);
	setSplitHeading($, ".astro-element-1d16746, .astro-element-5afd0204", shared.hearingAidServices.heading, shared.hearingAidServices.continuation);
	updateAccordion($, ".astro-element-1d16746, .astro-element-5afd0204", null, props.hearingAidServices || []);

	return $("body").html() || $.root().html() || rawHtml;
}

