import { spawnSync } from "node:child_process";

const gen = spawnSync("node", ["scripts/gen-sitemap.mjs"], { stdio: "inherit" });
if (gen.status !== 0) process.exit(gen.status ?? 1);

const result = spawnSync("npx", ["astro", "build"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    CF_DEPLOY: "1"
  }
});

process.exit(result.status ?? 1);
