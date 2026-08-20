/**
 * Publish one content item from a local/dev emdash instance to a deployed
 * instance (staging or production D1) via the emdash HTTP API.
 *
 * seed.json only initializes a fresh database — nothing in build:cloudflare
 * or deploy:* applies it to an already-seeded D1. Content-only PRs (seed.json
 * edits with no schema change) need this extra step after deploy, or the
 * live site keeps serving whatever was last published through the admin UI
 * or a previous run of this script.
 *
 * Usage:
 *   node scripts/publish-content.mjs <collection> <slug> --to-url <url> --to-token <token> [--from-url <url>]
 *
 * Example (after `npm run dev` locally and applying the seed with
 * `emdash seed ./seed/seed.json -d ./data/emdash.db --on-conflict update`):
 *   node scripts/publish-content.mjs hearing_aids oticon-hearing-aids \
 *     --to-url https://new-leaf-hearing-care.<account>.workers.dev \
 *     --to-token "$EMDASH_ADMIN_TOKEN"
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../node_modules/emdash/dist/cli/index.mjs", import.meta.url));

const args = process.argv.slice(2);
const [collection, slug] = args;
const flags = {};
for (let i = 2; i < args.length; i += 2) {
  flags[args[i].replace(/^--/, "")] = args[i + 1];
}

const fromUrl = flags["from-url"] ?? "http://localhost:4321";
const toUrl = flags["to-url"];
const toToken = flags["to-token"];

if (!collection || !slug || !toUrl || !toToken) {
  console.error(
    "Usage: node scripts/publish-content.mjs <collection> <slug> --to-url <url> --to-token <token> [--from-url <url>]",
  );
  process.exit(1);
}

const emdash = (cliArgs) =>
  JSON.parse(execFileSync(process.execPath, [cliPath, ...cliArgs], { encoding: "utf8" }));

console.log(`Reading "${slug}" from ${fromUrl}...`);
const source = emdash(["content", "get", collection, slug, "-u", fromUrl, "--json"]);

console.log(`Reading current revision of "${slug}" from ${toUrl}...`);
const target = emdash(["content", "get", collection, slug, "-u", toUrl, "-t", toToken, "--json"]);

console.log(`Publishing "${slug}" to ${toUrl} (rev ${target._rev})...`);
execFileSync(
  process.execPath,
  [
    cliPath,
    "content",
    "update",
    collection,
    slug,
    "--data",
    JSON.stringify(source.data),
    "--rev",
    target._rev,
    "-u",
    toUrl,
    "-t",
    toToken,
  ],
  { stdio: "inherit" },
);

console.log("Done.");
