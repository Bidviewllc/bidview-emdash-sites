// Builds seed/seed.json (the EmDash schema plus the Lakeview sample content)
// from the phase 1 sample data files. Run: npm run seed:build
//
// The seed is applied by the deployed site itself: its schema on the first
// request, its sample content when someone runs the admin setup wizard with
// sample content included. After that, edits happen in the admin, and
// changing this file changes nothing on a site that is already set up.
import { writeFileSync } from "node:fs";
import * as blog from "../src/data/blog";
import * as s from "../src/data/practice";
import { FOOTERS, HEADERS, TEAM_LAYOUTS } from "../src/lib/settings";
import { CTA_FIELDS, CTA_MODE_OPTIONS, HERO_OPTIONS, MAIN, PAGE_TEXT, PAGES, SHARED_COLLECTION, SHARED_DEFAULTS, TEMPLATES_COLLECTION, type PageSetting } from "../src/data/page-settings";

/** Brand logos are downloaded into the media library during setup. */
const ASSET_HOST = "https://entheos-audiology-template.local-981.workers.dev";

const str = (slug: string, label: string, extra: object = {}) => ({ slug, label, type: "string", ...extra });
const txt = (slug: string, label: string, extra: object = {}) => ({ slug, label, type: "text", ...extra });
const bool = (slug: string, label: string, defaultValue = false) => ({ slug, label, type: "boolean", defaultValue });
const int = (slug: string, label: string, defaultValue = 0) => ({ slug, label, type: "integer", defaultValue });
const title = (label = "Title") => str("title", label, { required: true, searchable: true });
const sub = (slug: string, label: string, type = "string", extra: object = {}) => ({ slug, label, type, ...extra });
const repeater = (slug: string, label: string, subFields: object[]) => ({ slug, label, type: "repeater", validation: { subFields } });
const select = (slug: string, label: string, options: string[], defaultValue: string) => ({ slug, label, type: "select", defaultValue, validation: { options } });
const image = (slug: string, label: string) => ({ slug, label, type: "image" });
const faqField = repeater("faq", "FAQ", [sub("q", "Question"), sub("a", "Answer", "text")]);
/** Select option text from a Review controls label, without "(default)". */
const clean = (label: string) => label.replace(/\s*\(default\)/, "");
const TONES = ["warm", "sage", "sky", "stone", "dark", "dark2"];
const hex = { validation: { pattern: "^#[0-9A-Fa-f]{6}$" } };

// Template pages: one content type per fixed page (one record, slug "main"),
// grouped under "Pages" in the admin sidebar, plus "Page templates" (settings
// for record pages) and "Shared sections" (the shared booking band).
const label = (st: PageSetting, v: string | boolean) => (st.type === "bool" ? v : st.options.find(([k]) => k === v)![1]);
const settingField = (st: PageSetting, lbl = st.label) =>
	st.type === "bool" ? bool(st.field, lbl, st.default) : select(st.field, lbl, st.options.map(([, l]) => l), label(st, st.default) as string);
const heroSelect = (slug: string, lbl: string) => select(slug, lbl, HERO_OPTIONS.map(([, l]) => l), HERO_OPTIONS[0][1]);
const textField = (f: { field: string; label: string; kind: string }, lbl = f.label) => (f.kind === "line" ? str(f.field, lbl) : txt(f.field, lbl));
const hasCta = (slug: string) => (PAGE_TEXT[slug] ?? []).some((f) => CTA_FIELDS.includes(f.field));
/** Sample pages whose booking band differs from the shared one start as "Customize". */
const ctaMode = (slug: string) => {
	const own = Object.fromEntries((PAGE_TEXT[slug] ?? []).map((f) => [f.field, f.default]));
	const same = CTA_FIELDS.every((k) => own[k] === undefined || own[k] === SHARED_DEFAULTS[k as keyof typeof SHARED_DEFAULTS]);
	return CTA_MODE_OPTIONS[same ? 0 : 1];
};

const pageCollections = PAGES.filter((p) => p.collection).map((p, i) => {
	const text = PAGE_TEXT[p.slug] ?? [];
	const body = text.filter((f) => !CTA_FIELDS.includes(f.field) && f.field !== "description");
	return {
		slug: p.collection!,
		// "Services page" etc., so they read apart from the Services and Patient resources record lists.
		label: `${p.title} page`,
		labelSingular: `${p.title} page`,
		description: `The ${p.title} page. Publish = page on (and its links); unpublish = page off. Keep the one record.`,
		group: "Pages",
		sortOrder: i,
		routable: false,
		supports: ["drafts", "revisions"],
		fields: [
			title("Page name"),
			...(p.hero ? [heroSelect("hero", "Hero"), image("hero_image", p.slug === "home" ? "Hero photo (16:9, calm area on the left)" : "Hero photo (3:2)")] : []),
			...body.map((f) => textField(f)),
			...(p.slug === "about" ? [image("community_photo", "Community – Photo (3:2)")] : []),
			...(hasCta(p.slug)
				? [
						select("cta_mode", "Booking band", [...CTA_MODE_OPTIONS], CTA_MODE_OPTIONS[0]),
						...text.filter((f) => CTA_FIELDS.includes(f.field)).map((f) => textField(f, `${f.label} (only when customized)`)),
					]
				: []),
			...text.filter((f) => f.field === "description").map((f) => textField(f)),
			...p.settings.map((st) => settingField(st)),
		],
	};
});
const templateDefs = PAGES.filter((p) => p.template);
const templatesCollection = {
	slug: TEMPLATES_COLLECTION,
	label: "Page templates",
	labelSingular: "Page templates",
	description: "Settings for every service, brand, team, location and blog post page. Keep the one record.",
	group: "Pages",
	sortOrder: 50,
	routable: false,
	supports: ["revisions"],
	fields: [
		title("Name"),
		...templateDefs.flatMap((p) => [...(p.hero ? [heroSelect(`${p.template}_hero`, `${p.title} – Hero`)] : []), ...p.settings.map((st) => settingField(st))]),
	],
};
const sharedCollection = {
	slug: SHARED_COLLECTION,
	label: "Shared sections",
	labelSingular: "Shared sections",
	description: "Sections used on many pages. A page uses these unless it is set to customize. Keep the one record.",
	group: "Pages",
	sortOrder: 51,
	routable: false,
	supports: ["revisions"],
	fields: [
		title("Name"),
		str("cta_heading", "Booking band – Headline"),
		txt("cta_text", "Booking band – Description"),
		image("cta_photo", "Booking band – Photo (older adult laughing with family, or on a walk)"),
	],
};

const collections = [
	{
		slug: "practice",
		label: "Practice details",
		labelSingular: "Practice details",
		description: "One record (slug: main) with the practice-wide details that Settings doesn't cover.",
		routable: false,
		supports: ["revisions"],
		fields: [
			title("Practice name"),
			str("wordmark_1", "Logo wordmark, line 1 (bold)"),
			str("wordmark_2", "Logo wordmark, line 2 (small caps)"),
			str("short_name", "Short name"),
			str("city", "Main city"),
			str("email", "Email"),
			str("rating_score", "Google rating (e.g. 4.9)"),
			int("rating_count", "Number of Google reviews"),
			str("years", "Years in practice (e.g. 35+ years)"),
			str("color_primary", "Primary colour (hex, e.g. #0F5E6B)", hex),
			str("color_accent", "Accent colour (hex)", hex),
			str("color_light", "Light background colour (hex)", hex),
			repeater("memberships", "Memberships (trust bar logos)", [
				sub("logo", "Logo", "select", { options: s.associations.map((a) => a.key) }),
				sub("name", "Name read by screen readers"),
			]),
			repeater("first_visit", "Services hub: first visit steps", [sub("t", "Step"), sub("d", "Text", "text")]),
			repeater("milestones", "About: our journey", [sub("y", "Year"), sub("t", "Text", "text")]),
			repeater("values", "About: what guides our care", [sub("icon", "Icon"), sub("t", "Heading"), sub("d", "Text", "text")]),
			bool("review_controls", "Show the Review controls panel (off for a live site)", true),
			// Site design: the starting point for every visitor. Review controls can
			// still try other choices through the address bar.
			select("header_style", "Design: header style", Object.values(HEADERS).map(clean), clean(HEADERS.h3)),
			select("footer_style", "Design: footer style", Object.values(FOOTERS).map(clean), clean(FOOTERS.f7)),
			select("footer_logo", "Design: footer logo", ["Landscape", "Vertical"], "Landscape"),
			bool("footer_badges", "Design: membership badge row in the footer (F7)", true),
			select("logo_shape", "Design: header logo shape", ["Wide", "Stacked"], "Wide"),
			select("team_cards", "Design: team cards", Object.values(TEAM_LAYOUTS).map(clean), clean(TEAM_LAYOUTS.overlay)),
			bool("cta_photo", "Design: photo panel in booking bands", true),
			// Site-wide photos. Placeholders show until these are uploaded.
			image("team_photo", "Photo: team (3:2; Home about section and About story)"),
			image("office_photo", "Photo: office interior (3:2; brand pages, care section)"),
		],
	},
	...pageCollections,
	templatesCollection,
	sharedCollection,
	{
		slug: "offices",
		label: "Offices",
		labelSingular: "Office",
		urlPattern: "/locations/{slug}",
		supports: ["drafts", "revisions", "seo"],
		fields: [
			title("Office name"),
			str("short_name", "Town (short name)"),
			str("street", "Street address"),
			str("city_line", "City, state, ZIP"),
			str("phone", "Phone"),
			repeater("hours", "Hours table", [sub("days", "Days"), sub("times", "Times")]),
			str("hours_line", "Hours on one line (cards)"),
			txt("hours_long", "Hours, long form (office page; one line per row)"),
			{ slug: "maps_url", label: "Google Maps link", type: "url" },
			image("photo", "Office exterior photo (3:2; location page hero)"),
			int("sort_order", "Sort order"),
		],
	},
	{
		slug: "services",
		label: "Services",
		labelSingular: "Service",
		urlPattern: "/services/{slug}",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			title("Service name"),
			str("nav_label", "Menu label (lower case)"),
			txt("summary", "Card summary"),
			bool("has_page", "Give this service its own page"),
			bool("hide_from_hub", "Hide from hub (no card on Services or Home)"),
			bool("on_home", "Show on the Home page grid", true),
			str("book_label", "Booking button label"),
			str("cta_heading", "Booking band heading"),
			image("hero_image", "Hero photo (3:2, landscape)"),
			faqField,
			int("sort_order", "Sort order"),
		],
	},
	{
		slug: "brands",
		label: "Hearing aid brands",
		labelSingular: "Hearing aid brand",
		urlPattern: "/hearing-aids/{slug}",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			title("Brand name"),
			image("logo", "Logo"),
			image("hero_image", "Hero photo (3:2; product lifestyle from the manufacturer)"),
			str("logo_height", "Logo height in the 160 x 60 tile (e.g. 46px)"),
			txt("summary", "Card summary"),
			bool("has_page", "Give this brand its own page"),
			bool("hide_from_hub", "Hide from hub"),
			repeater("models", "Current models", [sub("line", "Product line"), sub("name", "Model name"), sub("description", "Description", "text"), sub("features", "Key features (one per line)", "text")]),
			txt("accessories", "Accessories (one per line)"),
			txt("older_models", "Older models we support (one per line)"),
			faqField,
			int("sort_order", "Sort order"),
		],
	},
	{
		slug: "providers",
		label: "Team",
		labelSingular: "Team member",
		urlPattern: "/about/{slug}",
		supports: ["drafts", "revisions", "seo"],
		fields: [
			title("Name with credentials"),
			str("job_title", "Job title"),
			str("short_name", "Short name (e.g. Dr. Ellis)"),
			str("meet_label", "Card link label (e.g. Meet Dr. Ellis)"),
			image("headshot", "Headshot (4:5)"),
			select("tone", "Placeholder colour (until a headshot is added)", TONES, "warm"),
			bool("has_page", "Give this person a profile page"),
			txt("short_bio", "Short bio (team list layout)"),
			txt("offices", "Offices they see patients at (office slugs, one per line)"),
			int("sort_order", "Sort order"),
		],
	},
	{
		slug: "posts",
		label: "Blog posts",
		labelSingular: "Blog post",
		urlPattern: "/blog/{slug}",
		supports: ["drafts", "revisions", "search", "seo", "scheduling"],
		fields: [
			title(),
			txt("excerpt", "Summary"),
			{ slug: "post_date", label: "Date shown on the post", type: "datetime" },
			str("author", "Author (team member slug)"),
			bool("featured", "Feature at the top of the blog"),
			image("featured_image", "Featured image (16:9)"),
			select("tone", "Placeholder colour (until an image is added)", TONES, "warm"),
			{ slug: "content", label: "Article", type: "portableText", searchable: true },
		],
	},
	{
		slug: "resources",
		label: "Patient resources",
		labelSingular: "Patient resource",
		urlPattern: "/patient-resources/{slug}",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			title("Headline"),
			txt("summary", "Short description"),
			bool("has_page", "Give this its own page"),
			bool("hide_from_hub", "Hide from hub"),
			bool("has_forms", "Show the form buttons (Download PDF / Fill out online)"),
			{ slug: "content", label: "Page content", type: "portableText" },
			int("sort_order", "Sort order"),
		],
	},
];

/** Resource tag description that keeps a tag off the "Group by tag" headings. */
export const LABEL_ONLY = "Label only (not a group heading)";

const dateIso = (d: string) => new Date(d + " 12:00 UTC").toISOString();
const lines = (a: readonly string[]) => a.join("\n");
const pub = (id: string, slug: string, data: object, taxonomies?: object) => ({ id, slug, status: "published", data, ...(taxonomies ? { taxonomies } : {}) });

const content = {
	practice: [
		pub("practice-main", "main", {
			title: s.practice.name,
			wordmark_1: s.practice.wordmark[0],
			wordmark_2: s.practice.wordmark[1],
			short_name: s.practice.shortName,
			city: s.practice.city,
			email: s.practice.email,
			rating_score: s.practice.rating.score,
			rating_count: s.practice.rating.count,
			years: s.practice.years,
			color_primary: s.practice.colors.primary,
			color_accent: s.practice.colors.accent,
			color_light: s.practice.colors.light,
			memberships: s.associations.map((a) => ({ logo: a.key, name: a.name })),
			first_visit: s.firstVisitSteps.map(({ t, d }) => ({ t, d })),
			milestones: s.milestones.map(({ y, t }) => ({ y, t })),
			values: s.values.map(({ icon, t, d }) => ({ icon, t, d })),
			review_controls: true,
			header_style: clean(HEADERS.h3),
			footer_style: clean(FOOTERS.f7),
			footer_logo: "Landscape",
			footer_badges: true,
			logo_shape: "Wide",
			team_cards: clean(TEAM_LAYOUTS.overlay),
			cta_photo: true,
		}),
	],
	...Object.fromEntries(
		PAGES.filter((p) => p.collection).map((p) => [
			p.collection!,
			[
				pub(`page-${p.slug}`, MAIN, {
					title: p.title,
					...(p.hero ? { hero: HERO_OPTIONS[0][1] } : {}),
					...Object.fromEntries((PAGE_TEXT[p.slug] ?? []).map((f) => [f.field, f.default])),
					...(hasCta(p.slug) ? { cta_mode: ctaMode(p.slug) } : {}),
					...Object.fromEntries(p.settings.map((st) => [st.field, label(st, st.default)])),
				}),
			],
		]),
	),
	[TEMPLATES_COLLECTION]: [
		pub("page-templates", MAIN, {
			title: "Page templates",
			...Object.fromEntries(templateDefs.flatMap((p) => [...(p.hero ? [[`${p.template}_hero`, HERO_OPTIONS[0][1]]] : []), ...p.settings.map((st) => [st.field, label(st, st.default)])])),
		}),
	],
	[SHARED_COLLECTION]: [pub("shared-sections", MAIN, { title: "Shared sections", ...SHARED_DEFAULTS })],
	offices: s.offices.map((o, i) =>
		pub(`office-${o.slug}`, o.slug, {
			title: o.name,
			short_name: o.shortName,
			street: o.street,
			city_line: o.city,
			phone: o.phone,
			hours: o.hours.map(([days, times]) => ({ days, times })),
			hours_line: o.hoursLine,
			hours_long: o.hoursLong.split("<br>").join("\n"),
			maps_url: o.mapsUrl,
			sort_order: i + 1,
		}),
	),
	services: s.services.map((x, i) =>
		pub(`service-${x.slug}`, x.slug, {
			title: x.name,
			nav_label: x.navLabel,
			summary: x.summary,
			has_page: x.hasPage,
			hide_from_hub: !!x.hideFromHub,
			on_home: x.onHome !== false,
			book_label: x.bookLabel,
			cta_heading: x.ctaHeading,
			faq: s.faq,
			sort_order: i + 1,
		}),
	),
	brands: s.brands.map((b, i) => {
		const d = s.brandDetails[b.slug] ?? s.genericBrandDetails(b.name);
		return pub(`brand-${b.slug}`, b.slug, {
			title: b.name,
			logo: { $media: { url: ASSET_HOST + b.logo, alt: `${b.name} logo`, filename: `${b.slug}.png` } },
			logo_height: b.logoHeight,
			summary: b.summary,
			has_page: b.hasPage,
			hide_from_hub: false,
			models: d.lines.flatMap((l) => l.models.map((m) => ({ line: l.t, name: m.n, description: m.d, features: lines(m.f ?? []) }))),
			accessories: lines(d.accessories),
			older_models: lines(d.older),
			faq: s.brandFaq(b.name),
			sort_order: i + 1,
		});
	}),
	providers: s.providers.map((p, i) =>
		pub(`provider-${p.slug}`, p.slug, {
			title: p.name,
			job_title: p.title,
			short_name: p.short,
			meet_label: p.meet,
			tone: p.tone,
			has_page: p.hasPage,
			short_bio: p.bio,
			offices: lines(p.offices),
			sort_order: i + 1,
		}),
	),
	posts: [blog.featured, ...blog.posts].map((p) =>
		pub(
			`post-${p.slug}`,
			p.slug,
			{
				title: p.title,
				excerpt: p.summary,
				post_date: dateIso(p.date),
				author: s.providers.find((x) => x.name === p.author)?.slug ?? s.providers[0].slug,
				featured: p.slug === blog.featured.slug,
				tone: p.tone,
			},
			{ category: [p.catSlug] },
		),
	),
	resources: blog.resources.map((r, i) =>
		pub(`resource-${r.slug}`, r.slug, { title: r.t, summary: r.d, has_page: r.page, hide_from_hub: false, has_forms: r.forms, sort_order: i + 1 }, { resource_tag: r.tags.map(blog.slugify) }),
	),
};

// Every tag in use. Tags missing from the group order (e.g. Forms) are card
// labels only: their description tells the site not to make a group of them.
const resourceTags = [...new Set([...blog.resourceGroups, ...blog.resources.flatMap((r) => r.tags)])].map((t) => ({
	slug: blog.slugify(t),
	label: t,
	...(blog.resourceGroups.includes(t) ? {} : { description: LABEL_ONLY }),
}));

// Menus. Every template page is preloaded; the site hides an item whose page
// isn't live (own page off, unpublished, or deleted), so it appears once the
// page is switched on. Footer columns are separate menus because each footer
// style uses different columns; their headings stay in the design.
const custom = (label: string, url: string, children?: object[]) => ({ type: "custom", label, url, ...(children ? { children } : {}) });
const entry = (label: string, collection: string, ref: string) => ({ type: "page", collection, ref, label });
const svc = (slug: string) => entry(s.services.find((x) => x.slug === slug)!.navLabel, "services", `service-${slug}`);
export const menus = [
	{
		name: "header",
		label: "Header navigation",
		items: [
			custom("Services", "/services", s.services.map((x) => svc(x.slug))),
			custom("Hearing aids", "/hearing-aids", s.brands.map((b) => entry(`${b.name} hearing aids`, "brands", `brand-${b.slug}`))),
			custom("About", "/about"),
			custom("Resources", "/patient-resources"),
			custom("Blog", "/blog"),
			custom("Contact", "/contact"),
		],
	},
	{
		name: "footer_practice",
		label: "Footer: Our practice",
		items: [custom("About us", "/about"), custom("Our team", "/about#team"), entry("Locations", "offices", `office-${s.offices[0].slug}`), custom("Contact", "/contact")],
	},
	{
		name: "footer_services",
		label: "Footer: Our services",
		items: [svc("hearing-evaluations"), svc("hearing-aid-fittings"), svc("ear-wax-removal"), custom("All services", "/services")],
	},
	{
		name: "footer_patients",
		label: "Footer: Patient information / New patients",
		items: [custom("Your first visit", "/patient-resources"), custom("Patient forms", "/patient-resources"), custom("Insurance & financing", "/patient-resources")],
	},
	{
		name: "footer_current",
		label: "Footer: Current patients (F4)",
		items: [custom("Patient portal", "#"), custom("Pay a bill", "#"), custom("Hearing aid repairs", "/services")],
	},
	{
		name: "footer_quick",
		label: "Footer: Quick links (F2, F3)",
		items: [custom("About us", "/about"), custom("Services", "/services"), custom("Patient information", "/patient-resources"), entry("Locations", "offices", `office-${s.offices[0].slug}`)],
	},
	{
		name: "footer_explore",
		label: "Footer: Explore (F7)",
		items: [
			custom("Services", "/services"),
			custom("Hearing aids", "/hearing-aids"),
			custom("About us", "/about"),
			custom("Patient resources", "/patient-resources"),
			custom("Reviews", "/reviews"),
			custom("Blog", "/blog"),
			custom("Contact", "/contact"),
		],
	},
	{
		name: "footer_legal",
		label: "Footer: Legal",
		items: [custom("Privacy Policy", "/privacy-policy"), custom("Terms of Use", "/terms-of-use"), custom("Accessibility", "/accessibility"), custom("Sitemap", "/sitemap")],
	},
];

const seed = {
	$schema: "https://emdashcms.com/seed.schema.json",
	version: "1",
	meta: { name: "Entheos audiology template", description: "Design 1 template with the Lakeview Hearing Center sample practice", author: "Bidview Marketing" },
	settings: { title: s.practice.name, tagline: s.practice.tagline, social: s.practice.social },
	collections,
	taxonomies: [
		{ name: "category", label: "Blog categories", labelSingular: "Blog category", hierarchical: false, collections: ["posts"], terms: blog.categories.map((c) => ({ slug: c.slug, label: c.name })) },
		{ name: "resource_tag", label: "Resource tags", labelSingular: "Resource tag", hierarchical: false, collections: ["resources"], terms: resourceTags },
	],
	menus,
	content,
};

writeFileSync(new URL("../seed/seed.json", import.meta.url), JSON.stringify(seed, null, "\t") + "\n");
console.error("seed/seed.json:", Object.entries(content).map(([k, v]) => `${k} ${v.length}`).join(", "));
