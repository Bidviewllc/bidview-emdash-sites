/**
 * Copy the tables the home migration touches out of the live D1: a local SQLite
 * file (for a dry run of seed/migrate-homes.mjs --local) plus one JSON file per
 * table (the backup). Read-only against D1.
 *
 * Tables: listings, listing_photos (skipped: 7k URLs, nothing in the migration
 * reads them), listing_archive, listing_events, ec_listings, ec_sold_listings,
 * _emdash_collections, _emdash_fields, property_slugs (if it exists), sync_meta.
 *
 * Run:  node --env-file=.env seed/export-d1.mjs --out "<dir>"      (reads GCM_D1_TOKEN)
 *       node --env-file=.env seed/export-d1.mjs --out "<scratch dir>" --all   (every table, for a local site rehearsal)
 *       writes <dir>/gcm-homes-db.sqlite and <dir>/<table>.json
 *
 * The local copy is loaded through node:sqlite (Node 22+). wrangler's local
 * import hits SQLITE_TOOBIG on this database, which is why the copy is made here.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
const CF_DB      = process.env.CF_D1_DATABASE_ID || "614044b7-3e0c-41ee-ac78-7805cbab6d99";
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
const TOKEN = process.env.GCM_D1_TOKEN || process.env.CF_API_TOKEN;
const TABLES = ["listings", "listing_archive", "listing_events", "ec_listings", "ec_sold_listings", "_emdash_collections", "_emdash_fields", "property_slugs", "sync_meta"];
// --all: every table, for a local copy the dev server can run on (a full site
// rehearsal). Never copied: the FTS5 virtual tables (node:sqlite can't load
// them and the site rebuilds them), live session/API/OAuth tokens, and the
// contact-form leads (schema only). Keep a full copy in a scratch folder, not
// in a shared deliverables folder: it holds the admin user records.
const ALL = process.argv.includes("--all");
const NEVER = /^(_emdash_fts_|_cf_KV$)/;
const TOKENS = new Set(["auth_tokens", "_emdash_api_tokens", "_emdash_oauth_tokens", "_emdash_authorization_codes", "_emdash_device_codes", "auth_challenges", "_emdash_entry_locks"]);
const SCHEMA_ONLY = new Set(["contact_submissions", "audit_logs", "_emdash_404_log"]);

async function d1(sql) {
	const r = await fetch(D1_URL, {
		method: "POST",
		headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
		body: JSON.stringify({ sql }),
		signal: AbortSignal.timeout(120000),
	});
	const j = await r.json().catch(() => ({}));
	if (!r.ok || !j.success) throw new Error(`D1 error ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 300)}`);
	return j.result;
}

async function main() {
	if (!TOKEN) throw new Error("GCM_D1_TOKEN required");
	const at = process.argv.indexOf("--out");
	const out = at > 0 ? process.argv[at + 1] : null;
	if (!out) throw new Error("--out <dir> required");
	fs.mkdirSync(out, { recursive: true });
	const file = path.join(out, "gcm-homes-db.sqlite");
	if (fs.existsSync(file)) fs.unlinkSync(file);
	const db = new DatabaseSync(file);
	// Tables are created in sqlite_master order, which is not FK order (media
	// references media_folders, created later). The copy is for reading.
	db.exec("PRAGMA foreign_keys=OFF");
	const master = (await d1("SELECT name, sql FROM sqlite_master WHERE type='table'"))?.[0]?.results ?? [];
	const ddl = Object.fromEntries(master.map((m) => [m.name, m.sql]));
	const tables = ALL ? master.map((m) => m.name).filter((n) => !NEVER.test(n) && !TOKENS.has(n) && ddl[n]) : TABLES;
	for (const t of tables) {
		if (!ddl[t]) { console.log(`· ${t}: not in D1, skipped`); continue; }
		db.exec(ddl[t]);
		if (SCHEMA_ONLY.has(t)) { console.log(`· ${t}: schema only`); continue; }
		const cols = ((await d1(`PRAGMA table_info("${t}")`))?.[0]?.results ?? []).map((c) => c.name);
		const ins = db.prepare(`INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`);
		const all = [];
		for (let off = 0; ; off += 400) {
			const page = (await d1(`SELECT * FROM "${t}" ORDER BY rowid LIMIT 400 OFFSET ${off}`))?.[0]?.results ?? [];
			// D1 answers JSON: booleans and nested objects have no SQLite type of their own.
			const bind = (v) => v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : (v !== null && typeof v === "object") ? JSON.stringify(v) : v;
			for (const row of page) ins.run(...cols.map((c) => bind(row[c])));
			all.push(...page);
			if (page.length < 400) break;
		}
		if (!ALL || TABLES.includes(t)) fs.writeFileSync(path.join(out, `${t}.json`), JSON.stringify(all));
		console.log(`✓ ${t}: ${all.length} rows`);
	}
	// Indexes and the unique constraints live in the table DDL already; add the
	// archive indexes the sync creates so the dry run behaves the same.
	for (const m of (await d1(ALL ? "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL" : "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND tbl_name IN ('listing_archive','property_slugs')"))?.[0]?.results ?? []) {
		try { db.exec(m.sql); } catch { /* duplicate */ }
	}
	db.close();
	console.log(`local copy: ${file}`);
}
main().catch((e) => { console.error("EXPORT FAILED:", e.message); process.exit(1); });
