/**
 * Deploy to the staging Worker.
 *
 * The Astro Cloudflare adapter writes `dist/server/wrangler.json` during the
 * build from the TOP-LEVEL wrangler.jsonc — `wrangler deploy --env staging`
 * does not compose with the adapter. So we patch that generated file with the
 * staging name + bindings, then deploy.
 *
 * Usage: npm run deploy:staging
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(ROOT, "dist/server/wrangler.json");

const config = JSON.parse(readFileSync(configPath, "utf8"));

config.name = "commonwealth-audiology-staging";
config.d1_databases = [
	{
		binding: "DB",
		database_name: "commonwealth-audiology-staging-db",
		database_id: "fde1d6dc-e694-4a68-a50c-55bc5dc5a3c5",
	},
];
config.r2_buckets = [
	{
		binding: "MEDIA",
		bucket_name: "commonwealth-audiology-staging-media",
	},
];

writeFileSync(configPath, JSON.stringify(config), "utf8");
console.log("Patched dist/server/wrangler.json for staging");

execSync("npx wrangler deploy", { cwd: ROOT, stdio: "inherit" });
