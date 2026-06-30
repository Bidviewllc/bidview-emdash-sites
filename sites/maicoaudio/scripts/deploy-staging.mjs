import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const dryRun = process.argv.includes("--dry-run");
const generatedConfigPath = resolve(root, "dist/server/wrangler.json");
const stagingConfigPath = resolve(root, "dist/server/wrangler.staging.json");

const staging = {
  name: "maicoaudio-staging",
  accountId: "239e9d015c7a3a39cdc2e9400312f553",
  d1DatabaseName: "maicoaudio-staging-db",
  d1DatabaseId: "669a7ae5-eab7-4ad3-ba45-1e4d8aef5d7e",
  r2BucketName: "maicoaudio-staging-media",
  sessionKvId: "028dfa4da881449cb1fcfb8ae46b6e2e",
};

function run(command) {
  execSync(command, {
    cwd: root,
    stdio: "inherit",
  });
}

run("npm run build");

const generatedConfig = JSON.parse(readFileSync(generatedConfigPath, "utf8"));

const stagingConfig = {
  ...generatedConfig,
  name: staging.name,
  topLevelName: staging.name,
  account_id: staging.accountId,
  workers_dev: true,
  kv_namespaces: [
    {
      binding: "SESSION",
      id: staging.sessionKvId,
    },
  ],
  d1_databases: [
    {
      binding: "DB",
      database_name: staging.d1DatabaseName,
      database_id: staging.d1DatabaseId,
    },
  ],
  r2_buckets: [
    {
      binding: "MEDIA",
      bucket_name: staging.r2BucketName,
    },
  ],
  worker_loaders: [
    {
      binding: "LOADER",
    },
  ],
};

delete stagingConfig.env;

writeFileSync(stagingConfigPath, `${JSON.stringify(stagingConfig, null, 2)}\n`);

const deployArgs = [
  "wrangler",
  "deploy",
  "--config",
  "dist/server/wrangler.staging.json",
  "--keep-vars",
];

// Only pass secrets file when it actually exists and is non-empty (e.g. local OAuth dev creds).
if (existsSync(resolve(root, ".dev.vars")) && readFileSync(resolve(root, ".dev.vars"), "utf8").trim()) {
  deployArgs.push("--secrets-file", ".dev.vars");
}

if (dryRun) {
  deployArgs.push("--dry-run");
}

run(`npx ${deployArgs.join(" ")}`);
