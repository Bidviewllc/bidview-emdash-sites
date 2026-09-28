/**
 * Register the `reviews` collection and import seed/reviews.json into it.
 *
 * Pick the target explicitly — there is no default:
 *   node seed/reviews.mjs --local    the miniflare D1 that `npm run dev` reads
 *   node seed/reviews.mjs --remote   the deployed gcm-homes-db (the live site's DB);
 *                                    needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
 *
 * Schema follows emdash's FIELD_TYPE_TO_COLUMN so the admin can save entries:
 *   string/text/select/url -> TEXT, integer/boolean -> INTEGER.
 * `title` is registered first (emdash's editor always submits it). The dedupe
 * key lives in `_external_id` — `_`-prefixed so emdash's validator skips it.
 *
 * Re-running is safe: text/rating/date/links are refreshed from the JSON (and
 * imported rows no longer in the JSON are removed), but
 * `featured` and `hidden` are only written when a review is first inserted, so
 * choices made in the admin survive every re-import.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TARGET = process.argv.includes("--remote") ? "--remote" : process.argv.includes("--local") ? "--local" : null;
if (!TARGET) {
	console.error("Pass --local or --remote.");
	process.exit(1);
}

const DB_NAME = "gcm-homes-db";
const COL = "reviews";
const CID = `col_${COL}`;
export const SOURCES = ["Google", "Zillow", "Realtor.com", "Yelp", "Experience.com", "Other"];

// slug, label, emdash type, column type, required, extra validation
const FIELDS = [
	["source", "Source", "select", "TEXT", 1, { options: SOURCES }],
	["rating", "Rating (1-5, blank = no stars given)", "integer", "INTEGER", 0, { min: 1, max: 5 }],
	["review_date", "Review date (YYYY-MM or YYYY)", "string", "TEXT", 0, null],
	["body", "Review text (verbatim)", "text", "TEXT", 1, null],
	["location", "Reviewer location", "string", "TEXT", 0, null],
	["source_url", "Link to the review", "url", "TEXT", 0, null],
	["featured", "Featured on the home page", "boolean", "INTEGER", 0, null],
	["hidden", "Hidden", "boolean", "INTEGER", 0, null],
];

const BASE_COLS = [
	["id", "text primary key"], ["slug", "text"], ["status", "text default 'draft'"],
	["author_id", "text"], ["primary_byline_id", "text"],
	["created_at", "text default (datetime('now'))"], ["updated_at", "text default (datetime('now'))"],
	["published_at", "text"], ["scheduled_at", "text"], ["deleted_at", "text"],
	["version", "integer default 1"], ["live_revision_id", "text"], ["draft_revision_id", "text"],
	["locale", "text default 'en' not null"], ["translation_group", "text"],
	["title", "text default '' not null"],
];

const S = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const B = (v) => (v ? 1 : 0);

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = (args) =>
	execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["wrangler", "d1", "execute", DB_NAME, TARGET, ...args], {
		cwd, encoding: "utf8", shell: process.platform === "win32", maxBuffer: 1 << 26,
	});

// Existing ec_reviews columns (empty on first run).
let existing = new Set();
try {
	const out = wrangler(["--json", "--command", `PRAGMA table_info(ec_${COL})`]);
	const json = JSON.parse(out.slice(out.indexOf("[")));
	existing = new Set((json[0]?.results || []).map((r) => r.name));
} catch { /* first run */ }

const data = JSON.parse(fs.readFileSync(new URL("./reviews.json", import.meta.url), "utf8"));
const reviews = data.reviews || [];

// Validate before touching the DB.
const seen = new Set();
for (const r of reviews) {
	if (!r.external_id || seen.has(r.external_id)) throw new Error(`missing/duplicate external_id: ${r.external_id}`);
	seen.add(r.external_id);
	if (!SOURCES.includes(r.source)) throw new Error(`${r.external_id}: unknown source "${r.source}"`);
	if (r.rating !== null && !(Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5)) throw new Error(`${r.external_id}: bad rating`);
	if (r.review_date && !/^\d{4}(-\d{2})?$/.test(r.review_date)) throw new Error(`${r.external_id}: review_date must be YYYY-MM or YYYY`);
	if (!r.name || !r.body) throw new Error(`${r.external_id}: name and body are required`);
}

const sql = [];
sql.push(`INSERT OR REPLACE INTO _emdash_collections (id,slug,label,label_singular,supports,source,has_seo,url_pattern,created_at,updated_at) VALUES (${S(CID)},${S(COL)},'Reviews','Review','["revisions"]','manual',0,NULL,datetime('now'),datetime('now'));`);
sql.push(`DELETE FROM _emdash_fields WHERE collection_id=${S(CID)};`);
sql.push(`INSERT INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,sort_order,searchable) VALUES (${S(`fld_${COL}_title`)},${S(CID)},'title','Reviewer name','string','TEXT',1,0,1);`);
FIELDS.forEach(([slug, label, type, colType, req, validation], i) => {
	sql.push(`INSERT INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,validation,sort_order,searchable) VALUES (${S(`fld_${COL}_${slug}`)},${S(CID)},${S(slug)},${S(label)},${S(type)},${S(colType)},${req},${S(validation ? JSON.stringify(validation) : null)},${i + 1},${slug === "body" ? 1 : 0});`);
});

const allCols = [...BASE_COLS, ...FIELDS.map(([slug, , , colType]) => [slug, colType]), ["_external_id", "text"]];
if (existing.size === 0) {
	sql.push(`CREATE TABLE IF NOT EXISTS ec_${COL} (${allCols.map(([n, t]) => `"${n}" ${t}`).join(", ")}, constraint "ec_${COL}_slug_locale_unique" unique ("slug","locale"));`);
} else {
	for (const [n, t] of allCols) if (!existing.has(n)) sql.push(`ALTER TABLE ec_${COL} ADD COLUMN "${n}" ${t};`);
}

for (const r of reviews) {
	const id = `rev_${r.external_id}`;
	sql.push(
		`INSERT INTO ec_${COL} (id,slug,status,locale,version,title,published_at,updated_at,source,rating,review_date,body,location,source_url,featured,hidden,_external_id) ` +
		`VALUES (${S(id)},${S(r.external_id)},'published','en',1,${S(r.name)},datetime('now'),datetime('now'),${S(r.source)},${S(r.rating ?? null)},${S(r.review_date || null)},${S(r.body)},${S(r.location || null)},${S(r.source_url || null)},${B(r.featured)},${B(r.hidden)},${S(r.external_id)}) ` +
		`ON CONFLICT(id) DO UPDATE SET title=excluded.title, source=excluded.source, rating=excluded.rating, review_date=excluded.review_date, body=excluded.body, location=excluded.location, source_url=excluded.source_url, updated_at=datetime('now');`
	);
}

// Drop IMPORTED reviews that are no longer in reviews.json (e.g. removed as a
// cross-site duplicate). Reviews created by hand in the admin have no
// _external_id, so they are never touched.
sql.push(`DELETE FROM ec_${COL} WHERE _external_id IS NOT NULL AND _external_id NOT IN (${reviews.map((r) => S(r.external_id)).join(",")});`);

const file = path.join(os.tmpdir(), `gcm-reviews-${Date.now()}.sql`);
fs.writeFileSync(file, sql.join("\n") + "\n");
try {
	wrangler(["--file", file]);
} finally {
	fs.rmSync(file, { force: true });
}
console.log(`✓ reviews: collection registered (${FIELDS.length + 1} fields), ${reviews.length} reviews upserted into ${TARGET === "--remote" ? "REMOTE" : "LOCAL"} ${DB_NAME}`);
