import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const routeCollections = `["services", "hearing_aid_brands", "blog_post", "utility_pages", "locations", "team", "homepage", "contact_page", "about"]`;
const googleOauthDomain = "bidviewmarketing.com";

function patchOAuthConsumer(source) {
	let next = source;
	next = next.replace(
		"export async function findOrCreateOAuthUser(\n\tadapter: AuthAdapter,\n\tproviderName: string,\n\tprofile: OAuthProfile,\n\tcanSelfSignup?: CanSelfSignup,\n): Promise<User> {\n\t// Check if OAuth account already linked",
		"export async function findOrCreateOAuthUser(\n\tadapter: AuthAdapter,\n\tproviderName: string,\n\tprofile: OAuthProfile,\n\tcanSelfSignup?: CanSelfSignup,\n): Promise<User> {\n\tif (canSelfSignup && !profile.emailVerified) {\n\t\tthrow new OAuthError(\"signup_not_allowed\", \"Cannot authenticate: email not verified by provider\");\n\t}\n\tconst signupPolicy = canSelfSignup ? await canSelfSignup(profile.email) : null;\n\tif (canSelfSignup && !signupPolicy?.allowed) {\n\t\tthrow new OAuthError(\"signup_not_allowed\", \"Self-signup not allowed for this email domain\");\n\t}\n\n\t// Check if OAuth account already linked",
	);
	next = next.replace(
		/(export async function findOrCreateOAuthUser\(\r?\n\tadapter: AuthAdapter,\r?\n\tproviderName: string,\r?\n\tprofile: OAuthProfile,\r?\n\tcanSelfSignup\?: CanSelfSignup,\r?\n\): Promise<User> \{\r?\n)(\tconst signupPolicy = canSelfSignup \? await canSelfSignup\(profile\.email\) : null;)/,
		`$1\tif (canSelfSignup && !profile.emailVerified) {\n\t\tthrow new OAuthError("signup_not_allowed", "Cannot authenticate: email not verified by provider");\n\t}\n$2`,
	);
	next = next.replace(
		"\t\treturn user;\n\t}\n\n\t// Check if user with this email exists",
		"\t\tif (signupPolicy?.role && user.role !== signupPolicy.role) {\n\t\t\tawait adapter.updateUser(user.id, { role: signupPolicy.role });\n\t\t\treturn { ...user, role: signupPolicy.role };\n\t\t}\n\t\treturn user;\n\t}\n\n\t// Check if user with this email exists",
	);
	next = next.replace(
		"\t\tawait adapter.createOAuthAccount({\n\t\t\tprovider: providerName,\n\t\t\tproviderAccountId: profile.id,\n\t\t\tuserId: existingUser.id,\n\t\t});\n\t\treturn existingUser;\n\t}\n\n\t// Check if self-signup is allowed",
		"\t\tif (signupPolicy?.role && existingUser.role !== signupPolicy.role) {\n\t\t\tawait adapter.updateUser(existingUser.id, { role: signupPolicy.role });\n\t\t}\n\t\tawait adapter.createOAuthAccount({\n\t\t\tprovider: providerName,\n\t\t\tproviderAccountId: profile.id,\n\t\t\tuserId: existingUser.id,\n\t\t});\n\t\treturn signupPolicy?.role && existingUser.role !== signupPolicy.role\n\t\t\t? { ...existingUser, role: signupPolicy.role }\n\t\t\t: existingUser;\n\t}\n\n\t// Check if self-signup is allowed",
	);
	next = next.replace(
		/(\t\tif \(signupPolicy\?\.role && user\.role !== signupPolicy\.role\) \{\r?\n\t\t\tawait adapter\.updateUser\(user\.id, \{ role: signupPolicy\.role \}\);\r?\n\t\t\treturn \{ \.\.\.user, role: signupPolicy\.role \};\r?\n\t\t\}\r?\n)\1/g,
		"$1",
	);
	next = next.replace(
		/(\s*if \(signupPolicy\?\.role && user\.role !== signupPolicy\.role\) \{\s*await adapter\.updateUser\(user\.id, \{ role: signupPolicy\.role \}\);\s*return \{ \.\.\.user, role: signupPolicy\.role \};\s*\})\s*if \(signupPolicy\?\.role && user\.role !== signupPolicy\.role\) \{\s*await adapter\.updateUser\(user\.id, \{ role: signupPolicy\.role \}\);\s*return \{ \.\.\.user, role: signupPolicy\.role \};\s*\}/g,
		"$1",
	);
	return next;
}

function patchOAuthConsumerDist(source) {
	let next = source;
	next = next.replace(
		"async function findOrCreateOAuthUser(adapter, providerName, profile, canSelfSignup) {\n\tconst existingAccount = await adapter.getOAuthAccount(providerName, profile.id);",
		"async function findOrCreateOAuthUser(adapter, providerName, profile, canSelfSignup) {\n\tif (canSelfSignup && !profile.emailVerified) {\n\t\tthrow new OAuthError(\"signup_not_allowed\", \"Cannot authenticate: email not verified by provider\");\n\t}\n\tconst signupPolicy = canSelfSignup ? await canSelfSignup(profile.email) : null;\n\tif (canSelfSignup && !signupPolicy?.allowed) {\n\t\tthrow new OAuthError(\"signup_not_allowed\", \"Self-signup not allowed for this email domain\");\n\t}\n\tconst existingAccount = await adapter.getOAuthAccount(providerName, profile.id);",
	);
	next = next.replace(
		/(async function findOrCreateOAuthUser\(adapter, providerName, profile, canSelfSignup\) \{\r?\n)(\tconst signupPolicy = canSelfSignup \? await canSelfSignup\(profile\.email\) : null;)/,
		`$1\tif (canSelfSignup && !profile.emailVerified) {\n\t\tthrow new OAuthError("signup_not_allowed", "Cannot authenticate: email not verified by provider");\n\t}\n$2`,
	);
	next = next.replace(
		"\t\treturn user;\n\t}\n\tconst existingUser = await adapter.getUserByEmail(profile.email);",
		"\t\tif (signupPolicy?.role && user.role !== signupPolicy.role) {\n\t\t\tawait adapter.updateUser(user.id, { role: signupPolicy.role });\n\t\t\treturn { ...user, role: signupPolicy.role };\n\t\t}\n\t\treturn user;\n\t}\n\tconst existingUser = await adapter.getUserByEmail(profile.email);",
	);
	next = next.replace(
		"\t\tawait adapter.createOAuthAccount({\n\t\t\tprovider: providerName,\n\t\t\tproviderAccountId: profile.id,\n\t\t\tuserId: existingUser.id\n\t\t});\n\t\treturn existingUser;\n\t}\n\tif (canSelfSignup) {",
		"\t\tif (signupPolicy?.role && existingUser.role !== signupPolicy.role) {\n\t\t\tawait adapter.updateUser(existingUser.id, { role: signupPolicy.role });\n\t\t}\n\t\tawait adapter.createOAuthAccount({\n\t\t\tprovider: providerName,\n\t\t\tproviderAccountId: profile.id,\n\t\t\tuserId: existingUser.id\n\t\t});\n\t\treturn signupPolicy?.role && existingUser.role !== signupPolicy.role ? { ...existingUser, role: signupPolicy.role } : existingUser;\n\t}\n\tif (canSelfSignup) {",
	);
	next = next.replace(
		/(\t\tif \(signupPolicy\?\.role && user\.role !== signupPolicy\.role\) \{\r?\n\t\t\tawait adapter\.updateUser\(user\.id, \{ role: signupPolicy\.role \}\);\r?\n\t\t\treturn \{ \.\.\.user, role: signupPolicy\.role \};\r?\n\t\t\}\r?\n)\1/g,
		"$1",
	);
	next = next.replace(
		/(\s*if \(signupPolicy\?\.role && user\.role !== signupPolicy\.role\) \{\s*await adapter\.updateUser\(user\.id, \{ role: signupPolicy\.role \}\);\s*return \{ \.\.\.user, role: signupPolicy\.role \};\s*\})\s*if \(signupPolicy\?\.role && user\.role !== signupPolicy\.role\) \{\s*await adapter\.updateUser\(user\.id, \{ role: signupPolicy\.role \}\);\s*return \{ \.\.\.user, role: signupPolicy\.role \};\s*\}/g,
		"$1",
	);
	return next;
}

function patchAdminContentUrl(source) {
	let next = source.replace(
		/function contentUrl\(collection, slug, urlPattern\) \{\r?\n(\s*)const safe = slug\.replace\(LEADING_SLASHES, ""\);\r?\n(\s*)return urlPattern \? urlPattern\.replace\("\{slug\}", safe\) : `\/\$\{collection\}\/\$\{safe\}`;\r?\n\}/,
		`function contentUrl(collection, slug, urlPattern) {\n$1const safe = slug.replace(LEADING_SLASHES, "");\n$1if (collection === "homepage") {\n$1\treturn "/";\n$1}\n$1if (${routeCollections}.includes(collection) && safe) {\n$1\treturn \`/\${safe}\`;\n$1}\n$2return urlPattern ? urlPattern.replace("{slug}", safe) : \`/\${collection}/\${safe}\`;\n}`,
	);
	if (next.includes("function contentUrl") && !next.includes('collection === "homepage"')) {
		next = next.replace(
			/(const safe = slug\.replace\(LEADING_SLASHES, ""\);\r?\n)(\s*)if \(\[[^\]]*"utility_pages"[^\]]*\]\.includes\(collection\) && safe\) \{/,
			`$1$2if (collection === "homepage") {\n$2\treturn "/";\n$2}\n$2if (${routeCollections}.includes(collection) && safe) {`,
		);
	}
	return next;
}

const patches = [
	{
		file: "node_modules/emdash/src/astro/routes/api/auth/oauth/[provider].ts",
		guard: 'cloudflare:workers',
		force: true,
		apply(source) {
			let next = source.includes('cloudflare:workers')
				? source
				: source.replace(
						'import type { APIRoute } from "astro";',
						'import type { APIRoute } from "astro";\nimport { env as cloudflareEnv } from "cloudflare:workers";',
					);
			next = next.replace(
				'const env = runtimeLocals.runtime?.env ?? (import.meta.env as Record<string, unknown>);',
				'const env = (cloudflareEnv as Record<string, unknown>) ?? runtimeLocals.runtime?.env ?? (import.meta.env as Record<string, unknown>);',
			);
			return next;
		},
	},
	{
		file: "node_modules/emdash/src/astro/routes/api/auth/oauth/[provider]/callback.ts",
		guard: 'cloudflare:workers',
		force: true,
		apply(source) {
			let next = source.includes('cloudflare:workers')
				? source
				: source.replace(
						'import type { APIRoute } from "astro";',
						'import type { APIRoute } from "astro";\nimport { env as cloudflareEnv } from "cloudflare:workers";',
					);
			next = next.replace(
				'const env = runtimeLocals.runtime?.env ?? (import.meta.env as Record<string, unknown>);',
				'const env = (cloudflareEnv as Record<string, unknown>) ?? runtimeLocals.runtime?.env ?? (import.meta.env as Record<string, unknown>);',
			);
			next = next.replace(
				/\/\/ During setup: first user becomes admin\.[\s\S]*?return \{ allowed: true, role \};\r?\n\t\t\t\},/,
				`const domain = email.split("@")[1]?.toLowerCase();\n\t\t\t\tif (domain !== "${googleOauthDomain}") {\n\t\t\t\t\treturn null;\n\t\t\t\t}\n\n\t\t\t\treturn { allowed: true, role: Role.ADMIN };\n\t\t\t},`,
			);
			return next;
		},
	},
	{
		file: "node_modules/emdash/dist/astro/routes/api/auth/oauth/_provider_.mjs",
		guard: 'cloudflare:workers',
		force: true,
		apply(source) {
			let next = source.includes('cloudflare:workers')
				? source
				: source.replace(
						'import { createAuthorizationUrl } from "@emdash-cms/auth";',
						'import { createAuthorizationUrl } from "@emdash-cms/auth";\nimport { env as cloudflareEnv } from "cloudflare:workers";',
					);
			next = next.replace(
				"const env = runtimeLocals.runtime?.env ?? import.meta.env;",
				"const env = cloudflareEnv ?? runtimeLocals.runtime?.env ?? import.meta.env;",
			);
			next = next.replace(
				"const providers = getOAuthConfig(locals.runtime?.env ?? import.meta.env);",
				"const providers = getOAuthConfig(cloudflareEnv ?? import.meta.env);",
			);
			return next;
		},
	},
	{
		file: "node_modules/emdash/dist/astro/routes/api/auth/oauth/_provider_/callback.mjs",
		guard: 'cloudflare:workers',
		force: true,
		apply(source) {
			let next = source.includes('cloudflare:workers')
				? source
				: source.replace(
						'import { OAuthError, Role, handleOAuthCallback } from "@emdash-cms/auth";',
						'import { OAuthError, Role, handleOAuthCallback } from "@emdash-cms/auth";\nimport { env as cloudflareEnv } from "cloudflare:workers";',
					);
			next = next.replace(
				"const env = runtimeLocals.runtime?.env ?? import.meta.env;",
				"const env = cloudflareEnv ?? runtimeLocals.runtime?.env ?? import.meta.env;",
			);
			next = next.replace(
				"const providers = getOAuthConfig(locals.runtime?.env ?? import.meta.env);",
				"const providers = getOAuthConfig(cloudflareEnv ?? import.meta.env);",
			);
			next = next.replace(
				/\/\/ During setup: first user becomes admin\.[\s\S]*?return \{ allowed: true, role \};\r?\n\t\t\t\}/,
				`const domain = email.split("@")[1]?.toLowerCase();\n\t\t\t\tif (domain !== "${googleOauthDomain}") {\n\t\t\t\t\treturn null;\n\t\t\t\t}\n\n\t\t\t\treturn { allowed: true, role: Role.ADMIN };\n\t\t\t}`,
			);
			next = next.replace(
				`const setupComplete = await new OptionsRepository(emdash.db).get("emdash:setup_complete");
				if (setupComplete !== true && setupComplete !== "true") return {
					allowed: true,
					role: Role.ADMIN
				};
				const domain = email.split("@")[1]?.toLowerCase();
				if (!domain) return null;
				const entry = await emdash.db.selectFrom("allowed_domains").selectAll().where("domain", "=", domain).where("enabled", "=", 1).executeTakeFirst();
				if (!entry) return null;
				const roleLevel = entry.default_role;
				const roleMap = {
					50: Role.ADMIN,
					40: Role.EDITOR,
					30: Role.AUTHOR,
					20: Role.CONTRIBUTOR,
					10: Role.SUBSCRIBER
				};
				const role = roleMap[roleLevel] ?? Role.CONTRIBUTOR;
				if (!roleMap[roleLevel]) console.warn(\`[oauth] Unknown role level \${roleLevel} for domain \${domain}, defaulting to CONTRIBUTOR\`);
				return {
					allowed: true,
					role
				};`,
				`const domain = email.split("@")[1]?.toLowerCase();
				if (domain !== "${googleOauthDomain}") return null;
				return {
					allowed: true,
					role: Role.ADMIN
				};`,
			);
			return next;
		},
	},
	{
		file: "node_modules/@emdash-cms/auth/src/oauth/consumer.ts",
		guard: "const signupPolicy = canSelfSignup ? await canSelfSignup(profile.email) : null;",
		force: true,
		apply: patchOAuthConsumer,
	},
	{
		file: "node_modules/@emdash-cms/auth/dist/index.mjs",
		guard: "const signupPolicy = canSelfSignup ? await canSelfSignup(profile.email) : null;",
		force: true,
		apply: patchOAuthConsumerDist,
	},
	{
		file: "node_modules/emdash/src/astro/routes/api/content/[collection]/[id]/preview-url.ts",
		apply(source) {
			let next = source;
			next = next.replace(
				"let entryLocale: string | null = null;\n\tif (emdash?.handleContentGet) {",
				"let entryLocale: string | null = null;\n\tlet entrySlug: string | null = null;\n\tif (emdash?.handleContentGet) {",
			);
			next = next.replace(
				"\t\tentryLocale = result.data?.item?.locale ?? null;\n\t}",
				"\t\tentryLocale = result.data?.item?.locale ?? null;\n\t\tentrySlug = result.data?.item?.slug ?? null;\n\t}",
			);
			next = next.replace(
				'const pathPattern = body.pathPattern || defaultPathPattern;',
				`const routeMappedCollections = new Set(${routeCollections});\n\tconst routeSlug = collection === "homepage"\n\t\t? ""\n\t\t: routeMappedCollections.has(collection)\n\t\t\t? entrySlug?.replace(/^\\\\/+|\\\\/+$/g, "")\n\t\t\t: null;\n\tconst pathPattern = body.pathPattern || (collection === "homepage" ? "/" : routeSlug ? "/{id}" : defaultPathPattern);\n\tconst previewId = collection === "homepage" ? "" : routeSlug || id;`,
			);
			next = next.replace(
				"\t\t\tid,\n\t\t\tsecret: previewSecret,",
				"\t\t\tid: previewId,\n\t\t\tsecret: previewSecret,",
			);
			return next;
		},
	},
	{
		file: "node_modules/emdash/dist/astro/routes/api/content/_collection_/_id_/preview-url.mjs",
		apply(source) {
			let next = source;
			next = next.replace(
				"let entryLocale = null;\n\tif (emdash?.handleContentGet) {",
				"let entryLocale = null;\n\tlet entrySlug = null;\n\tif (emdash?.handleContentGet) {",
			);
			next = next.replace(
				"\t\tentryLocale = result.data?.item?.locale ?? null;\n\t}",
				"\t\tentryLocale = result.data?.item?.locale ?? null;\n\t\tentrySlug = result.data?.item?.slug ?? null;\n\t}",
			);
			next = next.replace(
				"const pathPattern = body.pathPattern || defaultPathPattern;",
				`const routeMappedCollections = new Set(${routeCollections});\n\tconst routeSlug = collection === "homepage" ? "" : routeMappedCollections.has(collection) ? entrySlug?.replace(/^\\\\/+|\\\\/+$/g, "") : null;\n\tconst pathPattern = body.pathPattern || (collection === "homepage" ? "/" : routeSlug ? "/{id}" : defaultPathPattern);\n\tconst previewId = collection === "homepage" ? "" : routeSlug || id;`,
			);
			next = next.replace(
				"\t\t\t\tid,\n\t\t\t\tsecret: previewSecret,",
				"\t\t\t\tid: previewId,\n\t\t\t\tsecret: previewSecret,",
			);
			return next;
		},
	},
	{
		file: "node_modules/@emdash-cms/admin/dist/index.js",
		guard: "return `/${safe}`;",
		apply: patchAdminContentUrl,
	},
];

const viteDepsDir = "node_modules/.vite/deps";
if (existsSync(viteDepsDir)) {
	for (const file of readdirSync(viteDepsDir)) {
		if (!/^chunk-.*\.js$/.test(file)) continue;
		patches.push({
			file: `${viteDepsDir}/${file}`,
			guard: "return `/${safe}`;",
			apply: patchAdminContentUrl,
		});
	}
}

for (const patch of patches) {
	const filePath = resolve(patch.file);
	if (!existsSync(filePath)) continue;

	const source = readFileSync(filePath, "utf8");
	let upgradedSource = source
		.replaceAll(`["services", "hearing_aid_brands", "blog_post"]`, routeCollections)
		.replaceAll(
			`["services", "hearing_aid_brands", "blog_post", "utility_pages"]`,
			routeCollections,
		)
		.replaceAll(
			`["services", "hearing_aid_brands", "blog_post", "utility_pages", "homepage"]`,
			routeCollections,
		)
		.replaceAll(
			`["services", "hearing_aid_brands", "blog_post", "utility_pages", "locations", "team", "homepage"]`,
			routeCollections,
		)
		.replaceAll(
			`["services", "hearing_aid_brands", "blog_post", "utility_pages", "locations", "team", "homepage", "contact_page"]`,
			routeCollections,
		);
	upgradedSource = patchAdminContentUrl(upgradedSource);
	if (upgradedSource !== source) {
		writeFileSync(filePath, upgradedSource);
		console.log(`[patch-emdash] upgraded route collections in ${patch.file}`);
		continue;
	}
	const normalizedPatchFile = patch.file.replaceAll("\\", "/");
	if (!patch.force && source.includes(patch.guard || "routeMappedCollections")) continue;
	if (normalizedPatchFile.includes("node_modules/.vite/deps/chunk-") && !source.includes("function contentUrl")) {
		continue;
	}
	if (
		normalizedPatchFile.includes("node_modules/.vite/deps/chunk-") &&
		!source.includes("`/${collection}/${safe}`")
	) {
		continue;
	}

	const next = patch.apply(source);
	if (next === source) {
		if (patch.force) continue;
		if (normalizedPatchFile.includes("node_modules/.vite/deps/chunk-")) continue;
		throw new Error(`Failed to patch ${patch.file}`);
	}

	writeFileSync(filePath, next);
	console.log(`[patch-emdash] patched ${patch.file}`);
}
