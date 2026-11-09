/**
 * Register the emdash `listings` collection (ec_listings) and fill it with ONE
 * ROW PER HOME from `listing_archive`, keyed by parcel number (`p-<parcel>`).
 *
 * 2026-11-09 (PROPERTY-PAGES-PLAN.md, Liz 2026-11-06). Before this the collection
 * mirrored the live `listings` table one row per MLS listing number, and a home
 * got a new admin row (and a new page) every time it was relisted or resold. Now
 * a home has one row for life: its MLS columns and `home_status` follow the
 * current listing, Grant's columns are his and survive every sync, and
 * `show_grant` decides whether his content shows on the page (on by default
 * only when he is the listing agent; it resets when a new listing starts).
 *
 * The Trestle sync (trestle-test/cf-worker/sync/sync.mjs, mirrorEmdashHomes) keeps
 * the rows fresh after every pull with its own copy of mirrorHomes(). This
 * script is for (a) registering or changing the collection's fields and (b) a
 * manual rebuild. It refuses to run while rows keyed by listing number remain:
 * run seed/migrate-homes.mjs first (one time, with backups).
 *
 * Run:  node --env-file=.env seed/mirror-listings.mjs            (reads GCM_D1_TOKEN)
 *       node --env-file=.env seed/mirror-listings.mjs --register-only
 */
import { registerListingsCollection, mirrorHomes } from "./lib/homes.mjs";

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
const CF_DB      = process.env.CF_D1_DATABASE_ID || "614044b7-3e0c-41ee-ac78-7805cbab6d99";
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
// GCM_D1_TOKEN, not CF_API_TOKEN: wrangler auto-loads .env and treats
// CF_API_TOKEN as an alias for CLOUDFLARE_API_TOKEN, which would override the
// OAuth login and break every wrangler deploy from this folder.
const TOKEN = process.env.GCM_D1_TOKEN || process.env.CF_API_TOKEN || process.env.TOKEN;

async function d1(sql) {
	const r = await fetch(D1_URL, {
		method: "POST",
		headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
		body: JSON.stringify({ sql }),
		signal: AbortSignal.timeout(60000),
	});
	const j = await r.json().catch(() => ({}));
	if (!r.ok || !j.success) throw new Error(`D1 error ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 300)}`);
	return j.result;
}

export async function mirrorListings(log = console.log) {
	await registerListingsCollection(d1, log);
	if (process.argv.includes("--register-only")) return 0;
	return mirrorHomes(d1, log);
}

// Standalone run
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("mirror-listings.mjs")) {
	if (!TOKEN) { console.error("GCM_D1_TOKEN required"); process.exit(1); }
	mirrorListings().then(() => console.log("done")).catch((e) => { console.error("MIRROR FAILED:", e.message); process.exit(1); });
}
