// Patient resources that keep their live-site address instead of /patient-resources/<slug>
// (Liz, 2026-11-05: the live site's /hearing-aids/ was the Hearing Aid Overview, and the
// eight old service pages stay as their own pages beside the one Services page;
// 2026-11-10: the eight top-level info pages, e.g. /custom-hearing-aids, too).
// Drawn by src/pages/hearing-aids/index.astro, hearing-aids/[brand].astro (earmolds) and
// the catch-all [...slug].astro; /patient-resources/<slug> redirects to these addresses
// (redirectFor in src/data/hsnc/redirects.ts).

/** Resource slug → its own address. */
export const RESOURCE_PATHS: Record<string, string> = {
	"hearing-aid-overview": "/hearing-aids",
	"hearing-evaluations": "/hearing-services/hearing-evaluations",
	"functional-hearing-assessment": "/hearing-services/functional-hearing-assessment",
	"cognivue-cognitive-testing": "/hearing-services/cognivue-cognitive-testing",
	"tinnitus-treatments": "/hearing-services/tinnitus-treatments",
	"ear-wax-removal": "/hearing-services/ear-wax-removal",
	"hearing-aid-repair": "/hearing-services/hearing-aid-repair",
	"assistive-listening-devices": "/assistive-listening-devices",
	"earmolds-for-hearing-aids": "/hearing-aids/earmolds-for-hearing-aids",
	// The old site's top-level info pages keep their addresses too (Liz, 2026-11-10).
	"custom-hearing-aids": "/custom-hearing-aids",
	"consumers-guide-to-hearing-aids": "/consumers-guide-to-hearing-aids",
	"informational-videos": "/informational-videos",
	"live-speech-mapping": "/live-speech-mapping",
	"hearing-loss": "/hearing-loss",
	"benefits-of-treating-hearing-loss": "/the-benefits-of-treating-hearing-loss",
	"online-communication-training-program": "/online-communication-training-program",
	"hearing-health-faqs": "/hearing-health-faqs",
};


/** A link to /patient-resources/<slug> for one of these, pointed at its own address (text typed before the move). */
export const keptHref = (href: string) =>
	href.replace(/^\/patient-resources\/([a-z0-9-]+)\/?(?=$|[#?])/, (all, slug: string) => RESOURCE_PATHS[slug] ?? all);

/** The resource slug drawn at an address, if it is one of these. */
export const resourceAt = (path: string) => Object.entries(RESOURCE_PATHS).find(([, p]) => p === (path.replace(/\/$/, "") || "/"))?.[0];
