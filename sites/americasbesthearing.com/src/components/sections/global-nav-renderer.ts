import { load } from "cheerio";

const escapeHtml = (value: unknown) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");

const entryData = (item: any) => (item?.data ? { id: item.id, slug: item.slug || item.id, ...item.data } : item ?? {});

const blockedLocationSlugs = new Set(["dunedin-fl", "viera-fl", "test", "testttt", "testttttt"]);

function sortEntries(items: any[]) {
	return [...(items || [])].sort(
		(a, b) =>
			Number(entryData(a).sort_order ?? entryData(a).sortOrder ?? 999) -
			Number(entryData(b).sort_order ?? entryData(b).sortOrder ?? 999),
	);
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

function normalizeLocation(item: any) {
	const data = entryData(item);
	const slug = String(data.slug || data.id || "").trim();
	const name = String(data.name || data.title || "").trim();
	return {
		...data,
		slug,
		name,
		url: localHref(data.route_path || `/audiologist-hearing-aids-${slug}/`),
	};
}

function normalizeStaff(item: any) {
	const data = entryData(item);
	return {
		...data,
		slug: String(data.slug || data.id || "").trim(),
		name: String(data.name || data.title || "").trim(),
		url: localHref(data.profile_url || data.route_path || `/${data.staff_type || "our-team"}/${data.slug || data.id}/`),
		locationSlugs: parseList(data.location_slugs),
	};
}

function normalizeBrand(item: any) {
	const data = entryData(item);
	const slug = String(data.brand_slug || data.slug || data.id || "").trim();
	const fallbackName = String(data.page_heading || data.title || "").replace(/\s*hearing aids\s*$/i, "").trim();
	const brandName = String(data.brand_name || fallbackName).trim();
	const label = /hearing aids/i.test(brandName) ? brandName : `${brandName} Hearing Aids`;
	return {
		...data,
		slug,
		label,
		url: localHref(data.route_path || `/hearing-aids/${slug}/`),
	};
}

function parseList(value: any): string[] {
	if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
	if (!value) return [];
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return parseList(parsed);
		} catch {}
		return value.split(/[|,]/).map((item) => item.trim()).filter(Boolean);
	}
	return [];
}

function publishedRealLocations(items: any[]) {
	return sortEntries(items)
		.map(normalizeLocation)
		.filter((location) => location.slug && location.name)
		.filter((location) => !blockedLocationSlugs.has(location.slug.toLowerCase()))
		.filter((location) => !/^test/i.test(location.name));
}

function menuItem(
	label: string,
	href: string | null,
	options: { children?: string; itemClass?: string; linkClass?: string; tabindex?: boolean; noHref?: boolean } = {},
) {
	const children = options.children || "";
	const itemClasses = ["menu-item", options.itemClass || "menu-item-type-custom menu-item-object-custom", children ? "menu-item-has-children" : ""]
		.filter(Boolean)
		.join(" ");
	const linkClass = options.linkClass || "astro-sub-item";
	const tabindex = options.tabindex ? ' tabindex="-1"' : "";
	const hrefAttr = options.noHref ? "" : ` href="${escapeHtml(localHref(href || "#"))}"`;
	return `<li class="${itemClasses}"><a${hrefAttr} class="${linkClass}"${tabindex}>${escapeHtml(label)}</a>${children}</li>`;
}

function submenu(items: string[]) {
	return `<ul class="sub-menu astro-nav-menu--dropdown">${items.join("")}</ul>`;
}

function flatList(items: Array<{ label: string; url: string }>, className = "astro-item", tabindex = false) {
	return items
		.map((item) =>
			menuItem(item.label, item.url, {
				itemClass: "menu-item menu-item-type-custom menu-item-object-custom",
				linkClass: className,
				tabindex,
			}),
		)
		.join("");
}

function buildHeaderMenu(data: GlobalNavData, tabindex = false) {
	const locations = publishedRealLocations(data.locations);
	const staff = sortEntries(data.staff).map(normalizeStaff).filter((item) => item.slug && item.name && item.url);
	const brands = sortEntries(data.brands).map(normalizeBrand).filter((item) => item.slug && item.label && item.url);

	const locationItems = locations.map((location) =>
		menuItem(location.name, location.url, {
			itemClass: "menu-item menu-item-type-post_type menu-item-object-location",
			linkClass: "astro-sub-item",
			tabindex,
		}),
	);

	const staffByLocation = locations.map((location) => {
		const members = staff.filter((member) => member.locationSlugs.includes(location.slug));
		return menuItem(location.name, location.url, {
			itemClass: "menu-item menu-item-type-post_type menu-item-object-location",
			linkClass: "astro-sub-item",
			tabindex,
			children: members.length
				? submenu(
						members.map((member) =>
							menuItem(member.name, member.url, {
								itemClass: "menu-item menu-item-type-post_type menu-item-object-audiologist",
								linkClass: "astro-sub-item",
								tabindex,
							}),
						),
					)
				: "",
		});
	});

	const brandItems = brands.map((brand) =>
		menuItem(brand.label, brand.url, {
			itemClass: "menu-item menu-item-type-post_type menu-item-object-hearing-aid-brand",
			linkClass: "astro-sub-item",
			tabindex,
		}),
	);

	const services = [
		{ label: "Hearing Tests", url: "/audiology-services/hearing-tests/" },
		{ label: "Hearing Aid Fittings", url: "/audiology-services/hearing-aid-fittings/" },
		{ label: "Hearing Aid Services", url: "/audiology-services/hearing-aid-services/" },
		{ label: "Ear Wax Removal", url: "/audiology-services/ear-wax-removal/" },
		{ label: "Hearing Aid Batteries", url: "/hearing-aids-products/hearing-aid-batteries/" },
	];

	return [
		menuItem("About", "/about/", {
			itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
			linkClass: "astro-item",
			tabindex,
			children: submenu([
				menuItem("Locations", "/all-locations/", {
					itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
					linkClass: "astro-sub-item",
					tabindex,
					children: submenu(locationItems),
				}),
				menuItem("Our Team", "/our-team/", {
					itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
					linkClass: "astro-sub-item",
					tabindex,
					children: submenu(staffByLocation),
				}),
				menuItem("Insurance / Billing", "/resources/insurance/", {
					itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
					linkClass: "astro-sub-item",
					tabindex,
				}),
			]),
		}),
		menuItem("Services", "/audiology-services/", {
			itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
			linkClass: "astro-item",
			tabindex,
			children: submenu(
				services.map((service) =>
					menuItem(service.label, service.url, {
						itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
						linkClass: "astro-sub-item",
						tabindex,
					}),
				),
			),
		}),
		menuItem("Hearing Aids", "/hearing-aids-products/", {
			itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
			linkClass: "astro-item",
			tabindex,
			children: submenu([
				menuItem("Hearing Aid Brands", null, {
					itemClass: "menu-item menu-item-type-custom menu-item-object-custom",
					linkClass: "astro-sub-item",
					tabindex,
					noHref: true,
					children: submenu(brandItems),
				}),
				menuItem("Assistive Listening Devices", "/hearing-aids-products/hearing-aid-alternatives/", {
					itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
					linkClass: "astro-sub-item",
					tabindex,
				}),
				menuItem("Custom Ear Protection", "/custom-hearing-protection/", {
					itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
					linkClass: "astro-sub-item",
					tabindex,
				}),
			]),
		}),
		menuItem("Contact Us", "/contact/", {
			itemClass: "menu-item menu-item-type-post_type menu-item-object-page",
			linkClass: "astro-item",
			tabindex,
		}),
	].join("");
}

function menuItemsToList(menu: any, fallback: Array<{ label: string; url: string }>) {
	const items = Array.isArray(menu?.items) && menu.items.length ? menu.items : fallback;
	return items.map((item: any) => ({ label: item.label, url: item.url || item.custom_url || "#" }));
}

export type GlobalNavData = {
	settings?: any;
	locations: any[];
	staff: any[];
	brands: any[];
	footerServicesMenu?: any;
	footerLegalMenu?: any;
};

export function renderHeaderHtml(rawHtml: string, data: GlobalNavData) {
	const $ = load(rawHtml, { decodeEntities: false });
	const settings = entryData(data.settings);
	const locationSummary = settings.locations_summary || "13 Locations in Michigan, Minnesota, & Florida";
	const appointmentUrl = localHref(settings.appointment_url || "/request-an-appointment/");

	$(".astro-element-12e5e46 .astro-icon-list-text").text(locationSummary);
	$(".astro-element-12e5e46 a").attr("href", "/all-locations/");
	$("#menu-1-7192b37").html(buildHeaderMenu(data, false));
	$("#menu-2-7192b37").html(buildHeaderMenu(data, true));
	$(".astro-element-26a33ab .astro-button").attr("href", appointmentUrl);
	return $.html();
}

export function renderFooterHtml(rawHtml: string, data: GlobalNavData) {
	const $ = load(rawHtml, { decodeEntities: false });
	const settings = entryData(data.settings);
	const year = new Date().getFullYear();
	const locations = publishedRealLocations(data.locations);
	const brands = sortEntries(data.brands).map(normalizeBrand).filter((item) => item.slug && item.label && item.url);

	const defaultFooterServices = [
		{ label: "Hearing Tests", url: "/audiology-services/hearing-tests/" },
		{ label: "Ear Wax Removal", url: "/audiology-services/ear-wax-removal/" },
		{ label: "Hearing Aid Services", url: "/audiology-services/hearing-aid-services/" },
		{ label: "Assistive Listening Devices", url: "/hearing-aids-products/hearing-aid-alternatives/" },
		{ label: "Custom Hearing Protection", url: "/custom-hearing-protection/" },
		{ label: "Hearing Aid Batteries", url: "/hearing-aids-products/hearing-aid-batteries/" },
		{ label: "Hearing Aid Fittings", url: "/audiology-services/hearing-aid-fittings/" },
	];
	const defaultLegal = [
		{ label: "Terms of Service", url: "/terms-of-service/" },
		{ label: "Privacy Policy", url: "/privacy-policy/" },
		{ label: "Sitemap", url: "/sitemap/" },
	];

	const footerServices = menuItemsToList(data.footerServicesMenu, defaultFooterServices);
	const footerLegal = menuItemsToList(data.footerLegalMenu, defaultLegal);

	$(".astro-element-2dd0641 .astro-heading-title").text(
		settings.footer_tagline || "We provide expert, affordable hearing care to help you stay connected to what matters most.",
	);
	$(".astro-element-8b79fb7 .astro-heading-title").text(`© ${year} America's Best Hearing. | HIPAA | All rights reserved.`);
	$("#menu-1-8b24e1b").html(flatList(footerServices, "astro-item", false));
	$("#menu-2-8b24e1b").html(flatList(footerServices, "astro-item", true));
	$("#menu-1-6cb12a7").html(flatList(brands, "astro-item", false));
	$("#menu-2-6cb12a7").html(flatList(brands, "astro-item", true));
	$("#menu-1-f6f6c98").html(flatList(locations.map((location) => ({ label: location.name, url: location.url })), "astro-item", false));
	$("#menu-2-f6f6c98").html(flatList(locations.map((location) => ({ label: location.name, url: location.url })), "astro-item", true));
	$("#menu-1-0e9713c").html(flatList(footerLegal, "astro-item", false));
	$("#menu-2-0e9713c").html(flatList(footerLegal, "astro-item", true));
	return $.html();
}
