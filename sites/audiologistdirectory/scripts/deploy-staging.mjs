/**
 * Deploy to staging by patching the build output's wrangler.json
 * with staging D1/R2 bindings, then running wrangler deploy.
 *
 * Usage: node scripts/deploy-staging.mjs
 * Or:    npm run deploy:staging
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const configPath = resolve(ROOT, "dist/server/wrangler.json");

// Read the built wrangler config
const config = JSON.parse(readFileSync(configPath, "utf8"));

// Override for staging
config.name = "audiologist-directory-staging";
config.d1_databases = [
	{
		binding: "DB",
		database_name: "audiologist-directory-staging-db",
		database_id: "44d17c4f-282b-4544-a79c-02dd93126ee9",
	},
];
config.r2_buckets = [
	{
		binding: "MEDIA",
		bucket_name: "audiologist-directory-staging-media",
	},
];

// Write patched config
writeFileSync(configPath, JSON.stringify(config), "utf8");
console.log("Patched wrangler.json for staging");

// Deploy
execSync("npx wrangler deploy", { cwd: ROOT, stdio: "inherit" });
