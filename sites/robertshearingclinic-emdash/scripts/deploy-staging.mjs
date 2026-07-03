import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const generatedConfigPath = "dist/server/wrangler.json";

const config = JSON.parse(await readFile(generatedConfigPath, "utf8"));

config.name = "robertshearingclinic-emdash-staging";
config.kv_namespaces = [
	{
		binding: "SESSION",
		id: "727ae84db71b4c29b25f5c1af7858418",
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
		database_id: "ce8f868c-aa4a-423a-a747-86e0448fda08",
		migrations_dir: "../../migrations",
	},
];

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
