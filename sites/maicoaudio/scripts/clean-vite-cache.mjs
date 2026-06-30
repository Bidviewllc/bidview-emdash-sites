import { rmSync } from "node:fs";
import { resolve } from "node:path";

const viteCaches = [
	resolve(process.cwd(), "node_modules", ".vite"),
	resolve(process.cwd(), "node_modules", ".vite-check"),
	resolve(process.cwd(), "node_modules", ".vite-build"),
];

try {
	for (const viteCache of viteCaches) {
		rmSync(viteCache, { recursive: true, force: true });
		console.log(`[clean:vite] Removed ${viteCache}`);
	}
} catch (error) {
	console.warn("[clean:vite] Could not remove a Vite cache. Stop any running dev server and try again.");
	throw error;
}
