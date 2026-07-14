import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const configPath = resolve(ROOT, "dist/server/wrangler.json");

const config = JSON.parse(readFileSync(configPath, "utf8"));

config.name = "cary-audiology-staging";
config.d1_databases = [
	{
		binding: "DB",
		database_name: "cary-audiology-staging-db",
		database_id: "d5e16e80-19f5-4e94-a35b-6adf4fbd5aaa",
	},
];
config.r2_buckets = [
	{
		binding: "MEDIA",
		bucket_name: "cary-audiology-staging-media",
	},
];

writeFileSync(configPath, JSON.stringify(config), "utf8");
console.log("Patched wrangler.json for staging (cary-audiology-staging)");

execSync("npx wrangler deploy --config dist/server/wrangler.json", { cwd: ROOT, stdio: "inherit" });
