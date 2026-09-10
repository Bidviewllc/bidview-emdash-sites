import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	// The design build serves every page as /path/ (root-absolute, directory style),
	// which `format: "directory"` gives us.
	//
	// Do NOT add `trailingSlash: "always"` here. It applies to EVERY route,
	// including emdash's own, so `/_emdash/admin` and every
	// `/_emdash/api/...` endpoint 404 unless called with a trailing slash —
	// which the admin UI does not do. That silently breaks the entire admin.
	build: { format: "directory" },
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
		}),
	],
	devToolbar: { enabled: false },
});
