// Structured data (JSON-LD) built from the practice's content, following
// Vince's rules from the Abilene audit (page-templates.md, "SEO setup"):
//  - absolute @id values; no staging addresses in sameAs
//  - a clinic is MedicalBusiness, never Physician or Otolaryngologic
//  - hours match the visible page (split shifts included); unreadable hours are left out
//  - BlogPosting only on articles, author linked to their profile
//  - no review or star-rating schema for the practice's own reviews
//  - one office: MedicalBusiness + WebSite on every page; more than one:
//    Organization + WebSite site-wide and a MedicalBusiness on each location page
//  - FAQPage only with the questions shown on the page; BreadcrumbList everywhere
import type { SiteData } from "../data/site";

type Thing = Record<string, unknown>;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dayIndex = (w: string) => DAYS.findIndex((d) => d.toLowerCase().startsWith(w.toLowerCase().slice(0, 3)));

/** "Mon – Thu", "Tue, Thu", "Tue and Thu", "Fri" → day names; undefined when unreadable. */
function parseDays(s: string): string[] | undefined {
	const t = s.trim();
	const range = t.match(/^([A-Za-z]{3,})\.?\s*(?:–|—|-|to|through)\s*([A-Za-z]{3,})\.?$/i);
	if (range) {
		const a = dayIndex(range[1]);
		const b = dayIndex(range[2]);
		if (a < 0 || b < 0) return undefined;
		const out: string[] = [];
		for (let i = a; ; i = (i + 1) % 7) {
			out.push(DAYS[i]);
			if (i === b || out.length > 7) break;
		}
		return out;
	}
	const parts = t.split(/\s*(?:,|&|\band\b)\s*/i).filter(Boolean);
	const idx = parts.map(dayIndex);
	return parts.length && idx.every((i) => i >= 0) ? idx.map((i) => DAYS[i]) : undefined;
}

/** "8:00 – 5:00", "9 am – 4 pm", "9:00 – 12:00, 1:00 – 5:00" → [opens, closes] pairs (24h). */
function parseTimes(s: string): [string, string][] | undefined {
	const shifts = s.split(/\s*(?:,|;|&|\band\b)\s*/i).filter(Boolean);
	const out: [string, string][] = [];
	for (const sh of shifts) {
		const m = sh.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:–|—|-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i);
		if (!m) return undefined;
		const to24 = (h: number, ap: string | undefined, fallback: (h: number) => number) =>
			ap ? (ap.toLowerCase().startsWith("p") ? (h % 12) + 12 : h % 12) : fallback(h);
		const open = to24(+m[1], m[3], (h) => (h < 7 ? h + 12 : h));
		const close = to24(+m[4], m[6], (h) => (h <= open % 12 || h < 7 ? h + 12 : h));
		const fmt = (h: number, mm?: string) => `${String(h).padStart(2, "0")}:${mm ?? "00"}`;
		if (close <= open) return undefined;
		out.push([fmt(open, m[2]), fmt(close, m[5])]);
	}
	return out.length ? out : undefined;
}

/** Office hours rows as OpeningHoursSpecification; empty when any open row can't be read. */
export function openingHours(rows: [string, string][]): Thing[] {
	const specs: Thing[] = [];
	for (const [days, times] of rows) {
		if (/closed/i.test(times) || /^other/i.test(days)) continue;
		const d = parseDays(days);
		const t = parseTimes(times);
		if (!d || !t) return [];
		for (const [opens, closes] of t) specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: d, opens, closes });
	}
	return specs;
}

const parseCity = (line: string) => {
	const m = line.match(/^(.*?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
	return m ? { addressLocality: m[1], addressRegion: m[2], postalCode: m[3] } : { addressLocality: line };
};

export type SchemaInput = {
	site: SiteData;
	origin: string;
	path: string;
	/** Page title without the practice name. */
	title: string;
	description?: string | null;
	/** Breadcrumb trail shown on the page, as [label, path]. */
	crumbs: [string, string][];
};

export function schemaGraph({ site, origin, path, title, description, crumbs }: SchemaInput): Thing {
	const { practice, offices, services, providers, brands, brandFaqs } = site;
	const abs = (p: string) => (p.startsWith("http") ? p : origin + (p.startsWith("/") ? p : `/${p}`));
	const orgId = `${origin}/#organization`;
	const siteId = `${origin}/#website`;
	const sameAs = [practice.social.facebook, practice.social.instagram, practice.social.youtube, ...(practice.sameAs ?? [])].filter(
		(u) => /^https:\/\//.test(u) && !/workers\.dev|localhost|staging|vercel\.app|pages\.dev/.test(u),
	);
	const logo = practice.logo ? abs(practice.logo) : undefined;
	const office = (o: SiteData["offices"][number], id: string): Thing => {
		const hours = openingHours(o.hours);
		return {
			"@type": "MedicalBusiness",
			"@id": id,
			name: offices.length > 1 ? `${practice.name}, ${o.shortName}` : practice.name,
			url: offices.length > 1 ? abs(`/locations/${o.slug}`) : abs("/"),
			telephone: o.phone,
			...(practice.email && !/\.example$/.test(practice.email) ? { email: practice.email } : {}),
			address: { "@type": "PostalAddress", streetAddress: o.street, ...parseCity(o.city), addressCountry: "US" },
			...(hours.length ? { openingHoursSpecification: hours } : {}),
			...(o.mapsUrl ? { hasMap: o.mapsUrl } : {}),
			...(o.photo ? { image: abs(o.photo.src) } : logo ? { image: logo } : {}),
			...(offices.length > 1 ? { parentOrganization: { "@id": orgId } } : {}),
		};
	};

	const graph: Thing[] = [];
	// Site-wide: the practice and the website.
	if (offices.length === 1) {
		graph.push({ ...office(offices[0], orgId), ...(logo ? { logo } : {}), ...(sameAs.length ? { sameAs } : {}), ...(practice.npi ? { identifier: { "@type": "PropertyValue", propertyID: "NPI", value: practice.npi } } : {}) });
	} else {
		graph.push({
			"@type": "Organization",
			"@id": orgId,
			name: practice.name,
			url: abs("/"),
			...(logo ? { logo } : {}),
			...(sameAs.length ? { sameAs } : {}),
			...(practice.npi ? { identifier: { "@type": "PropertyValue", propertyID: "NPI", value: practice.npi } } : {}),
			department: offices.map((o) => ({ "@id": abs(`/locations/${o.slug}#place`) })),
		});
	}
	graph.push({ "@type": "WebSite", "@id": siteId, url: abs("/"), name: practice.name, publisher: { "@id": orgId } });

	// This page.
	const pageUrl = abs(path);
	graph.push({
		"@type": "WebPage",
		"@id": `${pageUrl}#webpage`,
		url: pageUrl,
		name: title,
		...(description ? { description } : {}),
		isPartOf: { "@id": siteId },
		about: { "@id": orgId },
		...(crumbs.length > 1 ? { breadcrumb: { "@id": `${pageUrl}#breadcrumb` } } : {}),
	});
	if (crumbs.length > 1)
		graph.push({
			"@type": "BreadcrumbList",
			"@id": `${pageUrl}#breadcrumb`,
			itemListElement: crumbs.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(p) })),
		});

	const seg = path.replace(/\/$/, "").split("/").filter(Boolean);
	const faq = (items: { q: string; a: string }[]) =>
		items.length && graph.push({ "@type": "FAQPage", "@id": `${pageUrl}#faq`, mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });

	if (seg[0] === "locations" && seg[1] && offices.length > 1) {
		const o = offices.find((x) => x.slug === seg[1]);
		if (o) graph.push(office(o, abs(`/locations/${o.slug}#place`)));
	}
	if (seg[0] === "services" && seg[1]) {
		const sv = services.find((x) => x.slug === seg[1]);
		if (sv) {
			graph.push({ "@type": "Service", "@id": `${pageUrl}#service`, name: sv.name, description: sv.summary || description, provider: { "@id": orgId }, ...(practice.city ? { areaServed: practice.city } : {}), url: pageUrl });
			faq(sv.faq ?? []);
		}
	}
	if (seg[0] === "hearing-aids" && seg[1]) {
		const b = brands.find((x) => x.slug === seg[1]);
		if (b) {
			graph.push({ "@type": "Brand", "@id": `${pageUrl}#brand`, name: b.name, ...(b.summary ? { description: b.summary } : {}), ...(b.logo ? { logo: abs(b.logo) } : {}) });
			faq(brandFaqs[b.slug] ?? []);
		}
	}
	if (seg[0] === "about" && seg[1]) {
		const pr = providers.find((x) => x.slug === seg[1]);
		if (pr) {
			const cred = pr.name.match(/,\s*([A-Za-z.]+(?:,\s*[A-Za-z.]+)*)$/);
			graph.push({
				"@type": "Person",
				"@id": `${pageUrl}#person`,
				name: pr.name.replace(/,\s*[A-Za-z.]+(?:,\s*[A-Za-z.]+)*$/, ""),
				...(cred ? { honorificSuffix: cred[1] } : {}),
				jobTitle: pr.title,
				worksFor: { "@id": orgId },
				url: pageUrl,
				...(pr.headshot ? { image: abs(pr.headshot) } : {}),
			});
		}
	}
	if (seg[0] === "blog" && seg[1] && seg[1] !== "category") {
		const p = [site.featured, ...site.posts].find((x) => x?.slug === seg[1]);
		if (p) {
			const author = providers.find((x) => x.name === p.author);
			graph.push({
				"@type": "BlogPosting",
				"@id": `${pageUrl}#article`,
				headline: p.title,
				...(p.summary ? { description: p.summary } : {}),
				...(p.iso ? { datePublished: p.iso } : {}),
				...(p.image ? { image: abs(p.image) } : {}),
				...(author ? { author: { "@type": "Person", name: author.name, ...(author.hasPage ? { url: abs(`/about/${author.slug}`) } : {}) } } : {}),
				publisher: { "@id": orgId },
				mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
			});
		}
	}
	return { "@context": "https://schema.org", "@graph": graph };
}
