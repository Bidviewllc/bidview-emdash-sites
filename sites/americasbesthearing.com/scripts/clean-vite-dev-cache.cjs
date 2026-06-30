const fs = require("fs");
const path = require("path");

const cacheDirs = [
	path.join(process.cwd(), ".vite-dev"),
	path.join(process.cwd(), ".vite-build"),
	path.join(process.cwd(), "node_modules", ".vite-dev"),
	path.join(process.cwd(), "node_modules", ".vite-build"),
];

try {
	for (const cacheDir of cacheDirs) {
		if (fs.existsSync(cacheDir)) {
			fs.rmSync(cacheDir, { recursive: true, force: true });
			console.log("Cleared Vite cache:", cacheDir);
		} else {
			console.log("Vite cache not present:", cacheDir);
		}
	}
} catch (error) {
	console.warn("Unable to clear Vite cache:", error?.message || error);
}
