/**
 * "Marketing & tracking" plugin (template-local, trusted). Admin role only
 * (Bidview and Entheos): the routes need settings:manage, which only Admins
 * have. Editors still see the sidebar link (EmDash can't hide a plugin page by
 * role) but the page tells them it's for Admins and can't load or save.
 *
 *   GET  /_emdash/api/plugins/marketing/get    every item; secrets as "saved" only
 *   POST /_emdash/api/plugins/marketing/save   { items: [{ key, on, value? }] }
 *
 * Settings live in the D1 table marketing_settings (src/lib/marketing.ts).
 */
import { definePlugin } from "emdash";
import type { PluginDefinition } from "emdash";
import { MARKETING_ITEMS } from "../../data/marketing-items";
import { getMarketing, saveMarketing } from "../../lib/marketing";

const definition: PluginDefinition = {
	id: "marketing",
	version: "0.1.0",
	// entry marks the admin screen as a React page; astro.config.mjs (adminEntry) loads ./admin.tsx.
	admin: { entry: "./admin.tsx", pages: [{ path: "/", label: "Marketing & tracking", icon: "chart" }] },
	routes: {
		get: {
			permission: "settings:manage",
			handler: async () => {
				const m = await getMarketing();
				return {
					items: MARKETING_ITEMS.map((i) => ({
						key: i.key,
						on: m[i.key].on,
						value: i.kind === "secret" ? "" : m[i.key].value,
						saved: i.kind === "secret" ? !!m[i.key].value : undefined,
					})),
				};
			},
		},
		save: {
			permission: "settings:manage",
			handler: async (ctx) => {
				const body = ((ctx.input as Record<string, unknown> | undefined) ?? (await ctx.request.json().catch(() => ({})))) as {
					items?: { key: string; on: boolean; value?: string }[];
				};
				if (!Array.isArray(body.items)) throw new Error("Nothing to save");
				await saveMarketing(body.items);
				return { saved: body.items.length };
			},
		},
	},
};

export function createPlugin() {
	return definePlugin(definition);
}

export default createPlugin;
