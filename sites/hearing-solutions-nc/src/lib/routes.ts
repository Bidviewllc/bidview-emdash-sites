// Site addresses and small helpers that don't depend on the practice's content.
import { RESOURCE_PATHS } from "./resource-paths";

export const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

export const telHref = (phone: string) => "tel:+1" + phone.replace(/\D/g, "");

/** Every template's address. */
export const routes = {
	home: "/",
	services: "/services",
	service: (slug: string) => `/services/${slug}`,
	/** The hearing aids hub: HSNC keeps the live site's Products page address. */
	hearingAids: "/products",
	brand: (slug: string) => `/hearing-aids/${slug}`,
	about: "/about",
	provider: (slug: string) => `/about/${slug}`,
	location: (slug: string) => `/locations/${slug}`,
	contact: "/contact",
	book: "/book-appointment",
	reviews: "/reviews",
	blog: "/blog",
	post: (slug: string) => `/blog/${slug}`,
	category: (slug: string) => `/blog/category/${slug}`,
	/** Blog pages 2, 3...: /blog/page/<n> (page 1 is /blog itself). */
	blogPage: (n: number) => (n > 1 ? `/blog/page/${n}` : "/blog"),
	categoryPage: (slug: string, n: number) => (n > 1 ? `/blog/category/${slug}/page/${n}` : `/blog/category/${slug}`),
	/** A patient resource page (a few keep their live-site address: src/lib/resource-paths.ts). */
	resource: (slug: string) => RESOURCE_PATHS[slug] ?? `/patient-resources/${slug}`,
	resources: "/new-patients",
	privacy: "/privacy-policy",
	terms: "/terms-of-use",
	accessibility: "/accessibility",
	sitemap: "/sitemap",
	thankYou: "/thank-you",
};
