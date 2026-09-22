// The client quotes used by the home page's Proof grid and the About page's "In
// Their Words" grid. One list, so the two pages can never drift apart.
//
// These are still the design's template copy, NOT real reviews — Liz is checking
// with Vince how the genuine ones get pulled in. Replace here and both pages
// update; nothing else reads this file.
export interface Testimonial {
	q: string;
	name: string;
	loc: string;
}

// 2026-09-22: the three design quotes (attributed to invented people) were
// removed after the content review call. Grant approved pulling his REAL reviews
// from Yelp (43), Realtor.com and Zillow (40-60 each) and Google (~7). Add them
// here as { q, name, loc } and both grids come back. While the list is empty the
// home page keeps its "Clients Who Come Back" copy and the About page skips the
// section entirely.
export const TESTIMONIALS: Testimonial[] = [];
