// Site addresses and small helpers that don't depend on the practice's content.

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
	hearingAids: "/hearing-aids",
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
	resource: (slug: string) => `/patient-resources/${slug}`,
	resources: "/new-patients",
	privacy: "/privacy-policy",
	terms: "/terms-of-use",
	accessibility: "/accessibility",
	sitemap: "/sitemap",
	thankYou: "/thank-you",
};
