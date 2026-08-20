/**
 * Mirror the Trestle-synced `listings` table into an emdash `listings` collection
 * (ec_listings) so all properties are BROWSABLE in the admin backend.
 *
 * Design: listings are synced from the MLS and are the source of truth — they are
 * NOT hand-editable in the CMS (the next sync would overwrite). This collection is
 * a read-only mirror for visibility. The one owner-editable overlay is the
 * per-listing "Note From Grant" (listing_notes table + inline detail-page editor),
 * surfaced here as `owner_note` for reference.
 *
 * Idempotent. Run standalone to (re)build the mirror, or import { mirrorListings }
 * from a sync job to keep it fresh after each Trestle pull.
 *
 * Run:  CF_API_TOKEN=<cameron> node seed/mirror-listings.mjs
 */
const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
const CF_DB      = process.env.CF_D1_DATABASE_ID || "614044b7-3e0c-41ee-ac78-7805cbab6d99";
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
const TOKEN = process.env.CF_API_TOKEN || process.env.TOKEN;

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

// Plain MLS remarks -> Portable Text JSON (deterministic keys so description and the
// _mls_description snapshot are byte-identical for the "track until edited" compare).
// Mirrors src/lib/portabletext.ts plainToPortableText.
function plainToPortableText(plain) {
	const text = (plain ?? "").toString();
	const paras = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
	const list = paras.length ? paras : (text.trim() ? [text.trim()] : []);
	return JSON.stringify(list.map((p, i) => ({
		_type: "block", _key: "b" + i, style: "normal", markDefs: [],
		children: [{ _type: "span", _key: "s" + i, text: p, marks: [] }],
	})));
}
// emdash field type per slug: description is rich text (WYSIWYG); the rest are plain.
const FIELD_TYPE = (slug) => slug === "description" ? ["portableText", "json"] : ["string", "text"];

// MLS_FIELDS are refreshed from the feed on every sync (display/reference — editing
// them in admin is overwritten). OWNER_FIELDS are owner-authored and PRESERVED across
// every sync — they are the source of truth the public site reads. title=address +
// slug are base emdash columns.
const MLS_FIELDS = [
	["city", "City"], ["state", "State"], ["zip", "ZIP"],
	["price", "Price"], ["beds", "Beds"], ["baths", "Baths"], ["sqft", "Sq Ft"],
	["lot_acres", "Lot (acres)"], ["year_built", "Year Built"],
	["property_type", "Property Type"], ["mls_status", "MLS Status"], ["view", "View"],
	["photo", "Primary Photo"], ["dom", "Days on Market"],
	// Added 2026-08-19 (Liz's field request — MLS-authoritative, refreshed each sync):
	["flooring", "Flooring"], ["fireplaces", "Fireplaces"], ["fireplace_yn", "Fireplace (Y/N)"],
	["fireplace_features", "Fireplace Features"], ["roof", "Roof"], ["utilities", "Utilities"],
	["pool_features", "Pool Features"], ["listing_date", "Date Listed"], ["hoa_frequency", "HOA Frequency"],
	["tour_url_mls", "3D Tour (MLS)"], ["mls_number", "MLS #"], ["stories", "Stories"],
	["arch_style", "Architectural Style"], ["construction", "Construction"], ["lot_features", "Lot Features"],
	["condition", "Condition"], ["lot_sqft", "Lot (sq ft)"],
];
const OWNER_FIELDS = [
	["description", "Description (editable — overrides the MLS remarks)"],
	["owner_note", "Note From Grant (private)"],
];
const FIELDS = [...MLS_FIELDS, ...OWNER_FIELDS];
const BASE_COLS = [
	["id", "text primary key"], ["slug", "text"], ["status", "text default 'draft'"],
	["author_id", "text"], ["primary_byline_id", "text"],
	["created_at", "text default (datetime('now'))"], ["updated_at", "text default (datetime('now'))"],
	["published_at", "text"], ["scheduled_at", "text"], ["deleted_at", "text"],
	["version", "integer default 1"], ["live_revision_id", "text"], ["draft_revision_id", "text"],
	["locale", "text default 'en' not null"], ["translation_group", "text"],
	["title", "text default '' not null"],
];

export async function mirrorListings(log = console.log) {
	// 1) register the collection + fields (backend-only: no url_pattern, the site's
	//    own /homes/:slug route renders the public detail page).
	const cid = "col_listings";
	await d1(`INSERT OR REPLACE INTO _emdash_collections (id,slug,label,label_singular,supports,source,has_seo,url_pattern,created_at,updated_at) VALUES ('${cid}','listings','Listings','Listing','["revisions"]','manual',0,NULL,datetime('now'),datetime('now'))`);
	await d1(`DELETE FROM _emdash_fields WHERE collection_id='${cid}'`);
	// title first (base column) — required so emdash's editor/save recognizes it.
	await d1(`INSERT OR REPLACE INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,sort_order,searchable) VALUES ('fld_listings_title','${cid}','title','Address','string','TEXT',1,0,1)`);
	let order = 1;
	for (const [slug, label] of FIELDS) {
		const [ftype, fcol] = FIELD_TYPE(slug);
		await d1(`INSERT OR REPLACE INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,sort_order,searchable) VALUES ('fld_listings_${slug}','${cid}','${slug}',${S(label)},'${ftype}','${fcol}',0,${order++},${slug === "city" || slug === "property_type" ? 1 : 0})`);
	}
	const cols = [...BASE_COLS.map(([n, t]) => `"${n}" ${t}`), ...FIELDS.map(([s]) => `"${s}" text`)];
	await d1(`CREATE TABLE IF NOT EXISTS ec_listings (${cols.join(", ")}, constraint "ec_listings_slug_locale_unique" unique ("slug","locale"))`);
	for (const [s] of FIELDS) { try { await d1(`ALTER TABLE ec_listings ADD COLUMN "${s}" text`); } catch { /* exists */ } }
	// _mls_description = a hidden snapshot of the live MLS remarks (NOT a registered
	// editable field). It lets the sync "track until edited": while description still
	// equals the snapshot, it follows the feed; once edited, description is preserved.
	try { await d1(`ALTER TABLE ec_listings ADD COLUMN "_mls_description" text`); } catch { /* exists */ }

	// 2) read the synced listings (MLS source)
	const lr = await d1("SELECT * FROM listings");
	const rows = lr[0]?.results ?? [];

	// 3) UPSERT that PRESERVES owner edits. New listings insert with description +
	//    _mls_description = the MLS remarks (so the admin box is pre-filled). Existing
	//    listings: MLS columns + _mls_description always refresh; `description` follows
	//    the feed ONLY while it still equals the snapshot (unedited) — once the owner
	//    edits it, it's preserved. owner_note/status/version/revisions never touched.
	const insertCols = ["id", "slug", "status", "locale", "version", "title", "published_at", "updated_at", ...MLS_FIELDS.map(([s]) => `"${s}"`), "description", "_mls_description"];
	const trackedCols = ["slug", "title", "updated_at", ...MLS_FIELDS.map(([s]) => s), "_mls_description"];
	const setClause = [
		...trackedCols.map((c) => `"${c}"=excluded."${c}"`),
		`"description"=CASE WHEN ec_listings."description" IS ec_listings."_mls_description" THEN excluded."description" ELSE ec_listings."description" END`,
	].join(",");
	const head = `INSERT INTO ec_listings (${insertCols.join(",")}) VALUES `;
	const tail = ` ON CONFLICT(id) DO UPDATE SET ${setClause}`;
	let batch = [], sqlLen = head.length + tail.length;
	const flush = async () => { if (batch.length) { await d1(head + batch.join(",") + tail); batch = []; sqlLen = head.length + tail.length; } };
	for (const r of rows) {
		const propType = (r.sub_type || r.type || "").replace(/([a-z])([A-Z])/g, "$1 $2");
		const vals = [
			S(r.id), S(r.slug || `listing-${r.id}`), "'published'", "'en'", "1",
			S(r.address || "(no address)"), "datetime('now')", "datetime('now')",
			S(r.city), S(r.state), S(r.zip),
			S(r.price != null ? "$" + Number(r.price).toLocaleString("en-US") : null),
			S(r.beds), S(r.baths), S(r.sqft != null ? Number(r.sqft).toLocaleString("en-US") : null),
			S(r.lot_acres), S(r.year_built), S(propType || null), S(r.mls_status ?? r.status), S(r.view),
			S(r.photo), S(r.dom),
			S(r.flooring), S(r.fireplaces), S(r.fireplace_yn), S(r.fireplace_features), S(r.roof), S(r.utilities),
			S(r.pool_features), S(r.listing_date), S(r.hoa_frequency), S(r.tour_url_mls), S(r.mls_number), S(r.stories),
			S(r.arch_style), S(r.construction), S(r.lot_features), S(r.condition), S(r.lot_sqft),
			S(plainToPortableText(r.description)), S(plainToPortableText(r.description)),
		];
		const tuple = `(${vals.join(",")})`;
		if (sqlLen + tuple.length + 1 > 90000 || batch.length >= 40) await flush();
		batch.push(tuple); sqlLen += tuple.length + 1;
	}
	await flush();

	// 4) drop listings no longer in the feed (sold/expired) — but keep their owner
	//    edits out of the admin too. IDs are inlined (D1 param cap is 100).
	const ids = rows.map((r) => `'${String(r.id).replace(/'/g, "''")}'`);
	if (ids.length) await d1(`DELETE FROM ec_listings WHERE id NOT IN (${ids.join(",")})`);

	log(`✓ mirrored ${rows.length} listings into ec_listings (owner description/note preserved)`);
	return rows.length;
}

// Standalone run
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("mirror-listings.mjs")) {
	if (!TOKEN) { console.error("CF_API_TOKEN required"); process.exit(1); }
	mirrorListings().then(() => console.log("done")).catch((e) => { console.error("MIRROR FAILED:", e.message); process.exit(1); });
}
