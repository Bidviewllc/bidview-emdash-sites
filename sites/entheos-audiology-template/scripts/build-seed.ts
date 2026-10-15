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
const TONES = ["warm", "sage", "sky", "stone", "dark", "dark2"];
const hex = { validation: { pattern: "^#[0-9A-Fa-f]{6}$" } };

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
		],
	},
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
		}),
	],
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
	content,
};

writeFileSync(new URL("../seed/seed.json", import.meta.url), JSON.stringify(seed, null, "\t") + "\n");
console.log("seed/seed.json:", Object.entries(content).map(([k, v]) => `${k} ${v.length}`).join(", "));
