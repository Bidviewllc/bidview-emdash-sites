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

export const TESTIMONIALS: Testimonial[] = [
	{
		q: "Grant's knowledge of Incline Village is encyclopedic. He knew about our dream home before it even hit the market, allowing us to secure it in a cash-only bidding war.",
		name: "The Harrison Family",
		loc: "LAKESHORE BOULEVARD",
	},
	{
		q: "Selling a property we had owned for 40 years was emotional. Grant handled the transition with such dignity and achieved a price that far exceeded our expectations.",
		name: "Dr. Robert Chen",
		loc: "TYNER WAY",
	},
	{
		q: "Navigating the TRPA requirements and water rights was daunting until Grant stepped in. His legal background and local connections saved us months of delay.",
		name: "Sarah & James Miller",
		loc: "CRYSTAL BAY",
	},
];
