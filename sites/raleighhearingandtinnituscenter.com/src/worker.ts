import * as ajvEqual from "ajv/dist/runtime/equal.js";
import * as ajvUcs2Length from "ajv/dist/runtime/ucs2length.js";
import * as ajvUri from "ajv/dist/runtime/uri.js";
import * as ajvValidationError from "ajv/dist/runtime/validation_error.js";
import * as ajvFormats from "ajv-formats/dist/formats.js";
import handler from "@astrojs/cloudflare/entrypoints/server";
import * as semver from "semver";
import * as semverInternalConstants from "semver/internal/constants.js";
import * as semverInternalDebug from "semver/internal/debug.js";
import * as semverInternalRe from "semver/internal/re.js";

export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

if (typeof (globalThis as any).require === "undefined") {
	const requireMap: Record<string, unknown> = {
		"ajv/dist/runtime/equal": ajvEqual,
		"ajv/dist/runtime/equal.js": ajvEqual,
		"ajv/dist/runtime/ucs2length": ajvUcs2Length,
		"ajv/dist/runtime/ucs2length.js": ajvUcs2Length,
		"ajv/dist/runtime/uri": ajvUri,
		"ajv/dist/runtime/uri.js": ajvUri,
		"ajv/dist/runtime/validation_error": ajvValidationError,
		"ajv/dist/runtime/validation_error.js": ajvValidationError,
		"ajv-formats/dist/formats": ajvFormats,
		"ajv-formats/dist/formats.js": ajvFormats,
		"semver": semver,
		"./constants": semverInternalConstants,
		"./debug": semverInternalDebug,
		"./internal/constants": semverInternalConstants,
		"./internal/debug": semverInternalDebug,
		"./internal/re": semverInternalRe,
		"semver/internal/constants": semverInternalConstants,
		"semver/internal/constants.js": semverInternalConstants,
		"semver/internal/debug": semverInternalDebug,
		"semver/internal/debug.js": semverInternalDebug,
		"semver/internal/re": semverInternalRe,
		"semver/internal/re.js": semverInternalRe,
	};

	(globalThis as any).require = (specifier: string) => {
		const module = requireMap[specifier];
		if (module) return module;
		throw new Error(`Unsupported runtime require: ${specifier}`);
	};
}

export default handler;
