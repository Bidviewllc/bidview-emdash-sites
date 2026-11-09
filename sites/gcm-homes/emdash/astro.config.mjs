import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			// Native (in-host) plugin: two read-only editor panels on the Listings
			// collection -- "From the MLS" and "Listing history" (src/plugins/gcm-admin).
			// Absolute file:// URL so the virtual emdash/plugins module can resolve it
			// at build time (relative paths fail: the virtual module has no on-disk
			// location to anchor them).
			plugins: [
				{
					id: "gcm-admin",
					version: "0.1.0",
					entrypoint: new URL("./src/plugins/gcm-admin/index.ts", import.meta.url).href,
				},
			],
		}),
	],
	devToolbar: { enabled: false },
});
