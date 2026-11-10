/**
 * One admin "Listings" row per HOME (parcel number), shared by the seed scripts.
 *
 * PROPERTY-PAGES-PLAN.md (Liz, 2026-11-06): the MLS gives every relist a new
 * listing number, so the site used to make a new page per listing. Now:
 *   - `ec_listings` holds one row per home, id `p-<parcel>`, never deleted;
 *   - its MLS columns and `home_status` follow the home's CURRENT listing (the
 *     live one if any, else the newest by contract date);
 *   - Grant's columns are his and are never touched after the row exists, except
 *     `show_grant`, which resets to its default (on when Grant is the listing
 *     agent, else off) each time a NEW listing number starts on the home. The
 *     fields the switch hides stay saved; only the switch moves.
 *   - `property_slugs` maps every URL ever used (per-listing slugs, misspellings)
 *     to its home, for 301s. A home's own slug is chosen once and never changes.
 *
 * The Trestle sync (trestle-test/cf-worker/sync/sync.mjs, mirrorEmdashHomes) has
 * ITS OWN COPY of mirrorHomes(): GitHub Actions checks out only trestle-test, so
 * the sync cannot import this file. Change one, change both.
 *
 * Every function takes `d1(sql)` => [{ results }], so the same code runs against
 * the live D1 (REST) and a local SQLite copy (seed/migrate-homes.mjs --local).
 */

export const GRANT_AGENT_ID = "meyergra111";
// The MLS writes the same parcel two ways across the years ("130-191-07" and
// "13019107"; 7 homes in the archive had both, 2026-11-09), so homes are keyed
// by the parcel with its punctuation stripped: id `p-13019107`. The SQL twin
// (for joins from `listings`) is PARCEL_SQL.
// A Washoe APN is 8 digits; one listing in 200 writes it with a "-000" suffix
// (130-202-15-000 for 130-202-15), which is dropped. Douglas County APNs are
// 12 digits and are left alone. Multi-parcel listings ("123-131-04,05,06") keep
// their whole string: they are one home each as far as the MLS is concerned.
export const normParcel = (s) => { const n = String(s ?? "").replace(/[^0-9a-zA-Z]/g, ""); return n.length === 11 && n.endsWith("000") ? n.slice(0, 8) : n; };
export const PARCEL_SQL = (col) => { const x = `replace(replace(replace(${col},'-',''),' ',''),'.','')`; return `CASE WHEN length(${x}) = 11 AND ${x} LIKE '%000' THEN substr(${x},1,8) ELSE ${x} END`; };
export const HOME_STATUSES = ["On market", "Under contract", "Pending", "Sold", "Off market"];
export const COLLECTION_ID = "col_listings";

// ── Field registration ────────────────────────────────────────────────────────
// EmDash 1.4 has no field groups, so every label starts with its group number and
// the form reads in blocks. Fields are registered in this order (sort_order).
// Group 4 is the short list of MLS facts kept ON the row (list columns, the
// sold-page card); the other ~25 MLS facts live in the "From the MLS" editor
// panel (src/plugins/gcm-admin), read from listing_archive, so they no longer
// need columns here.
export const OWNER_FIELDS = [
	// Short on purpose: a list column (see LIST COLUMN LABELS below). It shows his
	// headline, description, Note From Grant, 3D tour and floor plans on the page;
	// on by default when Grant is the listing agent, off everywhere else, and it
	// resets when a new listing starts on the home.
	["show_grant", "boolean", "Show Grant's content"],
	["featured", "boolean", "1. Status — Featured listing (home page + community page)"],
	["hidden", "boolean", "1. Status — Hide from search (off every list, search and the sitemap; the page still opens by direct link)"],
	["headline", "string", "2. Grant's content — Property headline (leave empty to use the street address)"],
	["description", "portableText", "2. Grant's content — Description (starts as the MLS remarks; once edited, it is kept)"],
	["owner_note", "text", "2. Grant's content — Note from Grant: Paragraph (shown publicly)"],
	["note_image", "image", "2. Grant's content — Note from Grant: Image"],
	["note_videos", "text", "2. Grant's content — Note from Grant: Video links, one per line (YouTube, Vimeo or an .mp4 link)"],
	["tour_url", "string", "3. Tours and floor plans — 3D Tour URL, played on the listing page (when empty, a Matterport link from the MLS is used; with neither, the section is hidden)"],
	["floor_plan_embed", "text", "3. Tours and floor plans — Interactive floor plan: paste the link or the embed code (section hidden when empty)"],
	["floor_plan_images", "repeater", "3. Tours and floor plans — Floor plan images, one per level (shown with, or instead of, the interactive plan)"],
];
// Written by the sync from the home's current listing; editing them in the admin
// is overwritten on the next run.
// LIST COLUMN LABELS (2026-11-09, Liz). The admin list prints a field's whole
// label as its column header and never wraps it, so the four list columns
// (ADMIN_CONFIG.listColumns) and the searchable agent field carry short labels.
// How to filter the list is told to whoever uses it, not written in a label:
// type a status (On market, Under contract, Pending, Sold, Off market), a city
// or an agent's or brokerage's name in the search box above the list.
export const STATUS_FIELD = ["home_status", "select", "MLS status"];
export const MLS_FIELDS = [
	["price", "string", "List price"],
	["sold_price", "string", "4. From the MLS — Sold price (Sold homes)"],
	["close_date", "string", "4. From the MLS — Closed (Sold homes)"],
	["represented", "string", "4. From the MLS — Grant represented (Sold homes)"],
	["city", "string", "City"],
	// "Agent name, Brokerage" of the home's current listing; searchable, so typing
	// "Grant" in the list's search box shows his listings and any other name shows
	// that agent's.
	["listing_agent", "string", "Listing agent"],
	["beds", "string", "4. From the MLS — Beds"],
	["baths", "string", "4. From the MLS — Baths"],
	["sqft", "string", "4. From the MLS — Sq Ft"],
	["mls_number", "string", "4. From the MLS — MLS #"],
	["listing_date", "string", "4. From the MLS — Date listed"],
	["photo", "string", "4. From the MLS — Primary photo URL"],
	["tour_url_mls", "string", "3. Tours and floor plans — 3D tour link from the MLS, for reference (refreshed by every sync). A Matterport link here already plays on the page"],
];
// Admin form order: status, the three switches, Grant's content, tours (owner
// tour URL, then the MLS tour link beside it, then floor plans), MLS facts.
export const ADMIN_ORDER = [
	STATUS_FIELD,
	...OWNER_FIELDS.slice(0, 9), // show_grant … tour_url
	MLS_FIELDS.find(([s]) => s === "tour_url_mls"),
	...OWNER_FIELDS.slice(9),    // floor_plan_embed, floor_plan_images
	...MLS_FIELDS.filter(([s]) => s !== "tour_url_mls"),
];
export const ALL_FIELDS = [STATUS_FIELD, ...OWNER_FIELDS, ...MLS_FIELDS];
// Columns on ec_listings that are NOT registered fields must be `_`-prefixed, or
// EmDash rejects every save ("unknown field on collection").
export const INTERNAL_COLS = ["_mls_description", "_current_listing"];
export const ADMIN_CONFIG = { listColumns: ["home_status", "city", "price", "show_grant"] };
export const SEARCHABLE = ["home_status", "city", "listing_agent"];

const COLUMN_TYPE = { portableText: "json", image: "json", repeater: "json" };
const FIELD_VALIDATION = {
	home_status: { options: HOME_STATUSES },
	floor_plan_images: {
		subFields: [
			{ slug: "label", type: "string", label: "Name (e.g. Main level, Upper level)" },
			{ slug: "image", type: "image", label: "Floor plan image", required: true },
		],
		maxItems: 12,
	},
};
export const NOW_SQL = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
export const S = (v) => v === null || v === undefined ? "NULL" : (typeof v === "number" ? (Number.isFinite(v) ? String(v) : "NULL") : "'" + String(v).replace(/'/g, "''") + "'");

const BASE_COLS = [
	["id", "text primary key"], ["slug", "text"], ["status", "text default 'draft'"],
	["author_id", "text"], ["primary_byline_id", "text"],
	["created_at", `text default ${NOW_SQL}`], ["updated_at", `text default ${NOW_SQL}`],
	["published_at", "text"], ["scheduled_at", "text"], ["deleted_at", "text"],
	["version", "integer default 1"], ["live_revision_id", "text"], ["draft_revision_id", "text"],
	["locale", "text default 'en' not null"], ["translation_group", "text"],
	["title", "text default '' not null"],
];

/** Register the `listings` collection, its fields, list columns and table. Idempotent. */
export async function registerListingsCollection(d1, log = console.log) {
	const cid = COLLECTION_ID;
	// Upsert, never INSERT OR REPLACE: REPLACE resets the admin-set columns (hidden,
	// routable, sort_order, nav_group) and cascades into _emdash_fields.
	await d1(`INSERT INTO _emdash_collections (id,slug,label,label_singular,supports,source,has_seo,url_pattern,admin_config,created_at,updated_at) VALUES ('${cid}','listings','Listings','Listing','["revisions"]','manual',0,NULL,${S(JSON.stringify(ADMIN_CONFIG))},${NOW_SQL},${NOW_SQL}) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, label=excluded.label, label_singular=excluded.label_singular, supports=excluded.supports, source=excluded.source, has_seo=excluded.has_seo, url_pattern=excluded.url_pattern, admin_config=excluded.admin_config, updated_at=excluded.updated_at`);
	await d1(`DELETE FROM _emdash_fields WHERE collection_id='${cid}'`);
	// title first: EmDash's editor always submits it, so it must be a known field.
	await d1(`INSERT OR REPLACE INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,sort_order,searchable,indexed) VALUES ('fld_listings_title','${cid}','title','Address','string','TEXT',1,0,1,0)`);
	let order = 1;
	for (const [slug, type, label] of ADMIN_ORDER) {
		const validation = FIELD_VALIDATION[slug] ? S(JSON.stringify(FIELD_VALIDATION[slug])) : "NULL";
		// home_status is searchable (the admin search box is the list filter) and
		// indexed (so the API's fieldFilters can use it); city and the listing
		// agent are searchable too.
		const searchable = SEARCHABLE.includes(slug) ? 1 : 0;
		const indexed = slug === "home_status" ? 1 : 0;
		await d1(`INSERT OR REPLACE INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,sort_order,searchable,indexed,validation) VALUES ('fld_listings_${slug}','${cid}','${slug}',${S(label)},'${type}','${COLUMN_TYPE[type] || "text"}',0,${order++},${searchable},${indexed},${validation})`);
	}
	const cols = [...BASE_COLS.map(([n, t]) => `"${n}" ${t}`), ...ALL_FIELDS.map(([s]) => `"${s}" text`), ...INTERNAL_COLS.map((c) => `"${c}" text`)];
	await d1(`CREATE TABLE IF NOT EXISTS ec_listings (${cols.join(", ")}, constraint "ec_listings_slug_locale_unique" unique ("slug","locale"))`);
	for (const c of [...ALL_FIELDS.map(([s]) => s), ...INTERNAL_COLS]) {
		try { await d1(`ALTER TABLE ec_listings ADD COLUMN "${c}" text`); } catch { /* exists */ }
	}
	await d1("CREATE TABLE IF NOT EXISTS property_slugs (slug TEXT PRIMARY KEY, property_id TEXT NOT NULL, created_at TEXT)");
	await d1("CREATE INDEX IF NOT EXISTS idx_property_slugs_home ON property_slugs(property_id)");
	log(`listings collection registered: ${ADMIN_ORDER.length + 1} fields, list columns ${ADMIN_CONFIG.listColumns.join(", ")}`);
}

// ── The home mirror (same code as mirrorEmdashHomes in sync.mjs) ──────────────
export const slugify = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
export function plainToPortableText(plain) {
	const text = (plain ?? "").toString();
	const paras = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
	const list = paras.length ? paras : (text.trim() ? [text.trim()] : []);
	return JSON.stringify(list.map((p, i) => ({ _type: "block", _key: "b" + i, style: "normal", markDefs: [], children: [{ _type: "span", _key: "s" + i, text: p, marks: [] }] })));
}
const money = (n) => n != null && n !== "" ? "$" + Number(n).toLocaleString("en-US") : null;
export function homeStatusOf(a) {
	switch (a.archive_status) {
		case "active": return "On market";
		case "under_contract": return a.feed_status === "Pending" ? "Pending" : "Under contract";
		case "sold": return "Sold";
		default: return "Off market";
	}
}
export const grantListsIt = (a) => a.list_agent_id === GRANT_AGENT_ID || a.co_list_agent_id === GRANT_AGENT_ID;
export function representedText(a) {
	const seller = grantListsIt(a);
	const buyer = a.buyer_agent_id === GRANT_AGENT_ID || a.co_buyer_agent_id === GRANT_AGENT_ID;
	return seller && buyer ? "Both sides" : seller ? "The seller" : buyer ? "The buyer" : null;
}
// The home's current listing: a live one wins; otherwise the newest contract date.
export function newestFirst(x, y) {
	const live = (a) => a.archive_status === "active" || a.archive_status === "under_contract" ? 1 : 0;
	return (live(y) - live(x)) || String(y.listing_date || "").localeCompare(String(x.listing_date || ""))
		|| String(y.first_seen_at || "").localeCompare(String(x.first_seen_at || "")) || String(y.id).localeCompare(String(x.id));
}
export const homeBaseSlug = (a) => `${slugify(a.city) || "lake-tahoe"}-${slugify(a.state) || "nv"}/${slugify(a.address) || "home"}`;
export const bathsOf = (a) => a.baths_full == null || a.baths_full === "" ? (a.baths ?? null) : Number(a.baths_full) + 0.5 * Number(a.baths_half || 0);
export const ARCHIVE_HOME_COLS = "id, slug, address, city, state, price, beds, baths, baths_full, baths_half, sqft, photo, main_photo_url, listing_date, mls_number, tour_url_mls, agent, office, list_agent_id, co_list_agent_id, buyer_agent_id, co_buyer_agent_id, close_price, close_date, archive_status, feed_status, first_seen_at, parcel_number";

/** Group archive rows by parcel; each group sorted newest first. */
export function homesFrom(archiveRows) {
	const byParcel = new Map();
	for (const a of archiveRows) {
		const key = normParcel(a.parcel_number);
		if (!key || a.archive_status === "unknown") continue;
		if (!byParcel.has(key)) byParcel.set(key, []);
		byParcel.get(key).push(a);
	}
	for (const rows of byParcel.values()) rows.sort(newestFirst);
	return byParcel;
}

/** The MLS-side VALUES for one home row, from its current listing `a`. */
/** "Agent name, Brokerage" for the admin's searchable Listing agent field. */
export const listingAgentText = (a) => {
	const who = [a.agent, a.office].map((x) => (x || "").trim()).filter(Boolean).join(", ");
	// Grant as co-listing agent only: his name is not in `agent`, so add it.
	return grantListsIt(a) && !/grant meyer/i.test(who) ? [who, "Grant Meyer (co-listing agent)"].filter(Boolean).join(" · ") : (who || null);
};
export function homeMlsValues(a, remarks, now) {
	const sold = a.archive_status === "sold";
	return {
		title: a.address || "(no address)",
		home_status: homeStatusOf(a),
		price: money(a.price), sold_price: sold ? money(a.close_price) : null, close_date: sold ? (a.close_date || null) : null,
		represented: sold ? representedText(a) : null,
		city: a.city || null, listing_agent: listingAgentText(a), beds: a.beds ?? null, baths: bathsOf(a),
		sqft: a.sqft != null ? Number(a.sqft).toLocaleString("en-US") : null,
		mls_number: a.mls_number || null, listing_date: a.listing_date || null,
		photo: a.main_photo_url || a.photo || null, tour_url_mls: a.tour_url_mls || null,
		_mls_description: plainToPortableText(remarks), updated_at: now,
	};
}
export const MLS_SET_COLS = ["title", "home_status", ...MLS_FIELDS.map(([s]) => s), "_mls_description", "updated_at"];
export const OWNER_COLS = ["headline", "description", "owner_note", "note_image", "tour_url", "note_videos", "floor_plan_embed", "floor_plan_images", "featured", "hidden", "show_grant"];

/**
 * Write one ec_listings row per home from listing_archive. Insert-only for
 * Grant's columns; MLS columns refresh; show_grant resets on a new listing number.
 * Refuses to run while rows keyed by listing number remain (migrate first).
 */
export async function mirrorHomes(d1, log = console.log) {
	const legacy = (await d1("SELECT count(*) n FROM ec_listings WHERE id NOT LIKE 'p-%'"))?.[0]?.results?.[0]?.n ?? 0;
	if (legacy > 0) throw new Error(`ec_listings still holds ${legacy} row(s) keyed by listing number; run emdash/seed/migrate-homes.mjs first`);
	await d1("CREATE TABLE IF NOT EXISTS property_slugs (slug TEXT PRIMARY KEY, property_id TEXT NOT NULL, created_at TEXT)");
	const ar = await d1(`SELECT ${ARCHIVE_HOME_COLS} FROM listing_archive WHERE parcel_number IS NOT NULL AND parcel_number <> '' AND archive_status <> 'unknown'`);
	const homes = homesFrom(ar?.[0]?.results ?? []);
	if (!homes.size) { log("home mirror: no archive rows with a parcel yet"); return 0; }
	const ex = await d1(`SELECT id, slug, "_current_listing" AS cur FROM ec_listings`);
	const existing = new Map((ex?.[0]?.results ?? []).map((r) => [r.id, r]));
	const taken = new Set([...existing.values()].map((r) => r.slug));
	// MLS remarks only for the current listings (descriptions are the bulk of a row).
	const currentIds = [...homes.values()].map((rows) => rows[0].id);
	const remarks = {};
	for (let i = 0; i < currentIds.length; i += 100) {
		const r = await d1(`SELECT id, description FROM listing_archive WHERE id IN (${currentIds.slice(i, i + 100).map(S).join(",")})`);
		for (const row of r?.[0]?.results ?? []) remarks[row.id] = row.description;
	}
	const now = new Date().toISOString();
	const insertCols = ["id", "slug", "status", "locale", "version", "published_at", "created_at", "description", "show_grant", "_current_listing", ...MLS_SET_COLS];
	const setClause = [
		...MLS_SET_COLS.map((c) => `"${c}"=excluded."${c}"`),
		// Unedited description keeps following the MLS; an edited one is Grant's.
		`"description"=CASE WHEN ec_listings."description" IS ec_listings."_mls_description" THEN excluded."description" ELSE ec_listings."description" END`,
		// The switch resets to its default only when the listing number changes.
		`"show_grant"=CASE WHEN ec_listings."_current_listing" IS excluded."_current_listing" THEN ec_listings."show_grant" ELSE excluded."show_grant" END`,
		`"_current_listing"=excluded."_current_listing"`,
	].join(",");
	const head = `INSERT INTO ec_listings (${insertCols.map((c) => `"${c}"`).join(",")}) VALUES `;
	const tail = ` ON CONFLICT(id) DO UPDATE SET ${setClause}`;
	let batch = [], len = head.length + tail.length, inserted = 0, switched = 0;
	const flush = async () => { if (batch.length) { await d1(head + batch.join(",") + tail); batch = []; len = head.length + tail.length; } };
	const slugRows = [];
	for (const [parcel, rows] of homes) {
		const cur = rows[0];
		const id = `p-${parcel}`;
		const was = existing.get(id);
		let slug = was?.slug;
		if (!slug) {
			slug = homeBaseSlug(cur);
			if (taken.has(slug)) slug = `${slug}-${parcel.toLowerCase() || "2"}`;
			taken.add(slug);
			inserted++;
		} else if (was.cur && was.cur !== cur.id) {
			// A new listing number started on this home: keep what Grant had typed for
			// the old listing on its archive row (the admin's Listing history panel
			// shows it), then let the switch reset below.
			const o = (await d1(`SELECT ${OWNER_COLS.map((c) => `"${c}"`).join(",")}, "_mls_description" AS mls FROM ec_listings WHERE id=${S(id)}`))?.[0]?.results?.[0];
			if (o) {
				const snap = { ...Object.fromEntries(OWNER_COLS.map((c) => [c, o[c] ?? null])), taken_at: now, listing_key: was.cur };
				if (snap.description === o.mls) snap.description = null;
				await d1(`UPDATE listing_archive SET owner_snapshot=${S(JSON.stringify(snap))} WHERE id=${S(was.cur)}`);
			}
			switched++;
		}
		const m = homeMlsValues(cur, remarks[cur.id], now);
		const vals = [S(id), S(slug), "'published'", "'en'", "1", S(now), S(now), S(m._mls_description), S(grantListsIt(cur) ? "1.0" : "0.0"), S(cur.id), ...MLS_SET_COLS.map((c) => S(m[c]))];
		const tuple = `(${vals.join(",")})`;
		if (len + tuple.length + 1 > 90000 || batch.length >= 40) await flush();
		batch.push(tuple); len += tuple.length + 1;
		slugRows.push([slug, id]);
		for (const a of rows) if (a.slug) slugRows.push([a.slug, id]);
	}
	await flush();
	// Every URL ever used for a home answers with a 301 to the home's page.
	for (let i = 0; i < slugRows.length; i += 200) {
		const tuples = slugRows.slice(i, i + 200).map(([s, id]) => `(${S(s)},${S(id)},${S(now)})`).join(",");
		await d1(`INSERT OR IGNORE INTO property_slugs (slug, property_id, created_at) VALUES ${tuples}`);
	}
	log(`home mirror: ${homes.size} homes in ec_listings (${inserted} new, ${switched} switched to a new listing), ${slugRows.length} slugs mapped`);
	return homes.size;
}
