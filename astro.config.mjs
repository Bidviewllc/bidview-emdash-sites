import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	site: "https://thechicagomarketingagency.com",
	redirects: {
		// These blog URLs were nav-placeholder links for ~1 day (Apr 2-3 2026) before
		// being replaced by real /industries/ pages. Google still has them indexed.
		"/blog/dental-marketing-chicago-guide-2026":                 { destination: "/industries/dentists/",              status: 301 },
		"/blog/chicago-law-firms-more-clients-from-google":          { destination: "/industries/law-firms/",             status: 301 },
		"/blog/why-chicago-restaurants-need-strong-online-presence": { destination: "/industries/restaurants/",           status: 301 },
		"/blog/ecommerce-seo-chicago-compete-with-amazon":           { destination: "/industries/ecommerce/",             status: 301 },
		"/blog/hvac-marketing-chicago-getting-calls":                { destination: "/industries/hvac/",                  status: 301 },
		"/blog/real-estate-marketing-chicago-standing-out":          { destination: "/industries/real-estate/",           status: 301 },
		"/blog/google-ads-chicago":                                  { destination: "/services/paid-advertising/",        status: 301 },
		"/blog/website-conversion-optimization":                     { destination: "/services/conversion-optimization/", status: 301 },
		"/blog/local-seo-chicago-businesses":                        { destination: "/services/seo/",                     status: 301 },
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			sandboxRunner: sandbox(),
		}),
	],
	trailingSlash: "always",
	devToolbar: { enabled: false },
});
