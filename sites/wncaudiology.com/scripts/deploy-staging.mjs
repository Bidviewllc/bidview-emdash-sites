import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const configPath = resolve(ROOT, "dist/server/wrangler.json");

const config = JSON.parse(readFileSync(configPath, "utf8"));

config.name = "wnc-audiology-staging";
config.d1_databases = [
	{
		binding: "DB",
		database_name: "wnc-audiology-staging-db",
		database_id: "09862375-89ba-4028-9f0c-555cb0b8d6e8",
	},
];
config.r2_buckets = [
	{
		binding: "MEDIA",
		bucket_name: "wnc-audiology-staging-media",
	},
];

writeFileSync(configPath, JSON.stringify(config), "utf8");
console.log("Patched wrangler.json for staging");

execSync("npx wrangler deploy", { cwd: ROOT, stdio: "inherit" });
