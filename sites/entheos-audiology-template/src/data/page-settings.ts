// The Pages list in EmDash: one record per template page (slug = the key
// below). Publishing a record switches that page on, and its links elsewhere;
// an unpublished page answers "page not found" and its links are hidden.
//
// Each record also holds that page's settings. The admin shows every setting
// field on every record, so each label starts with the page it belongs to.
// "Template:" records hold settings for a kind of page (every service page,
// every team profile...); they're always on.
//
// `key` is the matching Review controls setting, so the address bar can still
// try the other choices during review. Choice labels match Review controls.

export type PageSetting =
	| { field: string; label: string; key: string; type: "bool"; default: boolean }
	| { field: string; label: string; key: string; type: "choice"; default: string; options: [string, string][] };

export type PageDef = {
	slug: string;
	title: string;
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
		slug: "home",
		title: "Home",
		path: "/",
		alwaysOn: true,
		hero: true,
		settings: [
			choice("home_trust_logos", "Home: trust bar logos", "trustmove", [["scroll", "Scrolling (with pause)"], ["still", "Still"]]),
			choice("home_trust_rating", "Home: trust bar rating", "trustrating", [["boxed", "In its own box"], ["plain", "Plain (no box)"]]),
			bool("home_latest_posts", "Home: latest posts section", "posts"),
			bool("home_sample_card", "Home: sample service card with photo", "sample", false),
		],
	},
	{ slug: "services", title: "Services", path: "/services", hero: true, settings: [bool("services_first_visit", "Services: “What to expect at your first visit” steps", "steps")] },
	{
		slug: "hearing-aids",
		title: "Hearing aids",
		path: "/hearing-aids",
		hero: true,
		settings: [bool("hearing_aids_styles", "Hearing aids: hearing aid styles section", "styles"), bool("hearing_aids_otc", "Hearing aids: OTC vs. prescription section", "otc")],
	},
	{
		slug: "about",
		title: "About",
		path: "/about",
		hero: true,
		settings: [
			choice("about_journey", "About: our journey", "journey", [["grid", "Grid 2 × 2"], ["row", "Horizontal"], ["hidden", "Hidden"]]),
			bool("about_community", "About: community section", "community"),
			bool("about_credentials", "About: credentials section", "creds"),
		],
	},
	{ slug: "contact", title: "Contact", path: "/contact", hero: true, settings: [] },
	{
		slug: "book-appointment",
		title: "Book appointment",
		path: "/book-appointment",
		settings: [
			choice("book_version", "Book appointment: booking", "version", [["a", "A · Scheduler embed"], ["b", "B · Request form"]]),
			choice("book_layout", "Book appointment: layout", "layout", [["full", "Full width"], ["side", "Right sidebar"]]),
		],
	},
	{ slug: "reviews", title: "Reviews", path: "/reviews", settings: [choice("reviews_button", "Reviews: “Leave us a review” button", "reviewbtn", [["primary", "Primary colour"], ["outline", "White with outline"]])] },
	{ slug: "blog", title: "Blog", path: "/blog", settings: [choice("blog_layout", "Blog: layout", "layout", [["grid", "Grid · 16:9"], ["square", "Grid · square"], ["list", "List"]])] },
	{
		slug: "patient-resources",
		title: "Patient resources",
		path: "/patient-resources",
		hero: true,
		settings: [
			choice("resources_layout", "Patient resources: layout", "layout", [["cards", "Cards"], ["accordion", "Accordion"]]),
			choice("resources_group", "Patient resources: group by", "group", [["none", "None"], ["tag", "Tag"]]),
		],
	},
	{ slug: "privacy-policy", title: "Privacy policy", path: "/privacy-policy", settings: [bool("legal_toc", "Legal pages: table of contents", "toc")] },
	{ slug: "terms-of-use", title: "Terms of use", path: "/terms-of-use", settings: [bool("legal_toc", "Legal pages: table of contents", "toc")] },
	{ slug: "accessibility", title: "Accessibility", path: "/accessibility", settings: [bool("legal_toc", "Legal pages: table of contents", "toc")] },
	{
		slug: "service-pages",
		title: "Template: service pages",
		hero: true,
		alwaysOn: true,
		settings: [
			choice("service_sidebar_reviews", "Service pages: sidebar reviews", "reviews", [["single", "Single review"], ["carousel", "Carousel (3)"]]),
			bool("service_posts_card", "Service pages: recent posts card", "posts"),
			bool("service_sticky", "Service pages: sticky sidebar", "sticky"),
		],
	},
	{ slug: "brand-pages", title: "Template: hearing aid brand pages", hero: true, alwaysOn: true, settings: [] },
	{ slug: "team-profiles", title: "Template: team profiles", alwaysOn: true, settings: [bool("profile_video", "Team profiles: intro video", "video")] },
	{ slug: "location-pages", title: "Template: location pages", hero: true, alwaysOn: true, settings: [] },
	{ slug: "blog-posts", title: "Template: blog posts", alwaysOn: true, settings: [bool("post_image", "Blog posts: featured image", "image")] },
];

/** The hero choice, shared by every record (labels match Review controls). */
export const HERO_FIELD = "hero";
export const HERO_OPTIONS: [string, string][] = [
	["", "Page default"],
	["photo", "Photo"],
	["example", "Example photo"],
	["primary", "No photo · Primary"],
	["light", "No photo · Light"],
];

/** Which Pages record governs an address. */
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
	};
	if (first === "blog") return PAGES.find((d) => d.slug === (p.startsWith("/blog/category/") ? "blog" : "blog-posts"));
	return PAGES.find((d) => d.slug === template[first]);
}
