// Every live page on the site, grouped, for the Sitemap page (/sitemap) and /sitemap.xml.
// Only pages that are on: template pages that are published, records with their own
// page, resources with "Give this its own page". The thank-you, 404, search and review
// pages are never listed.
import type { SiteData } from "../data/site";
import { PAGES } from "../data/page-settings";
import { RESOURCE_PATHS } from "./resource-paths";
import { routes } from "./routes";

export type SiteLink = { label: string; path: string; collection?: string; slug?: string };
export type SiteGroup = { title: string; links: SiteLink[] };

/** Names for the fixed pages where the admin title isn't what visitors see. */
const LABEL: Record<string, string> = { "hearing-aids": "Hearing Aid Products", "patient-resources": "New Patients", "privacy-policy": "Privacy Policy", "terms-of-use": "Terms of Use", "book-appointment": "Book an Appointment" };
const LEGAL = new Set(["privacy-policy", "terms-of-use", "accessibility"]);
/** Never listed (utility pages). */
const NEVER = new Set(["/thank-you"]);

export function siteGroups(site: SiteData): SiteGroup[] {
	const page = (slug: string): SiteLink[] => {
		const def = PAGES.find((d) => d.slug === slug);
		return def?.path && def.collection && site.pages[slug]?.on && !NEVER.has(def.path)
			? [{ label: LABEL[slug] ?? def.title, path: def.path, collection: def.collection, slug: "main" }]
			: [];
	};
	const res = site.resources.filter((r) => r.page);
	const resLink = (r: (typeof res)[number]): SiteLink => ({ label: r.t, path: routes.resource(r.slug), collection: "resources", slug: r.slug });
	/** The old site's detailed service pages, kept at their live addresses (listed under Services). */
	const servicePageSlugs = ["hearing-evaluations", "functional-hearing-assessment", "cognivue-cognitive-testing", "tinnitus-treatments", "ear-wax-removal", "hearing-aid-repair", "assistive-listening-devices", "earmolds-for-hearing-aids"];
	const used = new Set<string>(servicePageSlugs);

	const main = ["home", "about", "services", "patient-resources", "reviews", "contact", "book-appointment"].flatMap(page);

	const services: SiteLink[] = [
		...site.services.filter((x) => x.hasPage).map((x) => ({ label: x.name, path: routes.service(x.slug), collection: "services", slug: x.slug })),
		...servicePageSlugs.map((slug) => res.find((r) => r.slug === slug)).filter((r) => !!r).map(resLink),
	];

	// Hearing aids: Products, then the Hearing Aid Overview and the other kept hearing-aid
	// pages, the brand pages, then resources filed first under "Hearing aids".
	const aidsRes = res.filter((r) => !used.has(r.slug) && (RESOURCE_PATHS[r.slug] || r.tags[0] === "Hearing aids"));
	aidsRes.forEach((r) => used.add(r.slug));
	const aids: SiteLink[] = [
		...page("hearing-aids"),
		...aidsRes.map(resLink),
		...site.brands.filter((x) => x.hasPage).map((x) => ({ label: `${x.name} Hearing Aids`, path: routes.brand(x.slug), collection: "brands", slug: x.slug })),
	];

	const patient = res.filter((r) => !used.has(r.slug)).map(resLink);
	const team = site.providers.filter((x) => x.hasPage).map((x) => ({ label: x.name, path: routes.provider(x.slug), collection: "providers", slug: x.slug }));

	const blogOn = !!site.pages.blog?.on;
	const blog: SiteLink[] = blogOn
		? [...page("blog").map((l) => ({ ...l, label: "All blog posts" })), ...site.categories.map((c) => ({ label: `Category: ${c.name}`, path: routes.category(c.slug) }))]
		: [];
	const posts: SiteLink[] = blogOn
		? [site.featured, ...site.posts]
				.filter((x) => !!x)
				.filter((x, i, all) => all.findIndex((y) => y!.slug === x!.slug) === i)
				.map((x) => ({ label: x!.title, path: routes.post(x!.slug), collection: "posts", slug: x!.slug }))
		: [];

	const legal = PAGES.filter((d) => LEGAL.has(d.slug)).flatMap((d) => page(d.slug));

	return [
		{ title: "Main pages", links: main },
		{ title: "Services", links: services },
		{ title: "Hearing aids", links: aids },
		{ title: "Patient information", links: patient },
		{ title: "Our team", links: team },
		{ title: "Blog", links: blog },
		{ title: "Blog posts", links: posts },
		{ title: "Legal", links: legal },
	].filter((g) => g.links.length);
}
