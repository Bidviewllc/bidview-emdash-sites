import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { google } from "emdash/auth/providers/google";

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
			authProviders: [google()],
		}),
	],
	vite: {
		cacheDir: process.env.VITE_CACHE_DIR || "node_modules/.vite",
		optimizeDeps: {
			exclude: ["emdash", "emdash/astro", "emdash/page", "@emdash-cms/cloudflare"],
		},
	},
	devToolbar: { enabled: false },
});
