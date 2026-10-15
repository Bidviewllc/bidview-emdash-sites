// The practice's content for one request: every page reads it from
// Astro.locals.site, which src/middleware.ts fills once per request.
//
// Records come from EmDash (collections, settings and taxonomies) and are
// mapped into the shapes the templates use (src/data/types.ts). A few blocks
// are still sample content in code until they get their own records:
// reviews (Vince's reviews sync), the hearing aid style drawings, and the
// sample article body for posts that have no article text yet.

import { getEmDashCollection, getEmDashEntry, getSiteSettings, getTaxonomyTerms } from "emdash";
import * as blog from "./blog";
import * as sample from "./practice";
import type { Brand, BrandDetail, Office, Post, Provider, Resource, Service } from "./types";

/** Thrown when the site has no practice record yet (setup not finished). */
export class NotSetUpError extends Error {}

type Data = Record<string, any>;
type Entry = { id: string; data: Data };

const all = async (type: string): Promise<Entry[]> => {
	const { entries, error } = await getEmDashCollection(type, { limit: 500 });
	if (error) throw error;
	return (entries as Entry[]).sort((a, b) => (a.data.sort_order ?? 0) - (b.data.sort_order ?? 0));
};
const slugOf = (e: Entry) => (e.data.slug as string) ?? e.id;
const lines = (s: unknown) =>
	String(s ?? "")
		.split(/\r?\n/)
		.map((x) => x.trim())
		.filter(Boolean);
const longDate = (d: unknown) =>
	d ? new Date(d as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
/** URL for an EmDash image field (local media is served by EmDash's media route). */
const imgSrc = (v: any): string | undefined =>
	v?.src ?? v?.url ?? (v?.meta?.storageKey ? `/_emdash/api/media/file/${v.meta.storageKey}` : undefined);

export async function loadSite() {
	const [settings, practiceRes, officeE, serviceE, brandE, providerE, postE, resourceE, catTerms, tagTerms] = await Promise.all([
		getSiteSettings(),
		getEmDashEntry("practice", "main"),
		all("offices"),
		all("services"),
		all("brands"),
		all("providers"),
		all("posts"),
		all("resources"),
		getTaxonomyTerms("category"),
		getTaxonomyTerms("resource_tag"),
	]);
	const p = (practiceRes.entry as Entry | null)?.data;
	if (!p) throw new NotSetUpError("No practice record (Practice details, slug main).");

	const practice = {
		name: p.title as string,
		wordmark: [p.wordmark_1 ?? p.title, p.wordmark_2 ?? ""] as [string, string],
		shortName: p.short_name ?? p.title,
		city: p.city ?? "",
		tagline: settings.tagline ?? "",
		email: p.email ?? "",
		colors: {
			primary: p.color_primary || sample.practice.colors.primary,
			accent: p.color_accent || sample.practice.colors.accent,
			light: p.color_light || sample.practice.colors.light,
		},
		rating: { score: String(p.rating_score ?? ""), count: Number(p.rating_count ?? 0) },
		years: p.years ?? "",
		social: {
			facebook: settings.social?.facebook ?? "",
			instagram: settings.social?.instagram ?? "",
			youtube: settings.social?.youtube ?? "",
		},
		/** Uploaded in EmDash Settings; the code-drawn demo mark shows when empty. */
		logo: imgSrc(settings.logo),
		favicon: imgSrc(settings.favicon),
		reviewControls: p.review_controls !== false,
	};

	const offices: Office[] = officeE.map((e) => ({
		slug: slugOf(e),
		name: e.data.title,
		shortName: e.data.short_name ?? e.data.title,
		street: e.data.street ?? "",
		city: e.data.city_line ?? "",
		phone: e.data.phone ?? "",
		hours: (e.data.hours ?? []).map((h: Data) => [h.days, h.times] as [string, string]),
		hoursLine: e.data.hours_line ?? "",
		hoursLong: lines(e.data.hours_long).join("<br>"),
		mapsUrl: e.data.maps_url ?? "",
	}));

	const services: (Service & { faq: { q: string; a: string }[] })[] = serviceE.map((e) => ({
		slug: slugOf(e),
		name: e.data.title,
		navLabel: e.data.nav_label || e.data.title,
		summary: e.data.summary ?? "",
		hasPage: !!e.data.has_page,
		hideFromHub: !!e.data.hide_from_hub,
		onHome: e.data.on_home !== false,
		bookLabel: e.data.book_label || "Book an appointment",
		ctaHeading: e.data.cta_heading || "Book your appointment",
		faq: e.data.faq ?? [],
	}));

	const brands: Brand[] = brandE.map((e) => ({
		slug: slugOf(e),
		name: e.data.title,
		logo: imgSrc(e.data.logo) ?? `/assets/brands/${slugOf(e)}.png`,
		logoHeight: e.data.logo_height || "46px",
		hasPage: !!e.data.has_page,
		hideFromHub: !!e.data.hide_from_hub,
		summary: e.data.summary ?? "",
	}));
	const brandDetails: Record<string, BrandDetail> = {};
	const brandFaqs: Record<string, { q: string; a: string }[]> = {};
	for (const e of brandE) {
		const groups: BrandDetail["lines"] = [];
		for (const m of e.data.models ?? []) {
			const line = m.line || "Current models";
			let g = groups.find((x) => x.t === line);
			if (!g) groups.push((g = { t: line, models: [] }));
			const f = lines(m.features);
			g.models.push({ n: m.name, d: m.description ?? "", ...(f.length ? { f } : {}) });
		}
		brandDetails[slugOf(e)] = { lines: groups, accessories: lines(e.data.accessories), older: lines(e.data.older_models) };
		brandFaqs[slugOf(e)] = e.data.faq ?? [];
	}

	const providers: Provider[] = providerE.map((e) => ({
		slug: slugOf(e),
		name: e.data.title,
		title: e.data.job_title ?? "",
		meet: e.data.meet_label || `Meet ${e.data.title}`,
		hasPage: !!e.data.has_page,
		tone: e.data.tone || "warm",
		offices: lines(e.data.offices),
		short: e.data.short_name || e.data.title,
		bio: e.data.short_bio ?? "",
		headshot: imgSrc(e.data.headshot),
	}));

	const toPost = (e: Entry): Post & { sortDate: number } => {
		const cat = e.data.terms?.category?.[0];
		const when = e.data.post_date ?? e.data.publishedAt ?? e.data.createdAt;
		return {
			slug: slugOf(e),
			title: e.data.title,
			date: longDate(when),
			summary: e.data.excerpt ?? "",
			tone: e.data.tone || "warm",
			cat: cat?.label ?? "",
			catSlug: cat?.slug ?? "",
			author: providers.find((x) => x.slug === e.data.author)?.name ?? "",
			image: imgSrc(e.data.featured_image),
			featured: !!e.data.featured,
			sortDate: when ? new Date(when).getTime() : 0,
		};
	};
	const allPosts = postE.map(toPost).sort((a, b) => b.sortDate - a.sortDate);
	const featured = allPosts.find((x) => x.featured) ?? allPosts[0];
	const posts = allPosts.filter((x) => x !== featured);

	const resources: Resource[] = resourceE.map((e) => ({
		slug: slugOf(e),
		t: e.data.title,
		d: e.data.summary ?? "",
		tags: (e.data.terms?.resource_tag ?? []).map((t: Data) => t.label),
		page: !!e.data.has_page,
		forms: !!e.data.has_forms,
		hideFromHub: !!e.data.hide_from_hub,
	}));

	return {
		practice,
		offices,
		providers,
		services,
		brands,
		brandDetails,
		brandFaqs,
		/** Trust bar logos, picked from the template's logo library. */
		associations: (p.memberships ?? [])
			.map((m: Data) => {
				const lib = sample.associations.find((a) => a.key === m.logo);
				return lib && { ...lib, name: m.name || lib.name };
			})
			.filter(Boolean) as typeof sample.associations,
		firstVisitSteps: (p.first_visit ?? []) as { t: string; d: string }[],
		milestones: (p.milestones ?? []) as { y: string; t: string }[],
		values: (p.values ?? []) as { icon: string; t: string; d: string }[],
		/** Every post except the featured one, newest first. */
		posts,
		/** The newest three after the featured post, for Home and the sidebars. */
		latest: posts.slice(0, 3),
		featured,
		categories: catTerms.map((t) => ({ name: t.label, slug: t.slug })),
		resources,
		/** Group headings for "Group by tag": tags not marked "Label only". */
		resourceGroups: tagTerms.filter((t) => !/^label only/i.test(t.description ?? "")).map((t) => t.label),
		// Still sample content in code (see the note at the top).
		reviews: sample.reviews,
		sidebarReviews: sample.sidebarReviews,
		hearingAidStyles: sample.hearingAidStyles,
		articleBody: blog.articleBody,
	};
}

export type SiteData = Awaited<ReturnType<typeof loadSite>>;
