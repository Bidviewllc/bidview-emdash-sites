import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import webhookNotifier from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";
import { google } from "emdash/auth/providers/google";

const isBuild = process.argv.includes("build");

const emdashClientOptimizeDeps = {
	exclude: ["virtual:emdash"],
	noDiscovery: true,
};

const emdashSsrRuntimeOptimizeDeps = {
	include: [
		"astro/zod",
		"emdash/runtime",
		"emdash/middleware",
		"emdash/middleware/redirect",
		"emdash/middleware/setup",
		"emdash/middleware/auth",
		"emdash/middleware/request-context",
		"emdash/media/local-runtime",
		"@emdash-cms/cloudflare/db/d1",
		"@emdash-cms/cloudflare/storage/r2",
		"@emdash-cms/plugin-forms",
		"@emdash-cms/plugin-webhook-notifier",
		"ajv/dist/runtime/equal",
		"ajv/dist/runtime/ucs2length",
		"ajv/dist/runtime/uri",
		"ajv/dist/runtime/validation_error",
		"ajv-formats/dist/formats",
		"semver",
		"semver/internal/constants",
		"semver/internal/debug",
		"semver/internal/re",
	],
	exclude: ["virtual:emdash"],
	noDiscovery: true,
	esbuildOptions: {
		external: ["cloudflare:workers", "cloudflare:*", "virtual:*", "astro:*"],
	},
};

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	vite: {
		cacheDir: isBuild ? "node_modules/.vite-build" : "node_modules/.vite-dev",
		resolve: {
			alias: {
				"use-sync-external-store": "use-sync-external-store/shim/index.js",
			},
		},
		optimizeDeps: emdashClientOptimizeDeps,
		ssr: {
			optimizeDeps: emdashSsrRuntimeOptimizeDeps,
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
			plugins: [formsPlugin()],
			sandboxed: [webhookNotifier],
			sandboxRunner: sandbox(),
			marketplace: "https://marketplace.emdashcms.com",
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-sans",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
