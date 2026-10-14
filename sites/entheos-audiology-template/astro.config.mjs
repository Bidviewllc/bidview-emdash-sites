import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

// Server-rendered so the Review controls settings in the query string
// (palette, header style, section switches) shape the page on each request.
export default defineConfig({
	output: "server",
	adapter: cloudflare({ imageService: "passthrough" }),
	trailingSlash: "ignore",
	// No sessions needed (and no KV namespace to provision).
	session: false,
});
