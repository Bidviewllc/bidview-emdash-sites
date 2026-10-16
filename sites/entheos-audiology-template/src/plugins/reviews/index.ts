/**
 * Reviews plugin (template-local, trusted).
 *
 * Google reviews live in the site's own D1 tables (reviews, review_meta), the
 * same tables Vince's reviews-sync Worker fills each week (see
 * workers/reviews-sync on main). This plugin adds the admin "Reviews" screen
 * (./admin.tsx) and two routes it calls:
 *
 *   GET  /_emdash/api/plugins/reviews/list   every review, hidden ones too
 *   POST /_emdash/api/plugins/reviews/hide   { id, hidden: true|false }
 *
 * Hiding sets reviews.hidden, which the sync never overwrites, so a hidden
 * review stays hidden after the next sync. Google's rating and review count
 * (review_meta) are not changed by hiding.
 */
import { env } from "cloudflare:workers";
import { definePlugin } from "emdash";
import type { PluginDefinition } from "emdash";

type D1 = { prepare: (sql: string) => { bind: (...v: unknown[]) => { all: () => Promise<{ results?: any[] }>; run: () => Promise<unknown> }; all: () => Promise<{ results?: any[] }> } };
const db = () => (env as unknown as { DB?: D1 }).DB;
const tablesMissing = (e: unknown) => /no such table/i.test(String((e as Error)?.message ?? e));

const definition: PluginDefinition = {
	id: "reviews",
	version: "0.1.0",
	// entry marks the admin screen as a React page; astro.config.mjs (adminEntry) loads ./admin.tsx.
	admin: { entry: "./admin.tsx", pages: [{ path: "/", label: "Reviews", icon: "star" }] },
	routes: {
		list: {
			permission: "content:read",
			handler: async () => {
				const d = db();
				if (!d) return { locations: [], reviews: [] };
				try {
					const [meta, rows] = await Promise.all([
						d.prepare("SELECT location, title, place_id, rating, votes_count, synced_at FROM review_meta ORDER BY location").all(),
						d.prepare("SELECT review_id, location, author, rating, text, published_at, time_ago, review_url, hidden FROM reviews ORDER BY published_at DESC").all(),
					]);
					return { locations: meta.results ?? [], reviews: rows.results ?? [] };
				} catch (e) {
					if (tablesMissing(e)) return { locations: [], reviews: [], notSetUp: true };
					throw e;
				}
			},
		},
		hide: {
			permission: "content:publish_any",
			handler: async (ctx) => {
				const body = ((ctx.input as Record<string, unknown> | undefined) ?? (await ctx.request.json().catch(() => ({})))) as { id?: string; hidden?: boolean };
				if (!body.id) throw new Error("Missing review id");
				const d = db();
				if (!d) throw new Error("No database");
				await d.prepare("UPDATE reviews SET hidden = ? WHERE review_id = ?").bind(body.hidden ? 1 : 0, body.id).run();
				return { id: body.id, hidden: !!body.hidden };
			},
		},
	},
};

export function createPlugin() {
	return definePlugin(definition);
}

export default createPlugin;
