import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	site: "https://duethearing.com",
	devToolbar: { enabled: false },
	trailingSlash: "always",
	build: { format: "directory" },
});
