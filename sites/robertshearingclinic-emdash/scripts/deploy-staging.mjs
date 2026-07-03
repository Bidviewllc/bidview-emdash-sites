import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const generatedConfigPath = "dist/server/wrangler.json";

const config = JSON.parse(await readFile(generatedConfigPath, "utf8"));

// Retargeted to Cameron's Cloudflare account (production launch). The worker keeps
// the *-staging name (Ontario/batch convention) but its bindings are the real ones.
config.name = "robertshearingclinic-emdash-staging";
config.account_id = "239e9d015c7a3a39cdc2e9400312f553";
config.kv_namespaces = [
	{
		binding: "SESSION",
		id: "028dfa4da881449cb1fcfb8ae46b6e2e",
	},
];
config.r2_buckets = [
	{
		binding: "MEDIA",
		bucket_name: "robertshearingclinic-emdash-staging-media",
	},
];
config.d1_databases = [
	{
		binding: "DB",
		database_name: "robertshearingclinic-emdash-staging-db",
		database_id: "c73ecc6d-2889-4cae-b26b-c816c6be67b2",
	},
];
// Contact + insurance forms email leads via Cloudflare Email Workers.
config.send_email = [{ name: "SEND_EMAIL", destination_address: "leads@proheargroup.com" }];

await writeFile(generatedConfigPath, `${JSON.stringify(config, null, 2)}\n`);

const wrangler = path.resolve("node_modules", "wrangler", "bin", "wrangler.js");
const result = spawnSync(process.execPath, [wrangler, "deploy", "--config", generatedConfigPath], {
	stdio: "inherit",
	shell: false,
});

if (result.error) {
	console.error(result.error);
}

process.exit(result.status ?? 1);
