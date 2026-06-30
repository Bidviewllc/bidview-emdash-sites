import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const dryRun = process.argv.includes("--dry-run");
const generatedConfigPath = resolve(root, "dist/server/wrangler.json");
const stagingConfigPath = resolve(root, "dist/server/wrangler.staging.json");

const staging = {
  name: "maicoaudio-staging",
  accountId: "981338e6544cfe45d9819bf0ea6eb83a",
  d1DatabaseName: "maicoaudio-staging-db",
  d1DatabaseId: "18d342a8-7648-40ca-90e8-6d2514f088f4",
  r2BucketName: "maicoaudio-staging-media",
  sessionKvId: "5658f284c7004a11a73812c7b3f9a838",
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
  "--secrets-file",
  ".dev.vars",
  "--keep-vars",
];

if (dryRun) {
  deployArgs.push("--dry-run");
}

run(`npx ${deployArgs.join(" ")}`);
