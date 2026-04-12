import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
// Tailwind handled via postcss.config.mjs (not @astrojs/tailwind — conflicts with emdash admin CSS)
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	site: "https://audiologistdirectory.com",
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		sitemap({
			changefreq: "weekly",
			priority: 0.7,
		}),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			sandboxRunner: sandbox(),
		}),
	],
	devToolbar: { enabled: false },
	vite: {
		optimizeDeps: {
			exclude: [
				"@tiptap/extension-collaboration",
				"@tiptap/y-tiptap",
				"@tiptap/extension-drag-handle",
				"y-protocols",
			],
		},
	},
});
