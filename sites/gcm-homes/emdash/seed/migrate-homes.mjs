/**
 * ONE-TIME migration: the admin "Listings" collection goes from one row per MLS
 * listing number to ONE ROW PER HOME (parcel), and the "Sold Listings"
 * collection (PR #246) is folded into it and retired.
 * PROPERTY-PAGES-PLAN.md stage 3 (Liz, 2026-11-06).
 *
 * What it does (in --apply mode; without it, the same analysis is printed and
 * nothing is written):
 *   1. Backs up ec_listings and ec_sold_listings inside the database
 *      (_bak_<table>_<date>) — JSON backups are made beforehand by export-d1.mjs.
 *   2. Works out, per home, which old row's edits win (the newest listing's);
 *      every other edited row is kept on its listing's archive row
 *      (owner_snapshot), where the admin's Listing history panel shows it.
 *      Homes with edits on more than one row are listed: read them before --apply.
 *   3. Empties ec_listings, drops the MLS columns that moved into the "From the
 *      MLS" panel, registers the new fields (seed/lib/homes.mjs) and fills one
 *      row per home (mirrorHomes), then writes the winning edits onto each home.
 *      show_grant is left at its default: on when Grant is the listing agent of
 *      the current listing, off otherwise (decision 3), whatever the old row had.
 *   4. Fills property_slugs with every old slug (listing, sold and archive).
 *   5. Retires Sold Listings: its fields and collection row go, and the table is
 *      renamed _retired_ec_sold_listings (data kept).
 *
 * Order on the day: merge the PRs (so the Actions sync already carries the new
 * mirror; it skips itself until this has run), run this with --live --apply,
 * then deploy the site. Between the migration and the deploy the OLD site shows
 * listings without Grant's edits (its lookups are by listing number), so do the
 * two together.
 *
 * Run:  node --env-file=.env seed/export-d1.mjs --out <dir>          (first)
 *       node seed/migrate-homes.mjs --local <dir>/gcm-homes-db.sqlite          (dry run)
 *       node seed/migrate-homes.mjs --local <dir>/gcm-homes-db.sqlite --apply  (rehearsal)
 *       node --env-file=.env seed/migrate-homes.mjs --live                      (dry run)
 *       node --env-file=.env seed/migrate-homes.mjs --live --apply              (the real thing)
 */
import {
	S, OWNER_COLS, ADMIN_ORDER, INTERNAL_COLS, homesFrom, ARCHIVE_HOME_COLS,
	registerListingsCollection, mirrorHomes, newestFirst,
} from "./lib/homes.mjs";

const APPLY = process.argv.includes("--apply");
const LIVE = process.argv.includes("--live");
const localAt = process.argv.indexOf("--local");
const LOCAL = localAt > 0 ? process.argv[localAt + 1] : null;
if (!LIVE && !LOCAL) { console.error("Use --local <file.sqlite> or --live"); process.exit(1); }
if (LIVE && LOCAL) { console.error("Pick one of --local / --live"); process.exit(1); }

// ── d1(sql) against the live D1 (REST) or a local SQLite copy (node:sqlite) ───
let d1;
if (LIVE) {
	const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
	const CF_DB      = process.env.CF_D1_DATABASE_ID || "614044b7-3e0c-41ee-ac78-7805cbab6d99";
	const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
	const TOKEN = process.env.GCM_D1_TOKEN || process.env.CF_API_TOKEN;
	if (!TOKEN) { console.error("GCM_D1_TOKEN required for --live"); process.exit(1); }
	d1 = async (sql) => {
		const r = await fetch(D1_URL, {
			method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
			body: JSON.stringify({ sql }), signal: AbortSignal.timeout(120000),
		});
		const j = await r.json().catch(() => ({}));
		if (!r.ok || !j.success) throw new Error(`D1 error ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 300)}`);
		return j.result;
	};
} else {
	const { DatabaseSync } = await import("node:sqlite");
	const db = new DatabaseSync(LOCAL);
	d1 = async (sql) => {
		const head = sql.trim().slice(0, 6).toUpperCase();
		if (head.startsWith("SELECT") || head.startsWith("PRAGMA")) return [{ results: db.prepare(sql).all() }];
		db.exec(sql);
		return [{ results: [], meta: {} }];
	};
}
const rows = async (sql) => (await d1(sql))?.[0]?.results ?? [];
const OFF = new Set(["", "0", "0.0", "false"]);
const on = (v) => v != null && !OFF.has(String(v).trim());
const clean = (v) => { const s = (v ?? "").toString().trim(); return s === "" ? null : s; };
// Columns the old collection carried that the new one shows in the panel instead.
const RETIRED_COLS = ["state", "zip", "lot_acres", "year_built", "property_type", "mls_status", "view", "dom", "flooring", "fireplaces", "fireplace_yn", "fireplace_features", "roof", "utilities", "pool_features", "hoa_frequency", "stories", "arch_style", "construction", "lot_features", "condition", "lot_sqft", "list_price"];

/** Which of Grant's columns on an old row hold something (description only when it differs from the MLS snapshot). */
function editsOf(r) {
	const e = {};
	for (const c of OWNER_COLS) {
		if (c === "show_grant") continue;
		if (c === "description") { if (clean(r.description) && r.description !== r._mls_description) e.description = r.description; continue; }
		if (c === "featured" || c === "hidden") { if (on(r[c])) e[c] = r[c]; continue; }
		if (clean(r[c])) e[c] = r[c];
	}
	return e;
}

async function main() {
	const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	console.log(`mode: ${LIVE ? "LIVE D1" : `local copy ${LOCAL}`}, ${APPLY ? "APPLY" : "dry run (nothing written)"}`);

	// ── preflight ──
	const tables = new Set((await rows("SELECT name FROM sqlite_master WHERE type='table'")).map((t) => t.name));
	if (!tables.has("ec_listings")) throw new Error("ec_listings missing");
	const legacy = (await rows("SELECT count(*) n FROM ec_listings WHERE id NOT LIKE 'p-%'"))[0].n;
	const homesAlready = (await rows("SELECT count(*) n FROM ec_listings WHERE id LIKE 'p-%'"))[0].n;
	if (legacy === 0 && homesAlready > 0 && !tables.has("ec_sold_listings")) {
		console.log(`already migrated: ${homesAlready} home rows, no rows keyed by listing number, Sold Listings retired. Nothing to do.`);
		return;
	}
	console.log(`ec_listings: ${legacy} rows keyed by listing number, ${homesAlready} home rows; ec_sold_listings: ${tables.has("ec_sold_listings") ? (await rows("SELECT count(*) n FROM ec_sold_listings"))[0].n : "absent"}`);

	// ── load ──
	const archive = await rows(`SELECT ${ARCHIVE_HOME_COLS}, owner_snapshot FROM listing_archive`);
	const byKey = new Map(archive.map((a) => [a.id, a]));
	const homes = homesFrom(archive);
	const oldListings = legacy ? await rows("SELECT * FROM ec_listings WHERE id NOT LIKE 'p-%'") : [];
	const oldSold = tables.has("ec_sold_listings") ? await rows("SELECT * FROM ec_sold_listings") : [];
	console.log(`archive: ${archive.length} listings on ${homes.size} homes (${[...homes.values()].filter((r) => r.length > 1).length} with more than one listing)`);

	// ── which edits win ──
	// candidates per home: every old row with edits, newest listing first.
	const cands = new Map(); // parcel -> [{ key, source, edits, a }]
	const orphans = [];
	for (const [source, list] of [["Listings", oldListings], ["Sold Listings", oldSold]]) {
		for (const r of list) {
			const edits = editsOf(r);
			if (!Object.keys(edits).length) continue;
			const a = byKey.get(r.id);
			if (!a?.parcel_number) { orphans.push({ source, key: r.id, title: r.title, edits: Object.keys(edits) }); continue; }
			if (!cands.has(a.parcel_number)) cands.set(a.parcel_number, []);
			cands.get(a.parcel_number).push({ key: r.id, source, edits, a });
		}
	}
	// Grant's edits saved on archive rows as listings left the feed count too.
	for (const a of archive) {
		if (!a.owner_snapshot || !a.parcel_number) continue;
		let snap; try { snap = JSON.parse(a.owner_snapshot); } catch { continue; }
		const edits = editsOf({ ...snap, _mls_description: null });
		if (!Object.keys(edits).length) continue;
		const list = cands.get(a.parcel_number) || [];
		if (list.some((c) => c.key === a.id)) continue; // the ec row for this listing already counts
		list.push({ key: a.id, source: "archive snapshot", edits, a });
		cands.set(a.parcel_number, list);
	}
	const multi = [];
	const winners = new Map(); // parcel -> candidate
	for (const [parcel, list] of cands) {
		list.sort((x, y) => newestFirst(x.a, y.a));
		winners.set(parcel, list[0]);
		if (list.length > 1) multi.push({ parcel, list });
	}
	console.log(`\nhomes with Grant's edits: ${cands.size} (${[...cands.values()].flat().length} edited rows)`);
	if (orphans.length) {
		console.log(`\nORPHANS — edited rows whose listing is not in the archive (kept only in the backup):`);
		for (const o of orphans) console.log(`  ${o.source} ${o.key} "${o.title}": ${o.edits.join(", ")}`);
	}
	if (multi.length) {
		console.log(`\nHOMES WITH EDITS ON MORE THAN ONE ROW — the first line wins, the rest stay on their listing's archive row (history panel):`);
		for (const { parcel, list } of multi) {
			console.log(`  ${list[0].a.address} (parcel ${parcel})`);
			for (const c of list) console.log(`    ${c === list[0] ? "WINS " : "keeps"} ${c.source} ${c.key} listed ${c.a.listing_date || "?"} ${c.a.archive_status}: ${Object.keys(c.edits).join(", ")}`);
		}
	} else {
		console.log("no home has edits on more than one row");
	}
	// Decision 3 preview: homes whose edits came from a listing where Grant was NOT
	// the listing agent will have those edits saved but switched OFF.
	const offButEdited = [...winners.values()].filter((c) => {
		const cur = homes.get(c.a.parcel_number)?.[0];
		return cur && !(cur.list_agent_id === "meyergra111" || cur.co_list_agent_id === "meyergra111");
	});
	if (offButEdited.length) {
		console.log(`\nSWITCH OFF BY DEFAULT (Grant is not the listing agent on the current listing) — edits are kept but hidden until he switches them on:`);
		for (const c of offButEdited) console.log(`  ${c.a.address}: ${Object.keys(c.edits).join(", ")}`);
	}

	if (!APPLY) { console.log("\ndry run complete. Re-run with --apply to write."); return; }

	// ── 1. in-database backups ──
	for (const t of ["ec_listings", "ec_sold_listings"]) {
		if (!tables.has(t)) continue;
		await d1(`DROP TABLE IF EXISTS "_bak_${t}_${stamp}"`);
		await d1(`CREATE TABLE "_bak_${t}_${stamp}" AS SELECT * FROM "${t}"`);
		console.log(`backup: _bak_${t}_${stamp}`);
	}
	// ── 2. keep the non-winning edits on their archive rows ──
	let snaps = 0;
	for (const { list } of multi) {
		for (const c of list.slice(1)) {
			if (c.source === "archive snapshot") continue; // already there
			const snap = { ...c.edits, taken_at: new Date().toISOString(), listing_key: c.key, from: c.source };
			await d1(`UPDATE listing_archive SET owner_snapshot=${S(JSON.stringify(snap))} WHERE id=${S(c.key)}`);
			snaps++;
		}
	}
	// Winners from the old tables are also snapshotted onto their listing, so the
	// history panel shows what was written for each listing number.
	for (const c of winners.values()) {
		if (c.source === "archive snapshot") continue;
		const snap = { ...c.edits, taken_at: new Date().toISOString(), listing_key: c.key, from: c.source };
		await d1(`UPDATE listing_archive SET owner_snapshot=COALESCE(owner_snapshot, ${S(JSON.stringify(snap))}) WHERE id=${S(c.key)}`);
	}
	console.log(`archive snapshots written for ${snaps} non-winning row(s)`);

	// ── 3. rebuild ec_listings as homes ──
	await d1("DELETE FROM ec_listings");
	for (const c of RETIRED_COLS) { try { await d1(`ALTER TABLE ec_listings DROP COLUMN "${c}"`); } catch { /* not there */ } }
	await registerListingsCollection(d1);
	await mirrorHomes(d1);
	let applied = 0;
	for (const [parcel, c] of winners) {
		const sets = Object.entries(c.edits).map(([k, v]) => `"${k}"=${S(v)}`);
		if (!sets.length) continue;
		await d1(`UPDATE ec_listings SET ${sets.join(", ")} WHERE id=${S("p-" + parcel)}`);
		applied++;
	}
	console.log(`Grant's edits applied to ${applied} home(s)`);

	// ── 4. every old slug redirects ──
	const now = new Date().toISOString();
	const slugRows = [];
	for (const r of [...oldListings, ...oldSold]) {
		const a = byKey.get(r.id);
		if (r.slug && a?.parcel_number && !String(r.slug).includes("~")) slugRows.push([r.slug, `p-${a.parcel_number}`]);
	}
	for (let i = 0; i < slugRows.length; i += 200) {
		const tuples = slugRows.slice(i, i + 200).map(([s, id]) => `(${S(s)},${S(id)},${S(now)})`).join(",");
		if (tuples) await d1(`INSERT OR IGNORE INTO property_slugs (slug, property_id, created_at) VALUES ${tuples}`);
	}
	console.log(`property_slugs: ${(await rows("SELECT count(*) n FROM property_slugs"))[0].n} slugs`);

	// ── 5. retire Sold Listings ──
	if (tables.has("ec_sold_listings")) {
		await d1("DELETE FROM _emdash_fields WHERE collection_id='col_sold_listings'");
		await d1("DELETE FROM _emdash_collections WHERE id='col_sold_listings'");
		await d1(`DROP TABLE IF EXISTS "_retired_ec_sold_listings"`);
		await d1(`ALTER TABLE ec_sold_listings RENAME TO "_retired_ec_sold_listings"`);
		console.log("Sold Listings collection retired (table kept as _retired_ec_sold_listings)");
	}

	// ── verify ──
	const v = (await rows("SELECT (SELECT count(*) FROM ec_listings) homes, (SELECT count(*) FROM ec_listings WHERE id NOT LIKE 'p-%') legacy, (SELECT count(*) FROM ec_listings WHERE home_status='Sold') sold, (SELECT count(*) FROM ec_listings WHERE home_status='On market') onmarket, (SELECT count(*) FROM ec_listings WHERE show_grant='1.0') grant_on, (SELECT count(*) FROM property_slugs) slugs"))[0];
	console.log("after:", JSON.stringify(v));
	const unregistered = (await rows("PRAGMA table_info(ec_listings)")).map((c) => c.name)
		.filter((n) => !n.startsWith("_") && !["id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "deleted_at", "version", "live_revision_id", "draft_revision_id", "locale", "translation_group", "title"].includes(n))
		.filter((n) => !ADMIN_ORDER.some(([s]) => s === n));
	if (unregistered.length) console.log("WARNING unregistered non-_ columns remain (admin saves would fail):", unregistered.join(", "));
	else console.log("every ec_listings column is a registered field or _-prefixed");
	void INTERNAL_COLS;
}
main().catch((e) => { console.error("MIGRATION FAILED:", e.message); process.exit(1); });
