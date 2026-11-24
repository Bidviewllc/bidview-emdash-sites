/**
 * Public results from Bidview Marketing, the team that delivers work for
 * The Chicago Marketing Agency. Only figures and quotes that appear on
 * https://www.bidviewmarketing.com/ belong here.
 *
 * Stats are the homepage "From traction to takeover" cards.
 * The 15% figure is the third card's published label, "15% revenue increase
 * during the 2020 COVID-19 economic shutdown", on https://www.bidviewmarketing.com/
 * and in sites/bidviewmarketing-staging/Pages/bidview-homepage.html.
 * That card's animated number is +$200k; the label is the 15% line.
 * Quotes are the four testimonials on that same page, copied with the ellipses the site publishes.
 */

export const BIDVIEW_URL = "https://www.bidviewmarketing.com/";

export const PROOF_ATTRIBUTION =
	"Published client results from Bidview Marketing. These figures are not a forecast, and they are not a Chicago-only client count.";

export const verifiedStats: { value: string; label: string }[] = [
	{
		value: "+300%",
		label: "Increase in organic new patients with strategic local marketing",
	},
	{
		value: "+200%",
		label: "Increase in patient contacts through site redevelopment",
	},
	{
		value: "15%",
		label: "Revenue increase during the 2020 COVID-19 economic shutdown",
	},
];

export const verifiedQuotes: { quote: string; name: string; role: string }[] = [
	{
		quote:
			"I started using Bidview in 2019 so that when the pandemic hit, we were doing very, very well. I was able to cut back on everything else, and it paid back 1000 fold. I highly recommend Bidview Marketing.",
		name: "Dr. Judy Huch",
		role: "Owner and Senior Audiologist, Oro Valley Audiology",
	},
	{
		quote:
			"We had an incredible experience working with Bidview Marketing. […] Thanks to their efforts, we've seen an increase in new customers and significant improvements in our online presence. […] I highly recommend Bidview to anyone looking for top-notch SEO and web development services!",
		name: "Brandon Ferris",
		role: "President and Co-founder, Starter Box Studios",
	},
	{
		quote:
			"Bidview's knowledge on SEO, AI and website development is unmatched. Focused approach on what will drive results for your business. I've worked with many vendors through the years, and Cam and Vince are as knowledgeable as they come in the field.",
		name: "Logan Fox",
		role: "Digital Marketing Manager, EnVista Forensics",
	},
	{
		quote:
			"What sets Bidview apart is their integrity. They won't just take on any project for the sake of it; if they feel they can't provide value or that the partnership doesn't make sense, they will respectfully turn you down. This honesty is rare and refreshing in the industry.",
		name: "Mike McNamara",
		role: "Managing Partner, Willow Manor",
	},
];

/** Neighborhoods with a real landing page in src/pages/[neighborhood]/index.astro. */
export const NEIGHBORHOOD_SLUGS = [
	"lincoln-park",
	"wicker-park",
	"logan-square",
	"river-north",
	"the-loop",
	"west-loop",
	"bucktown",
	"lakeview",
	"old-town",
	"gold-coast",
	"streeterville",
	"hyde-park",
	"pilsen",
	"bridgeport",
	"andersonville",
	"uptown",
	"edgewater",
	"rogers-park",
	"ravenswood",
	"lincoln-square",
	"albany-park",
	"irving-park",
	"avondale",
	"humboldt-park",
	"ukrainian-village",
	"west-town",
	"south-loop",
	"bronzeville",
	"chinatown",
	"little-italy",
] as const;

const NEIGHBORHOOD_SET = new Set<string>(NEIGHBORHOOD_SLUGS);

export function hasNeighborhoodPage(slug: string): boolean {
	return NEIGHBORHOOD_SET.has(slug);
}

/**
 * Drop sentences that state an agency result, headcount, price, or rating
 * we cannot verify. Used for CMS fields that still hold the original seed.
 */
const UNVERIFIED_SENTENCE =
	/most (accounts|clients|practices|businesses) see|our clients (typically|see|average)|join \d|chicago businesses that trust|\b\d{2,}\+\s+chicago\b|retainers start at|\$\s?\d|ad spend|no outsourcing|in-house|we manage |manage social for|\b\d+(\.\d+)?x\b|\b\d+(\.\d+)?%|average google rating|page 5|cost per lead|roas improvement|those thresholds|below those|those numbers come from google/i;

/** Agency-result sentences. Narrower than scrubUnverified so educational posts keep market context. */
const AGENCY_RESULT_SENTENCE =
	/most accounts see|most clients see|most practices see|most chicago businesses see measurable|roas improvement|achieves (a )?\d|\d+\s*[–—-]\s*\d+%\s*(roas|conversion)|520%\s*more calls|5x more calls|7x more direction|35% more website clicks|those numbers come from google/i;

export function scrubAgencyResultClaims(text: string | undefined | null): string {
	if (!text) return "";
	const parts = text.split(/(?<=[.!?])\s+/);
	const kept = parts.map((s) => s.trim()).filter((s) => s && !AGENCY_RESULT_SENTENCE.test(s));
	if (kept.length === 0) return "";
	if (kept.length === parts.length && AGENCY_RESULT_SENTENCE.test(text)) return "";
	return kept.join(" ");
}

export function scrubContentTree<T>(value: T): T {
	if (Array.isArray(value)) return value.map((item) => scrubContentTree(item)) as T;
	if (value && typeof value === "object") {
		const next: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
			if (key === "text" && typeof child === "string") next[key] = scrubAgencyResultClaims(child);
			else next[key] = scrubContentTree(child);
		}
		return next as T;
	}
	return value;
}

export function scrubUnverified(text: string | undefined | null): string {
	if (!text) return "";
	const kept = text
		.split(/(?<=[.!?])\s+/)
		.map((s) => s.trim())
		.filter((s) => s && !UNVERIFIED_SENTENCE.test(s));
	return kept.join(" ");
}

export function safeCtaHeading(heading: string | undefined, fallback: string): string {
	const value = (heading || "").trim();
	if (!value || UNVERIFIED_SENTENCE.test(value) || /#1|guarantee/i.test(value)) return fallback;
	return value;
}
