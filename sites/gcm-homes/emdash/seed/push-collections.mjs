/**
 * Push custom collections + content from seed/seed.json into the REMOTE emdash D1.
 *
 * Why: emdash only applies seed.json during first-time setup (needsSetup gate).
 * Redeploying does NOT re-seed, and `emdash seed` targets a local DB. This tool
 * writes our collections straight into the deployed D1's emdash tables
 * (_emdash_collections, _emdash_fields, ec_<slug>) via the D1 REST API, matching
 * emdash's schema (mirrors the Ontario generate-setup pattern). Idempotent:
 * deterministic ids + INSERT OR REPLACE, and it never touches pages/posts.
 *
 * Run:  CF_API_TOKEN=<cameron> node seed/push-collections.mjs
 */
import fs from "node:fs";

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
const CF_DB      = process.env.CF_D1_DATABASE_ID || "614044b7-3e0c-41ee-ac78-7805cbab6d99";
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
const TOKEN = process.env.CF_API_TOKEN;

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
// Base columns every ec_ table has (from ec_pages). `title` is a base column too.
const BASE_COLS = [
	["id", "text primary key"], ["slug", "text"], ["status", "text default 'draft'"],
	["author_id", "text"], ["primary_byline_id", "text"],
	["created_at", "text default (datetime('now'))"], ["updated_at", "text default (datetime('now'))"],
	["published_at", "text"], ["scheduled_at", "text"], ["deleted_at", "text"],
	["version", "integer default 1"], ["live_revision_id", "text"], ["draft_revision_id", "text"],
	["locale", "text default 'en' not null"], ["translation_group", "text"],
	["title", "text default '' not null"],
];

async function pushCollection(col) {
	const cid = `col_${col.slug}`;
	const supports = JSON.stringify(col.supports || []);
	const hasSeo = (col.supports || []).includes("seo") ? 1 : 0;
	// 1) collection row
	await d1(`INSERT OR REPLACE INTO _emdash_collections (id,slug,label,label_singular,supports,source,has_seo,url_pattern,created_at,updated_at) VALUES (${S(cid)},${S(col.slug)},${S(col.label)},${S(col.labelSingular || col.label)},${S(supports)},'manual',${hasSeo},${S(col.urlPattern || null)},datetime('now'),datetime('now'))`);

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
	for (const e of entries) {
		const data = e.data || {};
		const cols = ["id", "slug", "status", "locale", "version", "title", "published_at", "updated_at"];
		const vals = [S(e.id), S(e.slug), S(e.status || "published"), "'en'", "1", S(data.title || ""), "datetime('now')", "datetime('now')"];
		for (const fs2 of fieldSlugs) {
			if (fs2 === "title") continue;
			cols.push(`"${fs2}"`);
			const v = data[fs2];
			vals.push(v === undefined ? "NULL" : (jsonFields.has(fs2) ? S(JSON.stringify(v)) : S(v)));
		}
		await d1(`INSERT OR REPLACE INTO ec_${col.slug} (${cols.join(",")}) VALUES (${vals.join(",")})`);
	}
	return entries.length;
}

async function main() {
	if (!TOKEN) throw new Error("CF_API_TOKEN required");
	const cols = (seed.collections || []).filter((c) => !SKIP.has(c.slug));
	for (const col of cols) {
		await pushCollection(col);
		const n = await pushEntries(col);
		console.log(`✓ ${col.slug}: ${col.fields.length} fields, ${n} entries`);
	}
	console.log(`Done. Pushed ${cols.length} collection(s).`);
}
main().catch((e) => { console.error("PUSH FAILED:", e.message); process.exit(1); });
