import { load, type CheerioAPI } from "cheerio";
import { richTextToHtml, updateOfficeLocationTabs } from "../home/homepage-original-renderer";
import { updateInternalPageCta } from "../internal-page-cta-renderer";

const escapeHtml = (value: unknown) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const entryData = (item: any) => (item?.data ? { id: item.id, slug: item.slug || item.id, ...item.data } : item ?? {});

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

function slugify(value: unknown) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function locationSlugOf(data: any) {
	const explicit = String(data.slug || data.id || "").trim();
	if (explicit.includes("-")) return explicit;
	return slugify(data.name);
}

function phoneToTelHref(phone: unknown) {
	const digits = String(phone || "").replace(/\D/g, "");
	if (!digits) return "#";
	if (digits.length === 10) return `tel:+1${digits}`;
	if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
	return `tel:+${digits}`;
}

function plainTextFromPortable(value: any) {
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

function locationPageLookup(locationPages: unknown[] = []) {
	const bySlug = new Map<string, any>();
	sortEntries(locationPages).forEach((item) => {
		const data = entryData(item);
		const slug = String(data.location_slug || data.slug || data.id || "").trim();
		if (slug) bySlug.set(slug, data);
	});
	return bySlug;
}

function locationLabelsForStaff(data: any, locations: unknown[]) {
	const bySlug = new Map(sortEntries(locations).map((item) => {
		const location = entryData(item);
		return [locationSlugOf(location), String(location.name || "")];
	}));
	const labels = parseStringList(data.location_slugs).map((slug) => bySlug.get(slug)).filter(Boolean);
	return labels.length ? labels.join(" | ") : String(data.locations || "");
}

function locationsHtml(value: string) {
	const parts = String(value || "").split("|").map((item) => item.trim()).filter(Boolean);
	return parts.length ? parts.map((part) => `<span>${escapeHtml(part)}</span>`).join(" | ") : "";
}

function updateStaffCard($: CheerioAPI, card: any, data: any, index: number, locations: unknown[]) {
	const img = imageData(data);
	const href = localHref(data.profileUrl || data.profile_url || `/${slugify(data.role)}/${data.slug || slugify(data.name)}/`);
	card.removeClass((_, className) => (className.match(/e-loop-item-\S+|post-\S+|location-\S+/g) || []).join(" "));
	card.addClass(`e-loop-item-${index + 1}`);
	parseStringList(data.location_slugs).forEach((slug: string) => card.addClass(`location-${slug}`));
	card.find("a").attr("href", href);
	if (img.src) card.find("img").first().attr("src", img.src).attr("alt", img.alt).removeAttr("srcset").removeAttr("sizes");
	card.find(".astro-element-8234441 .astro-heading-title, .astro-element-a22e63f .astro-heading-title a").first().text(data.name || "");
	card.find(".astro-element-1866741 .astro-heading-title, .astro-element-0ee14bb .astro-heading-title").first().text(data.role || "");
	card.find(".astro-element-3cd6206 .astro-heading-title").first().html(locationsHtml(locationLabelsForStaff(data, locations)));
}

export function renderPageWithOfficeLocations(
	rawHtml: string,
	props: { sectionSelector: string; locations: unknown[]; locationPages?: unknown[]; staff?: unknown[] },
) {
	const $ = load(rawHtml, { decodeEntities: false });
	updateOfficeLocationTabs($, props.sectionSelector, props.locations || [], props.staff || [], props.locationPages || []);
	return $.root().html() || rawHtml;
}

function editableTextWidgets($: CheerioAPI, sectionSelector = "") {
	return $(".astro-widget-text-editor .astro-widget-container")
		.filter((_, element) => {
			const text = $(element).text().replace(/\s+/g, " ").trim();
			const insideSkippedSection = sectionSelector ? $(element).closest(sectionSelector).length > 0 : false;
			return Boolean(text) && !insideSkippedSection && !/^Home\s*»/i.test(text);
		})
		.toArray()
		.map((element) => $(element));
}

function updateImageElement(image: any, element: any) {
	const img = imageData(image);
	if (!img.src || !element?.length) return;
	element.attr("src", img.src).attr("alt", img.alt || "").removeAttr("srcset").removeAttr("sizes");
}

function updateImageCarousel($: CheerioAPI, sectionSelector: string, images: unknown[]) {
	const section = $(sectionSelector).first();
	const wrapper = section.find(".swiper-wrapper").first();
	const template = wrapper.find(".swiper-slide").first().clone();
	const sorted = sortEntries(images || []);
	if (!wrapper.length || !template.length || !sorted.length) return;

	wrapper.empty();
	sorted.forEach((item, index) => {
		const data = entryData(item);
		const img = imageData(data);
		const slide = template.clone();
		slide.attr("aria-label", `${index + 1} / ${sorted.length}`);
		if (img.src) slide.find("img").first().attr("src", img.src).attr("alt", img.alt).removeAttr("srcset").removeAttr("sizes");
		wrapper.append(slide);
	});
}

function addUtilityDividers($: CheerioAPI, target: any, content: any) {
	const pageTitle = String(content?.page_title || content?.title || "").toLowerCase();
	if (!pageTitle.includes("insurance")) return;
	target.find("h2").each((_, heading) => {
		const node = $(heading);
		if (node.prev(".abh-utility-divider").length) return;
		node.before('<div class="abh-utility-divider astro-divider"><span class="astro-divider-separator"></span></div>');
	});
}

export function renderAboutPageHtml(
	rawHtml: string,
	content: any,
	props: { locations: unknown[]; locationPages?: unknown[]; staff?: unknown[]; introImages?: unknown[] },
) {
	const $ = load(rawHtml, { decodeEntities: false });
	if (content?.page_title) $("h1.astro-heading-title").first().text(String(content.page_title));

	const officeSection = $(".astro-element-0bd9e70").first().clone();
	const widgets = editableTextWidgets($, ".astro-element-0bd9e70");
	if (content?.intro_content && widgets[0]) widgets[0].html(richTextToHtml(content.intro_content));
	if (content?.body_content && widgets[1]) widgets[1].html(richTextToHtml(content.body_content));
	updateImageCarousel($, ".astro-element-c69e7ab", props.introImages || []);

	if (officeSection.length) {
		$(".astro-element-0bd9e70").replaceWith(officeSection);
		updateOfficeLocationTabs($, ".astro-element-0bd9e70", props.locations || [], props.staff || [], props.locationPages || []);
	}
	return $.root().html() || rawHtml;
}

export function renderContactPageHtml(
	rawHtml: string,
	content: any,
	props: { locations: unknown[]; locationPages?: unknown[]; staff?: unknown[] },
) {
	const $ = load(rawHtml, { decodeEntities: false });
	if (content?.page_title) $("h1.astro-heading-title").first().text(String(content.page_title));

	const officeSection = $(".astro-element-b25250d").first().clone();
	const widgets = editableTextWidgets($, ".astro-element-b25250d");
	if (content?.intro_content && widgets[0]) widgets[0].html(richTextToHtml(content.intro_content));
	if (content?.email_intro && widgets[1]) widgets[1].html(richTextToHtml(content.email_intro));

	if (officeSection.length) {
		$(".astro-element-b25250d").replaceWith(officeSection);
		updateOfficeLocationTabs($, ".astro-element-b25250d", props.locations || [], props.staff || [], props.locationPages || []);
	}
	return $.root().html() || rawHtml;
}

export function renderAllLocationsHtml(rawHtml: string, props: { locations: unknown[]; locationPages?: unknown[] }) {
	const $ = load(rawHtml, { decodeEntities: false });
	const grid = $(".astro-loop-container").first();
	const template = grid.find(".e-loop-item").first().clone();
	const style = grid.children("style").first().clone();
	if (!grid.length || !template.length) return rawHtml;

	const pagesBySlug = locationPageLookup(props.locationPages || []);
	const locations = sortEntries(props.locations || []);
	if (!locations.length) return $.root().html() || rawHtml;

	grid.empty();
	if (style.length) grid.append(style);
	locations.forEach((item, index) => {
		const location = entryData(item);
		const slug = locationSlugOf(location);
		const page = pagesBySlug.get(slug) || {};
		const card = template.clone();
		const image = imageData(location.featured_image || page.featured_image);
		const pageUrl = `/audiologist-hearing-aids-${slug}/`;
		const description = plainTextFromPortable(page.intro_body) || `America's Best Hearing provides hearing care and hearing aids in ${location.name}.`;

		card.removeClass((_, className) => (className.match(/e-loop-item-\S+|post-\S+/g) || []).join(" "));
		card.addClass(`e-loop-item-${index + 1} location-${slug}`);
		card.find("a").attr("href", pageUrl);
		if (image.src) card.find("img").first().attr("src", image.src).attr("alt", image.alt || location.name || "").removeAttr("srcset").removeAttr("sizes");
		card.find(".astro-heading-title").first().text(location.name || "");
		card.find(".astro-widget-text-editor .astro-widget-container").first().html(`<p>${escapeHtml(description)}</p>`);
		grid.append(card);
	});
	return $.root().html() || rawHtml;
}

export function renderOurTeamHtml(rawHtml: string, props: { staff: unknown[]; locations: unknown[] }) {
	const $ = load(rawHtml, { decodeEntities: false });
	const grid = $(".astro-loop-container").first();
	const template = grid.find(".e-loop-item").first().clone();
	const style = grid.children("style").first().clone();
	const staff = sortEntries(props.staff || []);
	if (!grid.length || !template.length || !staff.length) return rawHtml;
	grid.empty();
	if (style.length) grid.append(style);
	staff.forEach((item, index) => {
		const card = template.clone();
		updateStaffCard($, card, entryData(item), index, props.locations || []);
		grid.append(card);
	});
	return $.root().html() || rawHtml;
}

export function renderUtilityPageHtml(rawHtml: string, content: any, internalCta?: unknown) {
	const $ = load(rawHtml, { decodeEntities: false });
	if (content?.page_title) $("h1.astro-heading-title").first().text(String(content.page_title));
	if (content?.content_body) {
		const target = $(".astro-element-7d35f86 .astro-widget-text-editor .astro-widget-container, .astro-widget-theme-post-content .astro-widget-container").first();
		if (target.length) {
			target.html(richTextToHtml(content.content_body));
			addUtilityDividers($, target, content);
		}
	}
	updateInternalPageCta($, internalCta);
	return $.root().html() || rawHtml;
}

function schedulerUrlFromPanel(panel: any) {
	return panel.find("iframe").first().attr("src") || "";
}

const fallbackSchedulerUrls: Record<string, string> = {
	"lansing-mi": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10049&embed=true",
	"portage-mi": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10082&embed=true",
	"anoka-mn": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10083&embed=true",
	"eden-prairie-mn": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10085&embed=true",
	"edina-mn": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10086&embed=true",
	"maple-grove-mn": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10084&embed=true",
	"mendota-heights-mn": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10087&embed=true",
	"new-ulm-mn": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10090&embed=true",
	"roseville-mn": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10088&embed=true",
	"willmar-mn": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10089&embed=true",
	"lake-wales-fl": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10071&embed=true",
	"sebring-fl": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10072&embed=true",
	"winter-haven-fl": "https://www.hearinghealthportal.com/scheduling/schedule.aspx?key=103472-10069&embed=true",
};

export function renderAppointmentPageHtml(rawHtml: string, content: any, props: { locations: unknown[] }) {
	const $ = load(rawHtml, { decodeEntities: false });
	const pageTitle = String(content?.page_title || content?.title || "Request An Appointment");
	const activeSlug = String(content?.default_location_slug || "").trim();
	$("h1.astro-heading-title").first().text(pageTitle);

	const section = $(".astro-element-469c1ff").first().length
		? $(".astro-element-469c1ff").first()
		: $(".astro-widget-n-tabs").first();
	const tabsRoot = section.find(".e-n-tabs").first();
	const heading = tabsRoot.children(".e-n-tabs-heading").first();
	const panelParent = tabsRoot.children(".e-n-tabs-content").first();
	const buttons = heading.children(".e-n-tab-title");
	const panels = panelParent.children('[role="tabpanel"]');
	const buttonTemplate = buttons.first().clone();
	const panelTemplate = panels.first().clone();
	if (!section.length || !tabsRoot.length || !heading.length || !panelParent.length || !buttonTemplate.length || !panelTemplate.length) {
		return $.root().html() || rawHtml;
	}

	const existingPanelsBySlug = new Map<string, any>();
	buttons.each((index, button) => {
		const name = $(button).find(".e-n-tab-title-text").first().text().replace(/\s+/g, " ").trim();
		const slug = slugify(name.replace(/,\s*/g, "-"));
		const panel = panels.eq(index);
		if (slug && panel.length) existingPanelsBySlug.set(slug, panel.clone());
	});

	const sorted = sortEntries(props.locations || []).filter((item) => {
		const data = entryData(item);
		const slug = locationSlugOf(data);
		return Boolean(String(data.scheduler_embed_url || data.schedulerEmbedUrl || fallbackSchedulerUrls[slug] || "").trim()) || existingPanelsBySlug.has(slug);
	});
	const active = sorted.find((item) => locationSlugOf(entryData(item)) === activeSlug);
	const ordered = active ? [active, ...sorted.filter((item) => locationSlugOf(entryData(item)) !== activeSlug)] : sorted;
	if (!ordered.length) return $.root().html() || rawHtml;

	buttons.remove();
	panels.remove();

	ordered.forEach((item, index) => {
		const data = entryData(item);
		const slug = locationSlugOf(data);
		const titleId = `abh-appointment-tab-${slug}`;
		const panelId = `abh-appointment-panel-${slug}`;
		const isActive = index === 0;
		const button = buttonTemplate.clone();

		button.attr("id", titleId);
		button.attr("aria-controls", panelId);
		button.attr("aria-selected", isActive ? "true" : "false");
		button.attr("tabindex", isActive ? "0" : "-1");
		button.find(".e-n-tab-title-text").first().text(` ${data.name || ""} `);
		heading.append(button);

		const sourcePanel = existingPanelsBySlug.get(slug);
		const panel = (sourcePanel || panelTemplate).clone();
		const schedulerUrl = String(data.scheduler_embed_url || data.schedulerEmbedUrl || fallbackSchedulerUrls[slug] || (sourcePanel ? schedulerUrlFromPanel(panel) : "")).trim();
		panel.attr("id", panelId);
		panel.attr("aria-labelledby", titleId);
		panel.attr("aria-hidden", isActive ? "false" : "true");
		if (isActive) panel.removeAttr("hidden");
		else panel.attr("hidden", "hidden");
		panel.toggleClass("e-active", isActive);
		panel.css("display", isActive ? "flex" : "none");
		panel.find(".astro-element-b3c1fdd .astro-heading-title").first().text(`Request An Appointment At The ${data.name || ""} Office`);
		if (schedulerUrl) {
			let iframe = panel.find("iframe").first();
			if (!iframe.length) {
				const container = panel.find(".astro-element-9379dd2 .astro-widget-container").first();
				container.html(
					`<div style="position:relative; max-width:900px; margin:auto;"><div style="position:absolute;top: -20px;left:0;right:0;height:40px;background:#ffffff;z-index:9;"></div><iframe id="ceschedule" loading="lazy" style="width:100%;height:740px;border:none;z-index:1;margin-top: -20px;"></iframe></div>`,
				);
				iframe = panel.find("iframe").first();
			}
			iframe.attr("src", schedulerUrl);
		} else panel.find("iframe").first().remove();
		panelParent.append(panel);
	});

	return $.root().html() || rawHtml;
}
