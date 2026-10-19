// Template pages in EmDash. Each fixed page (Home, About, Services...) is its
// own content type with one record (slug "main"), grouped in the admin sidebar
// under "Pages", so its editing screen shows only its own fields. Publishing
// the record switches the page on, and its links elsewhere; an unpublished page
// answers "page not found" and its links are hidden.
//
// Settings for kinds of pages (every service page, every team profile...) are
// on one "Page templates" record. Content shared by many pages (the booking
// band) is on one "Shared sections" record; each page can use it or customize.
//
// `key` is the matching Review controls setting, so the address bar can still
// try the other choices during review. Choice labels match Review controls.

import pageText from "./page-text.json";

/**
 * Page text: headings, intros and section copy for each Pages record, with
 * the template's starting wording (src/data/page-text.json). "line" fields are
 * one line; "para" fields are paragraphs (a blank line starts a new one).
 * Text may use {city}, {name}, {short} and {phone}; the site fills them in.
 */
export type PageText = { field: string; label: string; kind: "line" | "para"; default: string };
export const PAGE_TEXT = pageText as Record<string, PageText[]>;

/** Booking band (CTA) text fields; every page with one can use the shared band or customize. */
export const CTA_FIELDS = ["cta_heading", "cta_text"];
export const CTA_MODE_OPTIONS = ["Use the shared booking band", "Customize for this page"] as const;

/** The Shared sections record (one record, slug "main"). */
export const SHARED_COLLECTION = "shared_sections";
export const SHARED_DEFAULTS = {
	cta_heading: "Take the first step toward better hearing",
	cta_text: "Pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis. Et commodo pharetra est eros bibendum elit.",
};

/** The Page templates record: settings for each kind of record page. */
export const TEMPLATES_COLLECTION = "page_templates";

/** The one record in each page's content type. */
export const MAIN = "main";

export type PageSetting =
	| { field: string; label: string; key: string; type: "bool"; default: boolean }
	| { field: string; label: string; key: string; type: "choice"; default: string; options: [string, string][] };

export type PageDef = {
	slug: string;
	title: string;
	/** Fixed pages: the content type holding this page (one record, slug "main"). */
	collection?: string;
	/** Record-page templates: field prefix on the Page templates record (e.g. "service" -> service_hero). */
	template?: string;
	/** Address of the page; template records have none. */
	path?: string;
	/** Pages always on (Home); unpublishing them does nothing. */
	alwaysOn?: boolean;
	/** Has a hero with photo / no-photo versions. */
	hero?: boolean;
	settings: PageSetting[];
};

const bool = (field: string, label: string, key: string, d = true): PageSetting => ({ field, label, key, type: "bool", default: d });
const choice = (field: string, label: string, key: string, options: [string, string][], d = options[0][0]): PageSetting => ({ field, label, key, type: "choice", default: d, options });

export const PAGES: PageDef[] = [
	{
		slug: "home", collection: "page_home",
		title: "Home",
		path: "/",
		alwaysOn: true,
		hero: true,
		settings: [
			choice("home_trust_logos", "Trust bar logos", "trustmove", [["scroll", "Scrolling (with pause)"], ["still", "Still"]]),
			choice("home_trust_rating", "Trust bar rating", "trustrating", [["boxed", "In its own box"], ["plain", "Plain (no box)"]]),
			bool("home_latest_posts", "Latest posts section", "posts"),
			bool("home_sample_card", "Sample service card with photo", "sample", false),
		],
	},
	{ slug: "services", collection: "page_services", title: "Services", path: "/services", hero: true, settings: [bool("services_first_visit", "“What to expect at your first visit” steps", "steps")] },
	{
		slug: "hearing-aids", collection: "page_hearing_aids",
		title: "Hearing aids",
		path: "/hearing-aids",
		hero: true,
		settings: [bool("hearing_aids_styles", "Hearing aid styles section", "styles"), bool("hearing_aids_otc", "OTC vs. prescription section", "otc")],
	},
	{
		slug: "about", collection: "page_about",
		title: "About",
		path: "/about",
		hero: true,
		settings: [
			choice("about_journey", "Our journey", "journey", [["grid", "Grid 2 × 2"], ["row", "Horizontal"], ["hidden", "Hidden"]]),
			bool("about_community", "Community section", "community"),
			bool("about_credentials", "Credentials section", "creds"),
		],
	},
	{ slug: "contact", collection: "page_contact", title: "Contact", path: "/contact", hero: true, settings: [] },
	{
		slug: "book-appointment", collection: "page_book_appointment",
		title: "Book appointment",
		path: "/book-appointment",
		settings: [
			choice("book_version", "Booking", "version", [["a", "A · Scheduler embed"], ["b", "B · Request form"]]),
			choice("book_layout", "Layout", "layout", [["full", "Full width"], ["side", "Right sidebar"]]),
		],
	},
	{ slug: "reviews", collection: "page_reviews", title: "Reviews", path: "/reviews", settings: [choice("reviews_button", "“Leave us a review” button", "reviewbtn", [["primary", "Primary colour"], ["outline", "White with outline"]])] },
	{ slug: "blog", collection: "page_blog", title: "Blog", path: "/blog", settings: [choice("blog_layout", "Layout", "layout", [["grid", "Grid · 16:9"], ["square", "Grid · square"], ["list", "List"]])] },
	{
		slug: "patient-resources", collection: "page_patient_resources",
		title: "New patients",
		path: "/new-patients",
		hero: true,
		settings: [
			choice("resources_layout", "Layout", "layout", [["cards", "Cards"], ["accordion", "Accordion"]]),
			choice("resources_group", "Group by", "group", [["none", "None"], ["tag", "Tag"]]),
		],
	},
	{ slug: "privacy-policy", collection: "page_privacy_policy", title: "Privacy policy", path: "/privacy-policy", settings: [bool("legal_toc", "Table of contents", "toc")] },
	{ slug: "terms-of-use", collection: "page_terms_of_use", title: "Terms of use", path: "/terms-of-use", settings: [bool("legal_toc", "Table of contents", "toc")] },
	{ slug: "accessibility", collection: "page_accessibility", title: "Accessibility", path: "/accessibility", settings: [bool("legal_toc", "Table of contents", "toc")] },
	{
		slug: "service-pages", template: "service",
		title: "Service pages",
		hero: true,
		alwaysOn: true,
		settings: [
			choice("service_sidebar_reviews", "Service pages – Sidebar reviews", "reviews", [["single", "Single review"], ["carousel", "Carousel (3)"]]),
			bool("service_posts_card", "Service pages – Recent posts card", "posts"),
			bool("service_sticky", "Service pages – Sticky sidebar", "sticky"),
		],
	},
	{ slug: "brand-pages", template: "brand", title: "Hearing aid brand pages", hero: true, alwaysOn: true, settings: [] },
	{ slug: "team-profiles", template: "profile", title: "Team profiles", alwaysOn: true, settings: [bool("profile_video", "Team profiles – Intro video", "video")] },
	{ slug: "location-pages", template: "location", title: "Location pages", hero: true, alwaysOn: true, settings: [] },
	{ slug: "blog-posts", template: "post", title: "Blog posts", alwaysOn: true, settings: [bool("post_image", "Blog posts – Featured image", "image")] },
	{ slug: "resource-pages", template: "resource", title: "Patient resource pages", hero: true, alwaysOn: true, settings: [] },
];

/** The hero choice on page records. "Example photo" is review-only (Review controls). */
export const HERO_FIELD = "hero";
export const HERO_OPTIONS: [string, string][] = [
	["", "Page default"],
	["photo", "Photo"],
	["primary", "No photo · Primary"],
	["light", "No photo · Light"],
];

/** Which page definition governs an address. */
export function pageFor(pathname: string): PageDef | undefined {
	const p = pathname.replace(/\/$/, "") || "/";
	const exact = PAGES.find((d) => d.path === p);
	if (exact) return exact;
	const first = p.split("/")[1];
	const template: Record<string, string> = {
		services: "service-pages",
		"hearing-aids": "brand-pages",
		about: "team-profiles",
		locations: "location-pages",
		"patient-resources": "resource-pages",
	};
	if (first === "blog") return PAGES.find((d) => d.slug === (p.startsWith("/blog/category/") ? "blog" : "blog-posts"));
	return PAGES.find((d) => d.slug === template[first]);
}
