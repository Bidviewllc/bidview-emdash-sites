import { spawnSync } from "node:child_process";

const buildOnly = process.argv.includes("--build-only");
const env = {
  ...process.env,
  EMDASH_TARGET: "cloudflare",
  NODE_OPTIONS: [process.env.NODE_OPTIONS, "--dns-result-order=ipv4first"].filter(Boolean).join(" "),
};

const run = (command, args) => {
  const result = spawnSync(command, args, {
    env,
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run("npx", ["astro", "build"]);
if (!buildOnly) {
  run("npx", ["wrangler", "deploy"]);
}
