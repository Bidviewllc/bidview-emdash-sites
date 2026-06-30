import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { google } from "emdash/auth/providers/google";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	vite: {
		cacheDir: process.env.NODE_ENV === "production" ? ".vite-build" : ".vite-dev",
		optimizeDeps: {
			exclude: [
				"emdash",
				"emdash/middleware",
				"emdash/middleware/redirect",
				"emdash/middleware/setup",
				"emdash/middleware/auth",
				"emdash/middleware/request-context",
				"emdash/media/local-runtime",
				"@emdash-cms/cloudflare",
				"@emdash-cms/cloudflare/db/d1",
			],
		},
		server: {
			watch: {
				ignored: ["**/.vite-dev/**", "**/.vite-build/**"],
			},
		},
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
			authProviders: [google()],
		}),
	],
	devToolbar: { enabled: false },
});
