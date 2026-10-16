import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

// Server-rendered: content comes from EmDash (D1 + R2) on each request, and the
// Review controls settings in the query string shape the page.
//
// Do not set trailingSlash: "always": it breaks every /_emdash route.
export default defineConfig({
	output: "server",
	adapter: cloudflare({ imageService: "passthrough" }),
	trailingSlash: "ignore",
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [
				{
					// Admin "Reviews" screen: hide or show each synced Google review.
					// Absolute file URLs: the virtual plugin modules have no folder to resolve from.
					id: "reviews",
					version: "0.1.0",
					entrypoint: new URL("./src/plugins/reviews/index.ts", import.meta.url).href,
					adminEntry: new URL("./src/plugins/reviews/admin.tsx", import.meta.url).href,
					adminPages: [{ path: "/", label: "Reviews", icon: "star" }],
				},
			],
		}),
	],
	devToolbar: { enabled: false },
});
