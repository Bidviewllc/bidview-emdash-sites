// The practice's content for one request: every page reads it from
// Astro.locals.site, which src/middleware.ts fills once per request.
//
// Phase 2 step 1: still built from the sample data files. The next step swaps
// loadSite() to read the same shapes from EmDash.

import * as blog from "./blog";
import * as sample from "./practice";

export async function loadSite() {
	return {
		practice: sample.practice,
		offices: sample.offices,
		providers: sample.providers,
		services: sample.services,
		brands: sample.brands,
		/** Product lines, accessories and older models, one entry per brand. */
		brandDetails: Object.fromEntries(sample.brands.map((b) => [b.slug, sample.brandDetails[b.slug] ?? sample.genericBrandDetails(b.name)])),
		brandFaqs: Object.fromEntries(sample.brands.map((b) => [b.slug, sample.brandFaq(b.name)])),
		associations: sample.associations,
		reviews: sample.reviews,
		sidebarReviews: sample.sidebarReviews,
		faq: sample.faq,
		firstVisitSteps: sample.firstVisitSteps,
		hearingAidStyles: sample.hearingAidStyles,
		milestones: sample.milestones,
		values: sample.values,
		/** Every post, newest first. */
		posts: blog.posts,
		/** The newest three, for Home and the sidebars. */
		latest: blog.posts.slice(0, 3),
		featured: blog.featured,
		categories: blog.categories,
		articleBody: blog.articleBody,
		resources: blog.resources,
		resourceGroups: blog.resourceGroups,
	};
}

export type SiteData = Awaited<ReturnType<typeof loadSite>>;
