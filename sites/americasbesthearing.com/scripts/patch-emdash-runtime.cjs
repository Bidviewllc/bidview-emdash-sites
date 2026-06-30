const fs = require("node:fs");
const path = require("node:path");

const runtimePath = path.join(process.cwd(), "node_modules", "emdash", "src", "emdash-runtime.ts");
const oauthStartPath = path.join(
  process.cwd(),
  "node_modules",
  "emdash",
  "src",
  "astro",
  "routes",
  "api",
  "auth",
  "oauth",
  "[provider].ts",
);
const oauthCallbackPath = path.join(
  process.cwd(),
  "node_modules",
  "emdash",
  "src",
  "astro",
  "routes",
  "api",
  "auth",
  "oauth",
  "[provider]",
  "callback.ts",
);

if (!fs.existsSync(runtimePath)) {
  console.warn(`[patch-emdash-runtime] Missing ${runtimePath}; skipping.`);
  process.exit(0);
}

let source = fs.readFileSync(runtimePath, "utf8");
let changed = false;

if (!source.includes('import { validateContentData } from "./api/handlers/validation.js";')) {
  source = source.replace(
    'import { validateRev } from "./api/rev.js";\n',
    'import { validateRev } from "./api/rev.js";\nimport { validateContentData } from "./api/handlers/validation.js";\n',
  );
  changed = true;
}

const dynamicImport = '\t\tconst { validateContentData } = await import("./api/handlers/validation.js");\n';
if (source.includes(dynamicImport)) {
  source = source.split(dynamicImport).join("");
  changed = true;
}

if (changed) {
  fs.writeFileSync(runtimePath, source);
  console.log("[patch-emdash-runtime] Patched EmDash validation import for stable local saves.");
} else {
  console.log("[patch-emdash-runtime] EmDash validation import already patched.");
}

function patchOAuthEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[patch-emdash-runtime] Missing ${filePath}; skipping OAuth env patch.`);
    return;
  }

  let file = fs.readFileSync(filePath, "utf8");
  let updated = false;

  if (!file.includes('import { env as cloudflareEnv } from "cloudflare:workers";')) {
    file = file.replace(
      'import type { APIRoute } from "astro";\n',
      'import type { APIRoute } from "astro";\nimport { env as cloudflareEnv } from "cloudflare:workers";\n',
    );
    updated = true;
  }

  const oldBlock = [
    "\t\t// Get OAuth providers from environment",
    "\t\t// Access via locals.runtime for Cloudflare, or import.meta.env for Node",
    "\t\t// eslint-disable-next-line typescript-eslint(no-unsafe-type-assertion) -- locals.runtime is injected by the Cloudflare adapter at runtime; not declared on App.Locals since the adapter is optional",
    "\t\tconst runtimeLocals = locals as unknown as { runtime?: { env?: Record<string, unknown> } };",
    "\t\t// eslint-disable-next-line typescript-eslint(no-unsafe-type-assertion) -- import.meta.env is typed as ImportMetaEnv but we need Record<string, unknown> for getOAuthConfig",
    "\t\tconst env = runtimeLocals.runtime?.env ?? (import.meta.env as Record<string, unknown>);",
  ].join("\n");

  const newBlock = [
    "\t\t// Get OAuth providers from environment",
    "\t\t// eslint-disable-next-line typescript-eslint(no-unsafe-type-assertion) -- import.meta.env is typed as ImportMetaEnv but we need Record<string, unknown> for getOAuthConfig",
    '\t\tconst env = (cloudflareEnv as Record<string, unknown>) ?? (import.meta.env as Record<string, unknown>);',
  ].join("\n");

  if (file.includes(oldBlock)) {
    file = file.replace(oldBlock, newBlock);
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, file);
    console.log(`[patch-emdash-runtime] Patched OAuth env handling in ${path.relative(process.cwd(), filePath)}.`);
  } else {
    console.log(`[patch-emdash-runtime] OAuth env handling already patched in ${path.relative(process.cwd(), filePath)}.`);
  }
}

patchOAuthEnv(oauthStartPath);
patchOAuthEnv(oauthCallbackPath);
