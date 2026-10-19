// The practice's content for one request: every page reads it from
// Astro.locals.site, which src/middleware.ts fills once per request.
//
// Records come from EmDash (collections, settings and taxonomies) and are
// mapped into the shapes the templates use (src/data/types.ts). A few blocks
// are still sample content in code until they get their own records:
// reviews (Vince's reviews sync), the hearing aid style drawings, and the
// sample article body for posts that have no article text yet.

import { env } from "cloudflare:workers";
import { getLocationReviews } from "../lib/reviews-reader.mjs";
import revsSample from "./content/revs.json";
import { getEmDashCollection, getEmDashEntry, getMenu, getSiteSettings, getTaxonomyTerms } from "emdash";
import * as blog from "./blog";
import recordText from "./content/record-text.json";
import { CTA_FIELDS, CTA_MODE_OPTIONS, HERO_OPTIONS, MAIN, PAGE_TEXT, PAGES, SHARED_COLLECTION, SHARED_DEFAULTS, TEMPLATES_COLLECTION } from "./page-settings";
import * as sample from "./practice";
import type { Brand, BrandDetail, Office, Post, Provider, Resource, Review, Service } from "./types";

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
/** "H3 · Single row" → "h3"; "Cards · arrow on photo" → the team layout key. */
const TEAM_KEYS: Record<string, string> = { "cards · arrow on photo": "overlay", "cards · arrow beside name": "side", "list · photo left, short bio": "list" };
const code = (v: unknown, d: string) => {
	const s = String(v ?? "").trim().toLowerCase();
	if (!s) return d;
	return TEAM_KEYS[s] ?? s.split(/[\s·]/)[0];
};
/** URL for an EmDash image field (local media is served by EmDash's media route). */
const imgSrc = (v: any): string | undefined =>
	v?.src ?? v?.url ?? (v?.meta?.storageKey ? `/_emdash/api/media/file/${v.meta.storageKey}` : undefined);

/** An uploaded photo. */
export type Photo = { src: string; alt: string };
const photo = (v: any): Photo | undefined => {
	const src = imgSrc(v);
	return src ? { src, alt: v?.alt ?? "" } : undefined;
};

/** A menu link as the templates use it. */
export type NavLink = { label: string; href: string; target?: string; children: NavLink[] };
export const MENU_NAMES = ["header", "footer_practice", "footer_services", "footer_patients", "footer_current", "footer_quick", "footer_explore", "footer_legal"] as const;
export type MenuName = (typeof MENU_NAMES)[number];

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
	/** One-record content type: its published record's data, null if unpublished, undefined if the type doesn't exist. */
	const single = (type: string) =>
		getEmDashEntry(type, MAIN).then(
			(r) => (r.error ? undefined : ((r.entry as Entry | null)?.data ?? null)),
			() => undefined,
		);
	const [menuList, pageData, templatesData, sharedData] = await Promise.all([
		Promise.all(MENU_NAMES.map((n) => getMenu(n))),
		Promise.all(PAGES.map((d) => (d.collection ? single(d.collection) : Promise.resolve(undefined)))),
		single(TEMPLATES_COLLECTION),
		single(SHARED_COLLECTION),
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
		/** Home page record ("About us – Years in practice"); Practice details on older sites. */
		/** Schema extras (Practice details): NPI number and other profile links. */
		npi: (p.npi ?? "").trim(),
		sameAs: lines(p.same_as),
		years: (pageData[PAGES.findIndex((d) => d.slug === "home")]?.years ?? p.years ?? "") as string,
		social: {
			facebook: settings.social?.facebook ?? "",
			instagram: settings.social?.instagram ?? "",
			youtube: settings.social?.youtube ?? "",
		},
		/** Uploaded in EmDash Settings; the code-drawn demo mark shows when empty. */
		logo: imgSrc(settings.logo),
		favicon: imgSrc(settings.favicon),
		reviewControls: p.review_controls !== false,
		/**
		 * Shared photos; placeholders show until uploaded. Team photo on Shared
		 * sections, office interior on Page templates (Practice details on older sites).
		 */
		photos: { team: photo(sharedData?.team_photo) ?? photo(p.team_photo), cta: undefined as Photo | undefined, office: photo(templatesData?.office_photo) ?? photo(p.office_photo) },
		/** Site design choices (Practice details); Review controls start from these. */
		design: {
			header: code(p.header_style, "h3"),
			footer: code(p.footer_style, "f7"),
			footerLogo: code(p.footer_logo, "landscape"),
			footerBadges: p.footer_badges !== false,
			logoShape: code(p.logo_shape, "wide"),
			team: code(p.team_cards, "overlay"),
			ctaPhoto: p.cta_photo !== false,
		},
	};

	const offices: Office[] = officeE.map((e) => ({
		slug: slugOf(e),
		name: e.data.title,
		shortName: e.data.short_name ?? e.data.title,
		street: e.data.street ?? "",
		city: e.data.city_line ?? "",
		phone: e.data.phone ?? "",
		fax: e.data.fax ?? "",
		hours: (e.data.hours ?? []).map((h: Data) => [h.days, h.times] as [string, string]),
		hoursLine: e.data.hours_line ?? "",
		hoursLong: lines(e.data.hours_long).join("<br>"),
		mapsUrl: e.data.maps_url ?? "",
		photo: photo(e.data.photo),
		placeId: e.data.google_place_id || undefined,
		intro: e.data.intro || recordText.office_intro,
		directions: e.data.directions || recordText.office_directions,
		accessNotes: e.data.access_notes || recordText.office_access,
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
		heroImage: photo(e.data.hero_image),
		intro: e.data.intro || recordText.service_intro,
		content: Array.isArray(e.data.content) ? e.data.content : undefined,
		sidebarText: e.data.sidebar_text || recordText.service_sidebar,
	}));

	const brands: Brand[] = brandE.map((e) => ({
		slug: slugOf(e),
		name: e.data.title,
		logo: imgSrc(e.data.logo) ?? `/assets/brands/${slugOf(e)}.png`,
		logoHeight: e.data.logo_height || "46px",
		hasPage: !!e.data.has_page,
		hideFromHub: !!e.data.hide_from_hub,
		summary: e.data.summary ?? "",
		heroImage: photo(e.data.hero_image),
		intro: e.data.intro || recordText.brand_intro,
		modelsIntro: e.data.models_intro || recordText.brand_models_intro,
		accessoriesIntro: e.data.accessories_intro || recordText.brand_accessories_intro,
		olderIntro: e.data.older_intro || recordText.brand_older_intro,
		careText: e.data.care_text || recordText.brand_care,
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
		// HSNC: the design photo until one is uploaded (also covers local dev, where the seed can't download).
		headshot: imgSrc(e.data.headshot) ?? sample.providers.find((x) => x.slug === slugOf(e))?.headshot,
		bioRich: Array.isArray(e.data.bio) ? e.data.bio : undefined,
		videoUrl: e.data.video_url || undefined,
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
			iso: when ? new Date(when).toISOString() : undefined,
			content: Array.isArray(e.data.content) ? e.data.content : undefined,
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
		content: Array.isArray(e.data.content) ? e.data.content : undefined,
		formsPdf: imgSrc(e.data.forms_pdf),
		formsUrl: e.data.forms_url || undefined,
		heroImage: photo(e.data.hero_image),
	}));

	// Template pages: each fixed page is its own one-record content type;
	// published = on. A content type that doesn't exist (a site set up before
	// it) counts as on with the template's defaults. Record-page settings come
	// from the Page templates record. Each page's settings become the starting
	// values of its Review controls settings.
	const shared = sharedData ?? {};
	practice.photos.cta = photo(shared.cta_photo) ?? photo(p.cta_photo_image);
	const dataFor = (i: number): Data => {
		const def = PAGES[i];
		if (def.template) {
			const tpl = templatesData ?? {};
			return { ...tpl, hero: tpl[`${def.template}_hero`] };
		}
		return pageData[i] ?? {};
	};
	const pageOn = (slug: string) => {
		const i = PAGES.findIndex((d) => d.slug === slug);
		const def = PAGES[i];
		return !!def?.alwaysOn || !def?.collection || pageData[i] !== null;
	};
	const pages: Record<string, { on: boolean; body?: unknown[]; hero?: string; heroImage?: Photo; communityPhoto?: Photo; embed?: string; values: Record<string, string | boolean>; text: Record<string, string> }> = {};
	for (const [i, def] of PAGES.entries()) {
		const d = dataFor(i);
		const values: Record<string, string | boolean> = {};
		for (const st of def.settings) {
			const v = d[st.field];
			if (v === undefined || v === null || v === "") continue;
			values[st.key] = st.type === "bool" ? !!v : (st.options.find(([, label]) => label === v)?.[0] ?? st.default);
		}
		const hero = HERO_OPTIONS.find(([, label]) => label === d.hero)?.[0];
		const text = Object.fromEntries(
			(PAGE_TEXT[def.slug] ?? []).map((f) => [f.field, d[f.field]]).filter(([, v]) => typeof v === "string" && v.trim()),
		) as Record<string, string>;
		// Booking band: the shared one unless this page is set to customize it.
		if ((PAGE_TEXT[def.slug] ?? []).some((f) => CTA_FIELDS.includes(f.field)) && d.cta_mode !== CTA_MODE_OPTIONS[1]) {
			for (const k of CTA_FIELDS) text[k] = (typeof shared[k] === "string" && shared[k].trim()) || SHARED_DEFAULTS[k as keyof typeof SHARED_DEFAULTS];
		}
		pages[def.slug] = { body: Array.isArray(d.body) ? d.body : undefined, on: pageOn(def.slug), ...(hero ? { hero } : {}), heroImage: photo(d.hero_image), communityPhoto: photo(d.community_photo), embed: typeof d.scheduler_embed === "string" && d.scheduler_embed.trim() ? d.scheduler_embed : undefined, values, text };
	}
	/** A list field on a template page's record, if that field exists there. */
	const pageList = (slug: string, field: string) => {
		const v = pageData[PAGES.findIndex((d) => d.slug === slug)]?.[field];
		return Array.isArray(v) ? v : undefined;
	};
	// Switch-on rules that follow other pages being on.
	pages.home.values.about = pageOn("about");
	pages.home.values.revlink = pageOn("reviews");
	pages.home.values.posts = (pages.home.values.posts ?? true) && pageOn("blog") && postE.length > 0;
	pages.services.values.revlink = pageOn("reviews");
	pages["service-pages"].values.revlink = pageOn("reviews");
	pages["service-pages"].values.posts = (pages["service-pages"].values.posts ?? true) && pageOn("blog") && postE.length > 0;

	// Pages that exist right now. A menu item pointing at a page that isn't live
	// (own page off, unpublished, deleted, or a template page switched off) is
	// left out of the menu.
	const offPaths = new Set(PAGES.filter((d) => d.path && !pages[d.slug].on).map((d) => d.path!));
	const live = new Set<string>([
		...services.filter((x) => x.hasPage).map((x) => `/services/${x.slug}`),
		...brands.filter((x) => x.hasPage).map((x) => `/hearing-aids/${x.slug}`),
		...providers.filter((x) => x.hasPage).map((x) => `/about/${x.slug}`),
		...allPosts.map((x) => `/blog/${x.slug}`),
		...catTerms.map((x) => `/blog/category/${x.slug}`),
		...resources.filter((x) => x.page).map((x) => `/patient-resources/${x.slug}`),
	]);
	const RECORD_PAGE = /^\/(services|hearing-aids|about|locations|patient-resources|blog(\/category)?)\/[^/#?]+/;
	const isLive = (href: string) => {
		const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
		if (offPaths.has(path) || (path.startsWith("/blog") && offPaths.has("/blog"))) return false;
		const m = href.match(RECORD_PAGE);
		return !m || live.has(m[0]);
	};
	const toLinks = (items: any[] = []): NavLink[] =>
		items
			.filter((i) => isLive(i.url))
			.map((i) => ({ label: i.label, href: i.url, ...(i.target ? { target: i.target } : {}), children: toLinks(i.children) }));
	const menus = Object.fromEntries(MENU_NAMES.map((n, i) => [n, toLinks(menuList[i]?.items)])) as Record<MenuName, NavLink[]>;

	// Google reviews: the site's own D1 tables (filled weekly by the reviews sync;
	// hidden ones are left out by the reader). Until a sync has run, the sample
	// reviews show. Google's own rating and count win over Practice details.
	const minStars = Number(String(p.reviews_min_rating ?? "").match(/[1-5]/)?.[0] ?? 1);
	const monthYear = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) : "");
	const toReview = (r: any, loc?: string): Review => ({ name: r.author || "Google user", date: monthYear(r.publishedAt) || r.timeAgo, text: r.text, rating: r.rating ?? 5, long: r.text.length > 260, loc });
	const synced = await Promise.all(offices.map((o) => getLocationReviews((env as any).DB, o.slug, undefined)));
	const fromGoogle = synced.some((x) => x.source === "d1");
	const reviewsByLocation: Record<string, Review[]> = {};
	let reviewList: Review[];
	let sidebarList: Review[];
	/** The Reviews page list (the sample set there is bigger than Home's). */
	let reviewsPage: Review[] | undefined;
	if (fromGoogle) {
		offices.forEach((o, i) => {
			reviewsByLocation[o.slug] = (synced[i].reviews ?? []).filter((r: any) => r.text?.trim() && (r.rating ?? 5) >= minStars).map((r: any) => toReview(r, o.shortName));
		});
		const dated = offices.flatMap((o, i) => (synced[i].reviews ?? []).map((r: any) => ({ r, o })));
		reviewList = dated
			.filter(({ r }) => r.text?.trim() && (r.rating ?? 5) >= minStars)
			.sort((a, b) => String(b.r.publishedAt).localeCompare(String(a.r.publishedAt)))
			.map(({ r, o }) => toReview(r, o.shortName));
		sidebarList = (reviewList.filter((r) => r.text.length <= 320).length >= 3 ? reviewList.filter((r) => r.text.length <= 320) : reviewList).slice(0, 3);
		const counted = synced.filter((x) => x.source === "d1" && x.votesCount);
		const votes = counted.reduce((n, x) => n + Number(x.votesCount), 0);
		if (votes) {
			const avg = counted.reduce((n, x) => n + Number(x.rating ?? 0) * Number(x.votesCount), 0) / votes;
			practice.rating = { score: avg.toFixed(1), count: votes };
		}
	} else {
		const sampleAll = (revsSample as { name: string; date: string; loc: string; text: string; four: boolean }[]).map((r) => ({ name: r.name, date: r.date, text: r.text, rating: r.four ? 4 : 5, long: r.text.length > 260, loc: r.loc }));
		for (const o of offices) reviewsByLocation[o.slug] = sampleAll.filter((r) => r.loc === o.shortName);
		reviewList = sample.reviews;
		sidebarList = sample.sidebarReviews;
		reviewsPage = sampleAll;
	}
	const reviewPlace = offices.find((o) => o.placeId)?.placeId;

	return {
		practice,
		/** Reviews, newest first (min-star setting applied). Sample reviews until the first sync. */
		reviews: reviewList,
		sidebarReviews: sidebarList,
		reviewsPage: reviewsPage ?? reviewList,
		reviewsByLocation,
		reviewsFromGoogle: fromGoogle,
		/** The shared booking band (Shared sections), for pages without their own. */
		sharedBand: {
			heading: (typeof shared.cta_heading === "string" && shared.cta_heading.trim()) || SHARED_DEFAULTS.cta_heading,
			text: (typeof shared.cta_text === "string" && shared.cta_text.trim()) || SHARED_DEFAULTS.cta_text,
		},
		/** Google "write a review" link (first office with a Place ID), else none. */
		reviewLink: reviewPlace ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(reviewPlace)}` : undefined,
		/** Menus from EmDash (Menus screen), with links to pages that aren't live left out. */
		menus,
		/** Pages list: on/off, hero choice and settings per template page (keyed by PAGES slug). */
		pages,
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
		/** Lists that belong to one page: on that page's record (Practice details on older sites). */
		firstVisitSteps: (pageList("services", "first_visit") ?? p.first_visit ?? []) as { t: string; d: string }[],
		milestones: (pageList("about", "milestones") ?? p.milestones ?? []) as { y: string; t: string }[],
		values: (pageList("about", "values") ?? p.values ?? []) as { icon: string; t: string; d: string }[],
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
		hearingAidStyles: sample.hearingAidStyles,
		articleBody: blog.articleBody,
	};
}

export type SiteData = Awaited<ReturnType<typeof loadSite>>;
