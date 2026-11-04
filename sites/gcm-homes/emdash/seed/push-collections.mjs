/**
 * Push custom collections + content from seed/seed.json into the REMOTE emdash D1.
 *
 * Why: emdash only applies seed.json during first-time setup (needsSetup gate).
 * Redeploying does NOT re-seed, and `emdash seed` targets a local DB. This tool
 * writes our collections straight into the deployed D1's emdash tables
 * (_emdash_collections, _emdash_fields, ec_<slug>) via the D1 REST API, matching
 * emdash's schema (mirrors the Ontario generate-setup pattern). Idempotent:
 * deterministic ids + upserts, and it never touches pages/posts.
 *
 * Run:  node --env-file=.env seed/push-collections.mjs   (reads GCM_D1_TOKEN)
 *
 * Edit-safe: content entries already edited in the emdash admin are preserved, so
 * re-running this to add a field will not revert anyone's copy. Add --force to
 * overwrite them from seed.json deliberately.
 */
import fs from "node:fs";

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
const CF_DB      = process.env.CF_D1_DATABASE_ID || "614044b7-3e0c-41ee-ac78-7805cbab6d99";
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
// NOTE: do NOT name this CF_API_TOKEN in a .env file — wrangler auto-loads .env
// and treats CF_API_TOKEN as an alias for CLOUDFLARE_API_TOKEN, which then
// overrides the OAuth login and breaks `wrangler deploy` from this folder.
const TOKEN = process.env.GCM_D1_TOKEN || process.env.CF_API_TOKEN;

// By default, content entries that have been edited in the emdash admin are left
// alone — collections and fields are still (re)registered either way. Pass --force
// to overwrite CMS edits with whatever seed.json says.
const FORCE = process.argv.includes("--force");

// Which seed collections to push (skip the starter defaults).
const SKIP = new Set(["pages", "posts"]);

const seed = JSON.parse(fs.readFileSync(new URL("./seed.json", import.meta.url), "utf-8"));

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
const S = (v) => v === null || v === undefined ? "NULL" : (typeof v === "number" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");

// emdash field type -> ec_ column SQL type
const colType = (t) => (t === "portableText" || t === "image" || t === "reference" ? "json" : "text");
// emdash 1.x stores every content datetime as UTC ISO with milliseconds
// ("2026-11-03T15:56:00.123Z"); SQLite's datetime('now') format sorts and
// compares wrong against it.
const NOW_SQL = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
// Base columns every ec_ table has (from ec_pages). `title` is a base column too.
const BASE_COLS = [
	["id", "text primary key"], ["slug", "text"], ["status", "text default 'draft'"],
	["author_id", "text"], ["primary_byline_id", "text"],
	["created_at", `text default ${NOW_SQL}`], ["updated_at", `text default ${NOW_SQL}`],
	["published_at", "text"], ["scheduled_at", "text"], ["deleted_at", "text"],
	["version", "integer default 1"], ["live_revision_id", "text"], ["draft_revision_id", "text"],
	["locale", "text default 'en' not null"], ["translation_group", "text"],
	["title", "text default '' not null"],
];

async function pushCollection(col) {
	const cid = `col_${col.slug}`;
	const supports = JSON.stringify(col.supports || []);
	const hasSeo = (col.supports || []).includes("seo") ? 1 : 0;
	// 1) collection row. An upsert, not INSERT OR REPLACE: REPLACE deletes the row,
	// which resets every column this script doesn't set (emdash 1.x added hidden,
	// routable, sort_order, nav_group, ... that are set in the admin) and cascades
	// into _emdash_fields.
	await d1(`INSERT INTO _emdash_collections (id,slug,label,label_singular,supports,source,has_seo,url_pattern,created_at,updated_at) VALUES (${S(cid)},${S(col.slug)},${S(col.label)},${S(col.labelSingular || col.label)},${S(supports)},'manual',${hasSeo},${S(col.urlPattern || null)},${NOW_SQL},${NOW_SQL}) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, label=excluded.label, label_singular=excluded.label_singular, supports=excluded.supports, source=excluded.source, has_seo=excluded.has_seo, url_pattern=excluded.url_pattern, updated_at=excluded.updated_at`);

	// 2) field rows. `title` MUST be registered (emdash's editor always submits a
	// `title` value; if it isn't a known field, every save fails with
	// "unknown field on collection"). It maps to the base `title` column — no extra
	// column is created for it (see customFields below).
	const fields = col.fields || [];
	// clear old fields for this collection so removed fields don't linger
	await d1(`DELETE FROM _emdash_fields WHERE collection_id=${S(cid)}`);
	// register title first (matches emdash's default pages/posts: type string, TEXT, required)
	await d1(`INSERT OR REPLACE INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,sort_order,searchable) VALUES (${S("fld_" + col.slug + "_title")},${S(cid)},'title','Title','string','TEXT',1,0,1)`);
	let order = 1;
	for (const f of fields) {
		if (f.slug === "title") continue; // never double-register the base title field
		await d1(`INSERT OR REPLACE INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,sort_order,searchable) VALUES (${S("fld_" + col.slug + "_" + f.slug)},${S(cid)},${S(f.slug)},${S(f.label)},${S(f.type)},${S(colType(f.type))},${f.required ? 1 : 0},${order++},${f.searchable ? 1 : 0})`);
	}

	// 3) ec_<slug> table = base cols + custom field cols (excluding title, already base)
	const customFields = fields.filter((f) => f.slug !== "title");
	const cols = [...BASE_COLS.map(([n, t]) => `"${n}" ${t}`), ...customFields.map((f) => `"${f.slug}" ${colType(f.type)}`)];
	await d1(`CREATE TABLE IF NOT EXISTS ec_${col.slug} (${cols.join(", ")}, constraint "ec_${col.slug}_slug_locale_unique" unique ("slug","locale"))`);
	// add any missing custom columns if the table already existed
	for (const f of customFields) {
		try { await d1(`ALTER TABLE ec_${col.slug} ADD COLUMN "${f.slug}" ${colType(f.type)}`); } catch { /* exists */ }
	}
	return cid;
}

async function pushEntries(col) {
	const entries = (seed.content && seed.content[col.slug]) || [];
	const fieldSlugs = (col.fields || []).map((f) => f.slug);
	const jsonFields = new Set((col.fields || []).filter((f) => colType(f.type) === "json").map((f) => f.slug));

	// Which rows has a human edited? Each write stamps the hidden `_seeded_at` column
	// with the same value as updated_at; an admin save moves updated_at and leaves
	// _seeded_at behind. (`_`-prefixed so emdash's save validator skips it.)
	// julianday() compares instants, so the old "YYYY-MM-DD HH:MM:SS" stamps still
	// match after emdash 1.x rewrites updated_at as "...T...Z".
	//
	// Before 1.x the date FORMAT was the marker (the admin wrote ISO, this script
	// wrote SQLite's format). When the column is first added, rows still in the old
	// format are adopted as seeded. Run after the 1.x migration has rewritten them,
	// nothing is adopted and every row reads as edited: entries are skipped, never
	// overwritten.
	try {
		await d1(`ALTER TABLE ec_${col.slug} ADD COLUMN "_seeded_at" text`);
		const res = await d1(`UPDATE ec_${col.slug} SET "_seeded_at"=updated_at WHERE updated_at NOT LIKE '%T%Z'`);
		console.log(`  · ${col.slug}: added _seeded_at, adopted ${res?.[0]?.meta?.changes ?? 0} seeded row(s)`);
	} catch { /* column exists */ }

	const edited = new Set();
	if (!FORCE) {
		try {
			const res = await d1(`SELECT id FROM ec_${col.slug} WHERE "_seeded_at" IS NULL OR julianday(updated_at) IS NOT julianday("_seeded_at")`);
			for (const r of res?.[0]?.results || []) edited.add(String(r.id));
		} catch { /* table may not exist on the first run */ }
	}

	let skipped = 0;
	for (const e of entries) {
		if (edited.has(String(e.id))) {
			skipped++;
			console.log(`  · skipped ${col.slug}/${e.slug || e.id} — edited in the CMS (use --force to overwrite)`);
			continue;
		}
		const data = e.data || {};
		const now = S(new Date().toISOString());
		const cols = ["id", "slug", "status", "locale", "version", "title", "published_at", "updated_at", "_seeded_at"];
		const vals = [S(e.id), S(e.slug), S(e.status || "published"), "'en'", "1", S(data.title || ""), now, now, now];
		for (const fs2 of fieldSlugs) {
			if (fs2 === "title") continue;
			cols.push(`"${fs2}"`);
			const v = data[fs2];
			vals.push(v === undefined ? "NULL" : (jsonFields.has(fs2) ? S(JSON.stringify(v)) : S(v)));
		}
		await d1(`INSERT OR REPLACE INTO ec_${col.slug} (${cols.join(",")}) VALUES (${vals.join(",")})`);
	}
	return { written: entries.length - skipped, skipped };
}

async function main() {
	if (!TOKEN) throw new Error("CF_API_TOKEN required");
	const cols = (seed.collections || []).filter((c) => !SKIP.has(c.slug));
	for (const col of cols) {
		await pushCollection(col);
		const { written, skipped } = await pushEntries(col);
		console.log(`✓ ${col.slug}: ${col.fields.length} fields, ${written} entries written${skipped ? `, ${skipped} preserved` : ""}`);
	}
	console.log(`Done. Pushed ${cols.length} collection(s).`);
}
main().catch((e) => { console.error("PUSH FAILED:", e.message); process.exit(1); });
