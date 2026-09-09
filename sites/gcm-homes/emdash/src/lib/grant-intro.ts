// The "Your Neighbor Before You Even Arrive" section, read from the
// `grant_intro` singleton (Grant intro (site-wide) in the dashboard, entry
// "default"). Editing it there updates the home page and every listing page at
// once.
//
// Two pages render it and they cannot share markup, which is why this exists:
//   * the home page is Astro, and uses components/GrantIntro.astro
//   * a listing page is src/detail-page.html, served raw and built in the
//     browser from /api/listing-by-slug, so it has no access to components
// Both go through this one function, so they cannot drift on the DATA even
// though each writes its own markup. The classes are shared too
// (.grant-intro*, in styles.css), so they cannot drift on the LOOK either.
import { getEmDashEntry } from "emdash";
import { imageUrl } from "./media";

export interface GrantIntro {
	eyebrow: string;
	headline: string;
	body: string;
	photo: string;
	ctaLabel: string;
	ctaHref: string;
	/** The listing page asks about the property in front of the reader, not
	 *  about Grant, so its button has its own label. Still edited in the same
	 *  entry -- one screen, both buttons. */
	listingCtaLabel: string;
	creds: Array<{ t: string; d: string }>;
}

// Fallbacks match the seeded entry. They are here so a page still renders if
// the collection has not been pushed yet, not as a second source of truth --
// change the copy in the dashboard, not here.
const FALLBACK: GrantIntro = {
	eyebrow: "Your Neighbor Before You Even Arrive",
	headline: "Grant C. Meyer",
	body:
		"Buying here is not the same as buying anywhere else. The lot lines, the lake rights, " +
		"the TRPA coverage rules, the difference one street makes to a view — those are the " +
		"things that decide whether a house is worth what it's listed at. Thirty-five years of " +
		"living here is how you learn them.",
	photo: "/assets/grant.jpg",
	ctaLabel: "MORE ABOUT GRANT",
	ctaHref: "/about/",
	listingCtaLabel: "LET'S TALK ABOUT THIS PROPERTY",
	creds: [
		{ t: "35-Year Resident", d: "Unmatched local knowledge and community roots." },
		{ t: "17 Years Realtor", d: "Navigating every market cycle since 2007." },
		{ t: "Volume Leader", d: "Consistently ranked in the top 1% of Sierra agents." },
		{ t: "Legal Training", d: "Expertise in complex zoning and water rights." },
	],
};

const str = (v: unknown, fallback: string): string => {
	const s = (v ?? "").toString().trim();
	return s || fallback;
};

export async function getGrantIntro(): Promise<GrantIntro> {
	let d: any = {};
	try {
		const res = await getEmDashEntry("grant_intro", "default");
		d = res?.entry?.data ?? {};
	} catch {
		d = {};
	}

	// A credential row is dropped when its title is blank, so Grant can show
	// three or five without the layout leaving a hole. The detail is optional.
	const creds = [1, 2, 3, 4]
		.map((i) => ({
			t: (d[`cred${i}_t`] ?? "").toString().trim(),
			d: (d[`cred${i}_d`] ?? "").toString().trim(),
		}))
		.filter((c) => c.t);

	return {
		eyebrow: str(d.eyebrow, FALLBACK.eyebrow),
		headline: str(d.headline, FALLBACK.headline),
		body: str(d.body, FALLBACK.body),
		photo: imageUrl(d.photo) ?? FALLBACK.photo,
		ctaLabel: str(d.cta_label, FALLBACK.ctaLabel),
		ctaHref: str(d.cta_href, FALLBACK.ctaHref),
		listingCtaLabel: str(d.listing_cta_label, FALLBACK.listingCtaLabel),
		creds: creds.length ? creds : FALLBACK.creds,
	};
}
