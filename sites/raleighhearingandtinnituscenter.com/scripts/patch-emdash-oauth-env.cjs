#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = [
	{
		path: "node_modules/emdash/src/astro/routes/api/auth/oauth/[provider].ts",
		importNeedle: 'import type { APIRoute } from "astro";',
		importReplacement: 'import type { APIRoute } from "astro";\nimport { env as cloudflareEnv } from "cloudflare:workers";',
		envPattern: /\/\/ eslint-disable-next-line typescript\/no-unsafe-type-assertion -- locals\.runtime is injected by the Cloudflare adapter at runtime; not declared on App\.Locals since the adapter is optional\s+const runtimeLocals = locals as unknown as \{ runtime\?: \{ env\?: Record<string, unknown> \} \};\s+\/\/ eslint-disable-next-line typescript\/no-unsafe-type-assertion -- import\.meta\.env is typed as ImportMetaEnv but we need Record<string, unknown> for getOAuthConfig\s+const env = runtimeLocals\.runtime\?\.env \?\? \(import\.meta\.env as Record<string, unknown>\);/g,
		envReplacement: 'const env = (cloudflareEnv as Record<string, unknown>) ?? (import.meta.env as Record<string, unknown>);',
	},
	{
		path: "node_modules/emdash/src/astro/routes/api/auth/oauth/[provider]/callback.ts",
		importNeedle: 'import type { APIRoute } from "astro";',
		importReplacement: 'import type { APIRoute } from "astro";\nimport { env as cloudflareEnv } from "cloudflare:workers";',
		envPattern: /\/\/ eslint-disable-next-line typescript\/no-unsafe-type-assertion -- locals\.runtime is injected by the Cloudflare adapter at runtime; not declared on App\.Locals since the adapter is optional\s+const runtimeLocals = locals as unknown as \{ runtime\?: \{ env\?: Record<string, unknown> \} \};\s+\/\/ eslint-disable-next-line typescript\/no-unsafe-type-assertion -- import\.meta\.env is typed as ImportMetaEnv but we need Record<string, unknown> for getOAuthConfig\s+const env = runtimeLocals\.runtime\?\.env \?\? \(import\.meta\.env as Record<string, unknown>\);/g,
		envReplacement: 'const env = (cloudflareEnv as Record<string, unknown>) ?? (import.meta.env as Record<string, unknown>);',
	},
	{
		path: "node_modules/emdash/dist/astro/routes/api/auth/oauth/_provider_.mjs",
		importNeedle: 'import { createAuthorizationUrl } from "@emdash-cms/auth";',
		importReplacement: 'import { createAuthorizationUrl } from "@emdash-cms/auth";\nimport { env as cloudflareEnv } from "cloudflare:workers";',
		envPattern: /getOAuthConfig\(locals\.runtime\?\.env \?\? import\.meta\.env\)/g,
		envReplacement: "getOAuthConfig(cloudflareEnv ?? import.meta.env)",
	},
	{
		path: "node_modules/emdash/dist/astro/routes/api/auth/oauth/_provider_/callback.mjs",
		importNeedle: 'import { OAuthError, Role, handleOAuthCallback } from "@emdash-cms/auth";',
		importReplacement: 'import { OAuthError, Role, handleOAuthCallback } from "@emdash-cms/auth";\nimport { env as cloudflareEnv } from "cloudflare:workers";',
		envPattern: /getOAuthConfig\(locals\.runtime\?\.env \?\? import\.meta\.env\)/g,
		envReplacement: "getOAuthConfig(cloudflareEnv ?? import.meta.env)",
	},
];

for (const file of files) {
	const relative = file.path;
	const filePath = path.join(root, relative);
	if (!fs.existsSync(filePath)) {
		console.warn(`EmDash OAuth route not found, skipping: ${relative}`);
		continue;
	}

	let source = fs.readFileSync(filePath, "utf8");
	let next = source;

	if (!next.includes('from "cloudflare:workers"')) {
		next = next.replace(file.importNeedle, file.importReplacement);
	}

	next = next.replace(file.envPattern, file.envReplacement);

	if (next !== source) {
		fs.writeFileSync(filePath, next);
		console.log(`Patched EmDash OAuth env access: ${relative}`);
	} else {
		console.log(`EmDash OAuth env access already patched: ${relative}`);
	}
}
