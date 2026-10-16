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
		}),
	],
	devToolbar: { enabled: false },
});
