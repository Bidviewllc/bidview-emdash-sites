/**
 * Mirror the sold rows of `listing_archive` into an emdash `sold_listings`
 * collection (ec_sold_listings) so Grant can edit a past sale the same way he
 * edits a live listing: headline, description, Note From Grant (+ image, videos),
 * 3D tour, floor plans, Featured and Hidden. A sold listing is a case study, so
 * these fields matter more after the sale than before it.
 *
 * Same shape as mirror-listings.mjs. The MLS columns are reference only and are
 * refreshed from the archive on every run; the OWNER_FIELDS are the source of
 * truth the public site reads (src/lib/listings.ts archivedBySlug / soldByGrant)
 * and are never touched after the row exists. A new row seeds its owner fields
 * from `listing_archive.owner_snapshot`, so what Grant typed while the listing
 * was live carries over to its sold page.
 *
 * Which sales: every sold row the site shows (Grant on a side, or any sale at or
 * above SOLD_OTHERS_MIN_PRICE). Rows are never deleted: a sale stays editable.
 *
 * Idempotent. Run standalone to (re)build the collection, or import
 * { mirrorSoldListings } from a sync job. The Trestle sync has its own copy of
 * the row mirror (trestle-test/cf-worker/sync/sync.mjs mirrorEmdashSoldListings)
 * and runs it after every pull, so this script only needs to run by hand when
 * a field is added or renamed.
 *
 * Run:  GCM_D1_TOKEN=<token> node seed/mirror-sold-listings.mjs
 */
const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
const CF_DB      = process.env.CF_D1_DATABASE_ID || "614044b7-3e0c-41ee-ac78-7805cbab6d99";
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;
// GCM_D1_TOKEN, not CF_API_TOKEN (see mirror-listings.mjs: CF_API_TOKEN in .env
// breaks every wrangler deploy from this folder).
const TOKEN = process.env.GCM_D1_TOKEN || process.env.CF_API_TOKEN || process.env.TOKEN;

// Grant's MLS agent id and the price floor for other agents' sales. Keep in step
// with src/lib/listings.ts (GRANT_AGENT_ID, SOLD_OTHERS_MIN_PRICE) and sync.mjs.
export const GRANT_AGENT_ID = "meyergra111";
export const SOLD_OTHERS_MIN_PRICE = 5_000_000;

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

// Plain MLS remarks -> Portable Text JSON, same as mirror-listings.mjs.
function plainToPortableText(plain) {
	const text = (plain ?? "").toString();
	const paras = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
	const list = paras.length ? paras : (text.trim() ? [text.trim()] : []);
	return JSON.stringify(list.map((p, i) => ({
		_type: "block", _key: "b" + i, style: "normal", markDefs: [],
		children: [{ _type: "span", _key: "s" + i, text: p, marks: [] }],
	})));
}
// Field types, identical to the live Listings collection so the two admin forms
// behave the same.
const FIELD_TYPE = (slug) => {
	if (slug === "description") return ["portableText", "json"];
	if (slug === "featured" || slug === "hidden") return ["boolean", "text"];
	if (slug.endsWith("_image")) return ["image", "json"];
	if (slug === "owner_note") return ["text", "text"];
	if (slug === "note_videos" || slug === "floor_plan_embed") return ["text", "text"];
	if (slug === "floor_plan_images") return ["repeater", "json"];
	return ["string", "text"];
};
const FIELD_VALIDATION = {
	floor_plan_images: {
		subFields: [
			{ slug: "label", type: "string", label: "Name (e.g. Main level, Upper level)" },
			{ slug: "image", type: "image", label: "Floor plan image", required: true },
		],
		maxItems: 12,
	},
};

// MLS_FIELDS: refreshed from listing_archive on every run (editing them in the
// admin is overwritten). The sale facts come first so the admin list reads well.
export const MLS_FIELDS = [
	["sold_price", "Sold Price"], ["close_date", "Closed"], ["represented", "Grant represented"],
	["city", "City"], ["state", "State"], ["zip", "ZIP"],
	["beds", "Beds"], ["baths", "Baths"], ["sqft", "Sq Ft"],
	["lot_acres", "Lot (acres)"], ["year_built", "Year Built"],
	["property_type", "Property Type"], ["view", "View"],
	["photo", "Primary Photo (the one photo kept after the sale)"],
	["listing_date", "Date Listed"], ["list_price", "List Price"],
	["mls_number", "MLS #"], ["tour_url_mls", "3D Tour link from the MLS, for reference only"],
];
// OWNER_FIELDS: Grant's, preserved across every run. Same list as the live
// collection (mirror-listings.mjs OWNER_FIELDS) with sold-page wording.
export const OWNER_FIELDS = [
	["featured", "Featured sale (leads the Recently Sold page)"],
	["hidden", "Hide from Recently Sold (off the page and the sitemap; the sale's page still opens by direct link)"],
	["headline", "Property Headline (leave empty to use the street address)"],
	["description", "Description (editable — the story of this sale; starts as the MLS remarks)"],
	["owner_note", "Note From Grant — paragraph (shown publicly)"],
	["note_image", "Note From Grant — image"],
	["tour_url", "3D Tour URL, played right on the page (when empty, a Matterport link from the MLS is used; with neither, the section is hidden)"],
	["note_videos", "Note From Grant — video links, one per line (YouTube, Vimeo or an .mp4 link)"],
	["floor_plan_embed", "Interactive Floor Plan — paste the link or the embed code (section is hidden when empty)"],
	["floor_plan_images", "Floor Plan Images — add one per level (shown with, or instead of, the interactive plan)"],
];
export const FIELDS = [...MLS_FIELDS, ...OWNER_FIELDS];
// Admin form order: the owner's 3D Tour URL directly above the MLS tour link.
const ADMIN_ORDER = FIELDS.filter(([s]) => s !== "tour_url_mls")
	.flatMap((f) => f[0] === "tour_url" ? [f, FIELDS.find(([s]) => s === "tour_url_mls")] : [f]);
const NOW_SQL = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
const BASE_COLS = [
	["id", "text primary key"], ["slug", "text"], ["status", "text default 'draft'"],
	["author_id", "text"], ["primary_byline_id", "text"],
	["created_at", `text default ${NOW_SQL}`], ["updated_at", `text default ${NOW_SQL}`],
	["published_at", "text"], ["scheduled_at", "text"], ["deleted_at", "text"],
	["version", "integer default 1"], ["live_revision_id", "text"], ["draft_revision_id", "text"],
	["locale", "text default 'en' not null"], ["translation_group", "text"],
	["title", "text default '' not null"],
];

/** Which side(s) Grant was on, as the admin shows it. */
export function representedText(r) {
	const seller = r.list_agent_id === GRANT_AGENT_ID || r.co_list_agent_id === GRANT_AGENT_ID;
	const buyer = r.buyer_agent_id === GRANT_AGENT_ID || r.co_buyer_agent_id === GRANT_AGENT_ID;
	return seller && buyer ? "Both sides" : seller ? "The seller" : buyer ? "The buyer" : "—";
}
const money = (n) => n != null && n !== "" ? "$" + Number(n).toLocaleString("en-US") : null;

/** The SQL filter for the sold rows the site shows (and so the admin mirrors). */
export const SHOWN_SOLD_WHERE =
	`archive_status = 'sold' AND (list_agent_id = '${GRANT_AGENT_ID}' OR buyer_agent_id = '${GRANT_AGENT_ID}' ` +
	`OR co_list_agent_id = '${GRANT_AGENT_ID}' OR co_buyer_agent_id = '${GRANT_AGENT_ID}' OR close_price >= ${SOLD_OTHERS_MIN_PRICE})`;

/**
 * One archive row -> the VALUES tuple for ec_sold_listings. Owner columns come
 * from owner_snapshot (what Grant had on the live listing) and only matter on
 * INSERT; the ON CONFLICT clause never touches them.
 */
export function soldTuple(r, now) {
	let snap = {};
	try { snap = r.owner_snapshot ? JSON.parse(r.owner_snapshot) : {}; } catch { snap = {}; }
	const clean = (v) => { const s = (v ?? "").toString().trim(); return s === "" ? null : s; };
	const propType = (r.sub_type || r.type || "").replace(/([a-z])([A-Z])/g, "$1 $2");
	const mlsPT = plainToPortableText(r.description);
	const snapDesc = clean(snap.description);
	const description = snapDesc ? (snapDesc.startsWith("[") ? snapDesc : plainToPortableText(snapDesc)) : mlsPT;
	const vals = [
		S(r.id), S(r.slug || `sold-${r.id}`), "'published'", "'en'", "1",
		S(r.address || "(no address)"), S(now), S(now),
		// MLS_FIELDS, in order
		S(money(r.close_price ?? r.price)), S(r.close_date), S(representedText(r)),
		S(r.city), S(r.state), S(r.zip),
		S(r.beds), S(r.baths), S(r.sqft != null ? Number(r.sqft).toLocaleString("en-US") : null),
		S(r.lot_acres), S(r.year_built), S(propType || null), S(r.view),
		S(r.main_photo_url || r.photo || null),
		S(r.listing_date), S(money(r.price)),
		S(r.mls_number), S(r.tour_url_mls),
		// OWNER_FIELDS, in order (insert only)
		S(clean(snap.featured)), S(clean(snap.hidden)), S(clean(snap.headline)), S(description),
		S(clean(snap.owner_note)), S(clean(snap.note_image)), S(clean(snap.tour_url)), S(clean(snap.note_videos)),
		S(clean(snap.floor_plan_embed)), S(clean(snap.floor_plan_images)),
		// _mls_description snapshot
		S(mlsPT),
	];
	return `(${vals.join(",")})`;
}
export const INSERT_COLS = ["id", "slug", "status", "locale", "version", "title", "published_at", "updated_at",
	...FIELDS.map(([s]) => `"${s}"`), '"_mls_description"'];
export const UPDATE_SET = ["slug", "title", "updated_at", ...MLS_FIELDS.map(([s]) => s), "_mls_description"]
	.map((c) => `"${c}"=excluded."${c}"`).join(",");

export async function mirrorSoldListings(log = console.log) {
	// 1) collection + fields (backend-only: no url_pattern; the site's /homes/:slug
	//    route renders the public page from listing_archive + this table).
	const cid = "col_sold_listings";
	await d1(`INSERT INTO _emdash_collections (id,slug,label,label_singular,supports,source,has_seo,url_pattern,created_at,updated_at) VALUES ('${cid}','sold_listings','Sold Listings','Sold Listing','["revisions"]','manual',0,NULL,${NOW_SQL},${NOW_SQL}) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, label=excluded.label, label_singular=excluded.label_singular, supports=excluded.supports, source=excluded.source, has_seo=excluded.has_seo, url_pattern=excluded.url_pattern, updated_at=excluded.updated_at`);
	await d1(`DELETE FROM _emdash_fields WHERE collection_id='${cid}'`);
	await d1(`INSERT OR REPLACE INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,sort_order,searchable) VALUES ('fld_sold_listings_title','${cid}','title','Address','string','TEXT',1,0,1)`);
	let order = 1;
	for (const [slug, label] of ADMIN_ORDER) {
		const [ftype, fcol] = FIELD_TYPE(slug);
		const validation = FIELD_VALIDATION[slug] ? S(JSON.stringify(FIELD_VALIDATION[slug])) : "NULL";
		await d1(`INSERT OR REPLACE INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,sort_order,searchable,validation) VALUES ('fld_sold_listings_${slug}','${cid}','${slug}',${S(label)},'${ftype}','${fcol}',0,${order++},${slug === "city" || slug === "close_date" ? 1 : 0},${validation})`);
	}
	const cols = [...BASE_COLS.map(([n, t]) => `"${n}" ${t}`), ...FIELDS.map(([s]) => `"${s}" text`)];
	await d1(`CREATE TABLE IF NOT EXISTS ec_sold_listings (${cols.join(", ")}, constraint "ec_sold_listings_slug_locale_unique" unique ("slug","locale"))`);
	for (const [s] of FIELDS) { try { await d1(`ALTER TABLE ec_sold_listings ADD COLUMN "${s}" text`); } catch { /* exists */ } }
	try { await d1(`ALTER TABLE ec_sold_listings ADD COLUMN "_mls_description" text`); } catch { /* exists */ }

	// 2) the sold rows the site shows
	const lr = await d1(`SELECT * FROM listing_archive WHERE ${SHOWN_SOLD_WHERE}`);
	const rows = lr[0]?.results ?? [];

	// 3) upsert: MLS columns refresh, owner columns are only ever inserted.
	const head = `INSERT INTO ec_sold_listings (${INSERT_COLS.join(",")}) VALUES `;
	const tail = ` ON CONFLICT(id) DO UPDATE SET ${UPDATE_SET}`;
	let batch = [], sqlLen = head.length + tail.length;
	const flush = async () => { if (batch.length) { await d1(head + batch.join(",") + tail); batch = []; sqlLen = head.length + tail.length; } };
	const now = new Date().toISOString();
	for (const r of rows) {
		const tuple = soldTuple(r, now);
		if (sqlLen + tuple.length + 1 > 90000 || batch.length >= 40) await flush();
		batch.push(tuple); sqlLen += tuple.length + 1;
	}
	await flush();
	log(`✓ mirrored ${rows.length} sold listings into ec_sold_listings (owner fields preserved)`);
	return rows.length;
}

// Standalone run
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("mirror-sold-listings.mjs")) {
	if (!TOKEN) { console.error("GCM_D1_TOKEN required"); process.exit(1); }
	mirrorSoldListings().then(() => console.log("done")).catch((e) => { console.error("MIRROR FAILED:", e.message); process.exit(1); });
}
