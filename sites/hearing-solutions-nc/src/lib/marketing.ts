// Marketing & tracking settings (admin page: src/plugins/marketing), kept in
// the site's own D1 table marketing_settings. Server-side only: secrets (the
// Resend key, the Turnstile secret) never reach a page.
import { env } from "cloudflare:workers";
import { MARKETING_ITEMS } from "../data/marketing-items";

type Row = { key: string; on_off: number; value: string | null };
type D1 = {
	prepare: (sql: string) => {
		bind: (...v: unknown[]) => { run: () => Promise<unknown>; all: () => Promise<{ results?: Row[] }> };
		all: () => Promise<{ results?: Row[] }>;
		run: () => Promise<unknown>;
	};
};
const db = () => (env as unknown as { DB?: D1 }).DB;

export type Marketing = Record<string, { on: boolean; value: string }>;

const CREATE = "CREATE TABLE IF NOT EXISTS marketing_settings (key TEXT PRIMARY KEY, on_off INTEGER NOT NULL DEFAULT 0, value TEXT, updated_at TEXT)";

/** Every item, saved value or the starting value. */
export async function getMarketing(): Promise<Marketing> {
	const out: Marketing = Object.fromEntries(MARKETING_ITEMS.map((i) => [i.key, { on: !!i.on, value: i.value ?? "" }]));
	const d = db();
	if (!d) return out;
	try {
		const { results = [] } = await d.prepare("SELECT key, on_off, value FROM marketing_settings").all();
		for (const r of results) if (r.key in out) out[r.key] = { on: !!r.on_off, value: r.value ?? "" };
	} catch (e) {
		if (!/no such table/i.test(String((e as Error)?.message ?? e))) console.error("Marketing settings unreadable:", e);
	}
	return out;
}

/** Save items; a secret sent empty keeps the saved one. */
export async function saveMarketing(items: { key: string; on: boolean; value?: string }[]) {
	const d = db();
	if (!d) throw new Error("No database");
	await d.prepare(CREATE).run();
	const now = new Date().toISOString();
	for (const it of items) {
		const def = MARKETING_ITEMS.find((i) => i.key === it.key);
		if (!def) continue;
		const keep = def.kind === "secret" && !it.value;
		if (keep) await d.prepare("INSERT INTO marketing_settings (key, on_off, value, updated_at) VALUES (?, ?, NULL, ?) ON CONFLICT(key) DO UPDATE SET on_off = excluded.on_off, updated_at = excluded.updated_at").bind(it.key, it.on ? 1 : 0, now).run();
		else await d.prepare("INSERT INTO marketing_settings (key, on_off, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET on_off = excluded.on_off, value = excluded.value, updated_at = excluded.updated_at").bind(it.key, it.on ? 1 : 0, (it.value ?? "").trim(), now).run();
	}
}

/** An item's value when it's switched on and filled in. */
export const active = (m: Marketing, key: string) => (m[key]?.on && m[key].value.trim() ? m[key].value.trim() : "");

/** Is this request on the practice's live domain? Previews, workers.dev and local copies aren't. */
export function onLiveDomain(m: Marketing, host: string) {
	const domain = active(m, "live_domain").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").toLowerCase();
	const h = host.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
	return !!domain && h === domain;
}
