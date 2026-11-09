/**
 * Grant C. Meyer Homes — Trestle → Cloudflare D1 sync (Path B).
 *
 * Runs on a NON-Cloudflare host (local box or Vercel Cron): pulls every active
 * listing + its photos from Trestle and replays them into D1. The Cloudflare
 * Worker then serves purely from D1 and never calls Trestle, so it never hits
 * Trestle's WAF (which 403s Cloudflare egress). Replication is contractually
 * allowed (Trestle product Intended Access Pattern → "Replication" checked).
 *
 * Run:  NODE_OPTIONS=--dns-result-order=ipv4first node sync/sync.mjs
 * Env (with sensible fallbacks for local runs):
 *   TRESTLE_CLIENT_ID / TRESTLE_CLIENT_SECRET
 *   CF_ACCOUNT_ID / CF_D1_DATABASE_ID / CF_API_TOKEN
 *   SYNC_MODE = "sync" (default) | "backfill-sold" | "backfill-history"
 *
 * 2026-11-03 — the sold / off-market ARCHIVE (sites/gcm-homes/SOLD-ARCHIVE-PLAN.md).
 *   Before this, every run deleted a listing the moment it left the active feed,
 *   together with Grant's edits on it. Now:
 *   1. The pull is Active + ActiveUnderContract + Pending (not Active only), so a
 *      home stays on the site when it goes under contract.
 *   2. Every fetched listing is upserted into `listing_archive`, a table nothing
 *      ever deletes from. `listings` / `listing_photos` are still replaced each run.
 *   3. Archive rows that were live last run but are missing from this pull get one
 *      follow-up query: Closed → `sold` (with close price/date and buyer side);
 *      anything else → `off_market` (expired/withdrawn/cancelled; the feed does
 *      not say which).
 *   4. The owner fields of each ec_listings row about to be deleted (headline,
 *      description, note, tour, featured, hidden) are copied into
 *      `listing_archive.owner_snapshot` first.
 *   5. SYNC_MODE=backfill-sold pulls Grant's closed sales (any side, back to 2011)
 *      plus every closed sale at or above SOLD_OTHERS_MIN_PRICE into the archive,
 *      with each one's MLS main photo URL. Run once; safe to re-run.
 *   Photos are NOT copied anywhere (Liz, 2026-11-03): sold rows keep the Trestle
 *   URL of their main photo. If those ever stop loading, copy them to R2 then.
 *
 * 2026-11-09 — ONE PAGE PER HOME (sites/gcm-homes/PROPERTY-PAGES-PLAN.md).
 *   The admin "Listings" collection (ec_listings) now holds one row per home,
 *   keyed by parcel number (`p-<parcel>`), never deleted; its MLS columns and
 *   `home_status` follow the home's current listing, Grant's columns are his,
 *   and `show_grant` resets when a new listing number starts. `listings` gained
 *   `parcel_number`; `property_slugs` maps every old URL to its home. The
 *   Sold Listings collection (ec_sold_listings) is retired: a sold home is the
 *   same row as its live listing was. See mirrorEmdashHomes() below.
 */

// Trestle credentials come from the environment only (never commit secrets).
// Local run: TRESTLE_CLIENT_ID=… TRESTLE_CLIENT_SECRET=… node sync/sync.mjs
// (values live in ~/.claude/credentials/trestle-api.md).
const TRESTLE_CLIENT_ID = process.env.TRESTLE_CLIENT_ID;
const TRESTLE_SECRET    = process.env.TRESTLE_CLIENT_SECRET;
if (!TRESTLE_CLIENT_ID || !TRESTLE_SECRET) throw new Error("Missing TRESTLE_CLIENT_ID / TRESTLE_CLIENT_SECRET env vars");
const TOKEN_URL  = "https://api.cotality.com/trestle/oidc/connect/token";
const ODATA_BASE = "https://api.cotality.com/trestle/odata";
const UA = "GrantCMeyerHomes-Sync/1.0";

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
const CF_DB      = process.env.CF_D1_DATABASE_ID || "614044b7-3e0c-41ee-ac78-7805cbab6d99";
const CF_TOKEN   = process.env.CF_API_TOKEN; // required
const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;

const FULL_SELECT = [
  "ListingKey", "UnparsedAddress", "StreetNumber", "StreetName", "StreetSuffix",
  "City", "StateOrProvince", "PostalCode", "ListPrice", "BedroomsTotal",
  "BathroomsTotalInteger", "BathroomsFull", "BathroomsHalf", "LivingArea",
  "LotSizeAcres", "YearBuilt", "GarageSpaces", "PropertyType", "PropertySubType",
  "StandardStatus", "Latitude", "Longitude", "View", "WaterfrontYN",
  "DaysOnMarket", "PhotosCount", "ListAgentFullName", "ListOfficeName",
  "TaxAnnualAmount", "AssociationFee", "Heating", "Cooling", "ParkingFeatures",
  "Appliances", "PublicRemarks", "ModificationTimestamp",
  // Added 2026-08-19 (Liz's field request — only fields the feed actually populates):
  "Flooring", "FireplacesTotal", "FireplaceYN", "FireplaceFeatures", "Roof",
  "Utilities", "PoolFeatures", "ListingContractDate", "AssociationFeeFrequency",
  "VirtualTourURLUnbranded", "ListingId", "Stories", "ArchitecturalStyle",
  "ConstructionMaterials", "LotFeatures", "PropertyCondition",
  // Added 2026-09-10: total days across relists. DaysOnMarket resets on a new
  // listing contract; this one does not. Both are frozen at ModificationTimestamp
  // in the feed — see toDetail() in emdash/src/lib/listings.ts for the live maths.
  "CumulativeDaysOnMarket",
  // Added 2026-09-21 (Liz's Features filter): the last well-populated feed fields
  // the listings search wants to filter on. Coverage measured on the live feed:
  // LaundryFeatures 77%, SecurityFeatures 53%, MainLevelBedrooms 37%,
  // AssociationAmenities 23%, SpaFeatures 19%, SpaYN 17%.
  "LaundryFeatures", "SecurityFeatures", "MainLevelBedrooms",
  "AssociationAmenities", "SpaFeatures", "SpaYN",
  // Added 2026-11-03 (sold archive): who was on each side, the parcel (relists get
  // a new ListingKey but keep the parcel), and the close/off-market facts. All
  // confirmed populated on Closed records in the 2026-09-25 probe.
  "ParcelNumber", "ListAgentMlsId", "BuyerAgentMlsId", "CoListAgentMlsId", "CoBuyerAgentMlsId",
  "BuyerAgentFullName", "BuyerOfficeName", "ClosePrice", "CloseDate", "OffMarketDate",
  "PurchaseContractDate",
  // Added 2026-11-09 (listing history on the listing page): the first asking price,
  // the price before the latest change and when it changed, and when the status
  // last changed. OriginalListPrice / StatusChangeTimestamp are on every record;
  // PreviousListPrice / PriceChangeTimestamp only once a price has changed (~45%).
  "OriginalListPrice", "PreviousListPrice", "PriceChangeTimestamp", "StatusChangeTimestamp",
].join(",");

// Grant's MLS agent id (ListAgentMlsId / BuyerAgentMlsId in the feed).
const GRANT_AGENT_ID = "meyergra111";
// Liz, 2026-11-03: the Recently Sold page shows Grant's own sales plus any closed
// sale at or above this price. The backfill pulls both sets.
const SOLD_OTHERS_MIN_PRICE = 5_000_000;
// What this run does: the normal sync, or the one-time sold backfill.
const SYNC_MODE = process.env.SYNC_MODE || "sync";
// Statuses the live pull keeps on the site. The MLS says "Contingent" for
// ActiveUnderContract; the site maps both to "Under contract".
const LIVE_STATUSES = ["Active", "ActiveUnderContract", "Pending"];

/* ---------------------------------------------------------------- helpers */
const flat = v => Array.isArray(v) ? v.filter(Boolean).join(", ") : v;
const slugify = s => (s || "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
function addressOf(l) {
  const u = (l.UnparsedAddress || "").trim();
  if (u) return u;
  return `${l.StreetNumber || ""} ${l.StreetName || ""} ${l.StreetSuffix || ""}`.replace(/\s+/g, " ").trim();
}
function categoryOf(l) {
  switch (l.PropertyType) {
    case "ResidentialLease":  return "For Lease";
    case "Land":              return "Land";
    case "CommercialSale":    return "Commercial";
    case "ResidentialIncome": return "Multi-Family";
  }
  switch (l.PropertySubType) {
    case "SingleFamilyResidence": return "Single Family";
    case "Condominium":           return "Condominium";
    case "MultiFamily":           return "Multi-Family";
    case "Commercial":            return "Commercial";
  }
  return "Other";
}

async function getToken() {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: TRESTLE_CLIENT_ID, client_secret: TRESTLE_SECRET, scope: "api" }),
  });
  if (!r.ok) throw new Error(`Token failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).access_token;
}
async function odata(token, url) {
  const r = await fetch(url.startsWith("http") ? url : `${ODATA_BASE}/${url}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": UA },
  });
  if (!r.ok) throw new Error(`OData failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Every page of one Property query. `maxPages` is a runaway guard, not a cap we
// expect to hit: the live pull is 1-2 pages, the sold backfill a few more.
async function fetchProperties(token, filter, select = FULL_SELECT, maxPages = 60) {
  const rows = [];
  let next = `Property?$filter=${encodeURIComponent(filter)}&$select=${select}&$top=200`;
  let guard = 0;
  while (next && guard++ < maxPages) {
    const page = await odata(token, next);
    rows.push(...(page.value || []));
    next = page["@odata.nextLink"] || null;
  }
  return rows;
}
// Everything the site should show as on the market: Active, under contract, pending.
async function fetchLive(token) {
  return fetchProperties(token, `StandardStatus in ('${LIVE_STATUSES.join("','")}')`);
}

async function fetchAllPhotos(token, keys) {
  // (key -> [{ord,url}]). Batch keys, paginate each batch's media.
  const byKey = {};
  for (let i = 0; i < keys.length; i += 25) {
    const batch = keys.slice(i, i + 25);
    const inList = batch.join("','");
    let next = `Media?$filter=${encodeURIComponent(`ResourceRecordKey in ('${inList}')`)}` +
               `&$select=ResourceRecordKey,MediaURL,Order&$orderby=ResourceRecordKey,Order&$top=500`;
    let guard = 0;
    while (next && guard++ < 40) {
      const page = await odata(token, next).catch(() => ({ value: [] }));
      for (const m of page.value || []) {
        if (!m.MediaURL) continue;
        (byKey[m.ResourceRecordKey] ||= []).push({ ord: m.Order ?? 0, url: m.MediaURL });
      }
      next = page["@odata.nextLink"] || null;
    }
  }
  return byKey;
}

/* --------------------------------------------------------------- D1 layer */
async function d1(sql, params) {
  const r = await fetch(D1_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(params ? { sql, params } : { sql }),
    signal: AbortSignal.timeout(60000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw new Error(`D1 error ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.result;
}
// D1 caps bound params at 100/query, so inline-escape values instead. Batch by
// row count AND by resulting SQL length (D1's SQL text cap is ~100KB/query).
function sqlVal(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}
/* ------------------------------------------------- admin: one row per HOME */
// Mirror the archive into the emdash `listings` collection (ec_listings) with
// ONE ROW PER HOME, keyed by parcel number (`p-<parcel>`), never deleted.
// PROPERTY-PAGES-PLAN.md (Liz, 2026-11-06). Rules:
//  - The MLS columns and `home_status` follow the home's CURRENT listing: the
//    live one if any, else the newest by contract date (On market / Under
//    contract / Pending / Sold / Off market).
//  - Grant's columns (headline, description, note, images, tours, floor plans,
//    featured, hidden) are only ever INSERTED; an unedited description still
//    tracks the MLS remarks (description IS _mls_description).
//  - `show_grant` resets to its default (on when Grant is the listing agent,
//    else off) only when a NEW listing number starts on the home; his content
//    stays saved, and what he had typed for the old listing is kept on that
//    listing's archive row (owner_snapshot) for the admin's history panel.
//  - `property_slugs` gets every slug ever used for the home, so old URLs 301.
// This is a COPY of mirrorHomes() in emdash/seed/lib/homes.mjs (GitHub Actions
// checks out only trestle-test, so the sync cannot import it). Change both.
const HOME_MLS_FIELDS = ["price","sold_price","close_date","represented","city","beds","baths","sqft","mls_number","listing_date","photo","tour_url_mls"];
const HOME_SET_COLS = ["title", "home_status", ...HOME_MLS_FIELDS, "_mls_description", "updated_at"];
const HOME_OWNER_COLS = ["headline", "description", "owner_note", "note_image", "tour_url", "note_videos", "floor_plan_embed", "floor_plan_images", "featured", "hidden", "show_grant"];
const ARCHIVE_HOME_COLS = "id, slug, address, city, state, price, beds, baths, baths_full, baths_half, sqft, photo, main_photo_url, listing_date, mls_number, tour_url_mls, list_agent_id, co_list_agent_id, buyer_agent_id, co_buyer_agent_id, close_price, close_date, archive_status, feed_status, first_seen_at, parcel_number";
// Plain MLS remarks -> Portable Text JSON (WYSIWYG storage), deterministic keys.
function ptFromPlain(plain) {
  const text = (plain ?? "").toString();
  const paras = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const list = paras.length ? paras : (text.trim() ? [text.trim()] : []);
  return JSON.stringify(list.map((p, i) => ({ _type: "block", _key: "b" + i, style: "normal", markDefs: [], children: [{ _type: "span", _key: "s" + i, text: p, marks: [] }] })));
}
const money = n => n != null && n !== "" ? "$" + Number(n).toLocaleString("en-US") : null;
function homeStatusOf(a) {
  switch (a.archive_status) {
    case "active": return "On market";
    case "under_contract": return a.feed_status === "Pending" ? "Pending" : "Under contract";
    case "sold": return "Sold";
    default: return "Off market";
  }
}
const grantListsIt = a => a.list_agent_id === GRANT_AGENT_ID || a.co_list_agent_id === GRANT_AGENT_ID;
function representedText(a) {
  const seller = grantListsIt(a);
  const buyer = a.buyer_agent_id === GRANT_AGENT_ID || a.co_buyer_agent_id === GRANT_AGENT_ID;
  return seller && buyer ? "Both sides" : seller ? "The seller" : buyer ? "The buyer" : null;
}
// The home's current listing: a live one wins; otherwise the newest contract date.
function newestFirst(x, y) {
  const live = a => a.archive_status === "active" || a.archive_status === "under_contract" ? 1 : 0;
  return (live(y) - live(x)) || String(y.listing_date || "").localeCompare(String(x.listing_date || ""))
    || String(y.first_seen_at || "").localeCompare(String(x.first_seen_at || "")) || String(y.id).localeCompare(String(x.id));
}
const homeBaseSlug = a => `${slugify(a.city) || "lake-tahoe"}-${slugify(a.state) || "nv"}/${slugify(a.address) || "home"}`;
const homeBaths = a => a.baths_full == null || a.baths_full === "" ? (a.baths ?? null) : Number(a.baths_full) + 0.5 * Number(a.baths_half || 0);
function homeMlsValues(a, remarks, now) {
  const sold = a.archive_status === "sold";
  return {
    title: a.address || "(no address)", home_status: homeStatusOf(a),
    price: money(a.price), sold_price: sold ? money(a.close_price) : null, close_date: sold ? (a.close_date || null) : null,
    represented: sold ? representedText(a) : null,
    city: a.city || null, beds: a.beds ?? null, baths: homeBaths(a),
    sqft: a.sqft != null ? Number(a.sqft).toLocaleString("en-US") : null,
    mls_number: a.mls_number || null, listing_date: a.listing_date || null,
    photo: a.main_photo_url || a.photo || null, tour_url_mls: a.tour_url_mls || null,
    _mls_description: ptFromPlain(remarks), updated_at: now,
  };
}
async function mirrorEmdashHomes() {
  const legacy = (await d1("SELECT count(*) n FROM ec_listings WHERE id NOT LIKE 'p-%'"))?.[0]?.results?.[0]?.n ?? 0;
  if (legacy > 0) throw new Error(`ec_listings still holds ${legacy} row(s) keyed by listing number; run emdash/seed/migrate-homes.mjs first`);
  await d1("CREATE TABLE IF NOT EXISTS property_slugs (slug TEXT PRIMARY KEY, property_id TEXT NOT NULL, created_at TEXT)");
  const ar = await d1(`SELECT ${ARCHIVE_HOME_COLS} FROM listing_archive WHERE parcel_number IS NOT NULL AND parcel_number <> '' AND archive_status <> 'unknown'`);
  const homes = new Map();
  for (const a of ar?.[0]?.results ?? []) {
    if (!homes.has(a.parcel_number)) homes.set(a.parcel_number, []);
    homes.get(a.parcel_number).push(a);
  }
  for (const rows of homes.values()) rows.sort(newestFirst);
  if (!homes.size) { console.log("home mirror: no archive rows with a parcel yet"); return; }
  const ex = await d1(`SELECT id, slug, "_current_listing" AS cur FROM ec_listings`);
  const existing = new Map((ex?.[0]?.results ?? []).map(r => [r.id, r]));
  const taken = new Set([...existing.values()].map(r => r.slug));
  // MLS remarks only for the current listings (descriptions are the bulk of a row).
  const currentIds = [...homes.values()].map(rows => rows[0].id);
  const remarks = {};
  for (let i = 0; i < currentIds.length; i += 100) {
    const r = await d1(`SELECT id, description FROM listing_archive WHERE id IN (${currentIds.slice(i, i + 100).map(sqlVal).join(",")})`);
    for (const row of r?.[0]?.results ?? []) remarks[row.id] = row.description;
  }
  const now = new Date().toISOString();
  const insertCols = ["id", "slug", "status", "locale", "version", "published_at", "created_at", "description", "show_grant", "_current_listing", ...HOME_SET_COLS];
  const setClause = [
    ...HOME_SET_COLS.map(c => `"${c}"=excluded."${c}"`),
    `"description"=CASE WHEN ec_listings."description" IS ec_listings."_mls_description" THEN excluded."description" ELSE ec_listings."description" END`,
    `"show_grant"=CASE WHEN ec_listings."_current_listing" IS excluded."_current_listing" THEN ec_listings."show_grant" ELSE excluded."show_grant" END`,
    `"_current_listing"=excluded."_current_listing"`,
  ].join(",");
  const head = `INSERT INTO ec_listings (${insertCols.map(c => `"${c}"`).join(",")}) VALUES `;
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
      if (taken.has(slug)) slug = `${slug}-${slugify(parcel) || "2"}`;
      taken.add(slug);
      inserted++;
    } else if (was.cur && was.cur !== cur.id) {
      const o = (await d1(`SELECT ${HOME_OWNER_COLS.map(c => `"${c}"`).join(",")}, "_mls_description" AS mls FROM ec_listings WHERE id=${sqlVal(id)}`))?.[0]?.results?.[0];
      if (o) {
        const snap = { ...Object.fromEntries(HOME_OWNER_COLS.map(c => [c, o[c] ?? null])), taken_at: now, listing_key: was.cur };
        if (snap.description === o.mls) snap.description = null;
        await d1(`UPDATE listing_archive SET owner_snapshot=${sqlVal(JSON.stringify(snap))} WHERE id=${sqlVal(was.cur)}`);
      }
      switched++;
    }
    const m = homeMlsValues(cur, remarks[cur.id], now);
    const vals = [sqlVal(id), sqlVal(slug), "'published'", "'en'", "1", sqlVal(now), sqlVal(now), sqlVal(m._mls_description), sqlVal(grantListsIt(cur) ? "1.0" : "0.0"), sqlVal(cur.id), ...HOME_SET_COLS.map(c => sqlVal(m[c]))];
    const tuple = `(${vals.join(",")})`;
    if (len + tuple.length + 1 > 90000 || batch.length >= 40) await flush();
    batch.push(tuple); len += tuple.length + 1;
    slugRows.push([slug, id]);
    for (const a of rows) if (a.slug) slugRows.push([a.slug, id]);
  }
  await flush();
  for (let i = 0; i < slugRows.length; i += 200) {
    const tuples = slugRows.slice(i, i + 200).map(([s, id]) => `(${sqlVal(s)},${sqlVal(id)},${sqlVal(now)})`).join(",");
    await d1(`INSERT OR IGNORE INTO property_slugs (slug, property_id, created_at) VALUES ${tuples}`);
  }
  console.log(`emdash mirror: ${homes.size} homes in ec_listings (${inserted} new, ${switched} switched to a new listing), ${slugRows.length} slugs mapped`);
}

async function insertRows(table, cols, rows, perBatch) {
  const head = `INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES `;
  let i = 0;
  while (i < rows.length) {
    const parts = [];
    while (i < rows.length && parts.length < perBatch) {
      parts.push("(" + rows[i].map(sqlVal).join(",") + ")");
      i++;
      // stay under the SQL text cap even if a row (long description) is big
      if ((head.length + parts.join(",").length) > 90000) break;
    }
    await d1(head + parts.join(","));
  }
}

/* ---------------------------------------------------------- listing rows */
// The `listings` table columns, in insert order. buildListingRow() must match.
const LCOLS = ["id","slug","address","city","state","zip","price","beds","baths","baths_full","baths_half","sqft","lot_acres","year_built","garage","type","sub_type","category","status","lat","lng","view","waterfront","dom","photos_count","agent","office","taxes","hoa_fee","heating","cooling","parking","appliances","description","photo","updated",
  // Added 2026-08-19 (Liz's field request):
  "flooring","fireplaces","fireplace_yn","fireplace_features","roof","utilities","pool_features","listing_date","hoa_frequency","tour_url_mls","mls_number","stories","arch_style","construction","lot_features","condition","lot_sqft",
  // Added 2026-09-10:
  "cum_dom",
  // Added 2026-09-21 (Features filter):
  "laundry_features","security_features","main_level_beds","assoc_amenities","spa_features","spa_yn",
  // Added 2026-11-09 (one page per home): relists keep the parcel, so the site
  // joins a live listing to its home row (ec_listings id = 'p-<parcel>') by it.
  "parcel_number"];

// city-state/address, the way every listing URL on the site is built.
function baseSlugOf(l) {
  const citySlug = slugify(l.City) || "lake-tahoe";
  const stateSlug = slugify(l.StateOrProvince) || "nv";
  return `${citySlug}-${stateSlug}/${slugify(addressOf(l)) || l.ListingKey}`;
}

// One `listings` row (LCOLS order) from a Trestle Property record.
function buildListingRow(l, slug, primary) {
  const address = addressOf(l);
  return [
    l.ListingKey, slug, address, l.City || null, l.StateOrProvince || null, l.PostalCode || null,
      l.ListPrice ?? null, l.BedroomsTotal ?? null, l.BathroomsTotalInteger ?? null,
      l.BathroomsFull ?? null, l.BathroomsHalf ?? null, l.LivingArea ?? null, l.LotSizeAcres ?? null,
      l.YearBuilt ?? null, l.GarageSpaces ?? null, l.PropertyType || null, l.PropertySubType || null,
      categoryOf(l), l.StandardStatus || null, l.Latitude ?? null, l.Longitude ?? null,
      flat(l.View) || null, l.WaterfrontYN === true ? 1 : 0, l.DaysOnMarket ?? null, l.PhotosCount ?? 0,
      l.ListAgentFullName || null, l.ListOfficeName || null, l.TaxAnnualAmount ?? null, l.AssociationFee ?? null,
      flat(l.Heating) || null, flat(l.Cooling) || null, flat(l.ParkingFeatures) || null, flat(l.Appliances) || null,
      l.PublicRemarks || null, primary, l.ModificationTimestamp || null,
      // Added 2026-08-19 (Liz's field request):
      flat(l.Flooring) || null, l.FireplacesTotal ?? null, l.FireplaceYN === true ? 1 : (l.FireplaceYN === false ? 0 : null),
      flat(l.FireplaceFeatures) || null, flat(l.Roof) || null, flat(l.Utilities) || null, flat(l.PoolFeatures) || null,
      l.ListingContractDate || null, l.AssociationFeeFrequency || null, l.VirtualTourURLUnbranded || null,
      l.ListingId || null, l.Stories ?? null, flat(l.ArchitecturalStyle) || null, flat(l.ConstructionMaterials) || null,
      flat(l.LotFeatures) || null, l.PropertyCondition ? flat(l.PropertyCondition) : null,
      l.LotSizeAcres != null ? Math.round(Number(l.LotSizeAcres) * 43560) : null,
      // Added 2026-09-10:
      l.CumulativeDaysOnMarket ?? null,
      // Added 2026-09-21 (Features filter):
    flat(l.LaundryFeatures) || null, flat(l.SecurityFeatures) || null,
    l.MainLevelBedrooms ?? null, flat(l.AssociationAmenities) || null,
    flat(l.SpaFeatures) || null, l.SpaYN === true ? 1 : (l.SpaYN === false ? 0 : null),
    // Added 2026-11-09:
    l.ParcelNumber || null,
  ];
}

/* ---------------------------------------------------------------- archive */
// `listing_archive` = every `listings` column, plus who was on each side and
// what happened to the listing. Nothing deletes from it. See the header note.
const ARCHIVE_EXTRA_COLS = [
  // (parcel_number is a listings column since 2026-11-09)
  "list_agent_id", "buyer_agent_id", "co_list_agent_id", "co_buyer_agent_id",
  "buyer_agent", "buyer_office",
  "feed_status",      // last StandardStatus the feed reported
  "archive_status",   // active | under_contract | sold | off_market | unknown
  "close_price", "close_date", "off_market_date", "contract_date",
  "first_seen_at", "last_seen_at",
  "owner_snapshot",   // JSON of Grant's ec_listings fields, taken as the row departs
  "main_photo_url",   // the lead MLS photo, kept so a sold listing still has a picture
  "source",           // sync | backfill | backfill-history
  // Added 2026-11-09 (listing history):
  "original_price",   // OriginalListPrice: the first asking price of this listing
  "previous_price",   // PreviousListPrice: the price before the latest change
  "price_change_at",  // PriceChangeTimestamp
  "status_change_at", // StatusChangeTimestamp
];
const ARCHIVE_COLS = [...LCOLS, ...ARCHIVE_EXTRA_COLS];
// SQLite stores a number in a TEXT-affinity column as text, which would break
// `close_price >= …` and the price formatting, so the numeric columns are typed.
const NUMERIC_COLS = new Set(["price","beds","baths","baths_full","baths_half","sqft","lot_acres","year_built","garage",
  "lat","lng","waterfront","dom","photos_count","taxes","hoa_fee","fireplaces","fireplace_yn","stories","lot_sqft",
  "cum_dom","main_level_beds","spa_yn","close_price","original_price","previous_price"]);
const colType = c => NUMERIC_COLS.has(c) ? "REAL" : "TEXT";

// Create the archive table on first run; add any column that is new since.
// Idempotent, so the scheduled sync can carry its own schema and nobody has to
// run a migration by hand before merging.
async function ensureSchema() {
  const defs = ARCHIVE_COLS.map(c => c === "id" ? "id TEXT PRIMARY KEY" : `"${c}" ${colType(c)}`);
  await d1(`CREATE TABLE IF NOT EXISTS listing_archive (${defs.join(", ")})`);
  const info = await d1("PRAGMA table_info(listing_archive)");
  const have = new Set((info?.[0]?.results ?? []).map(r => r.name));
  for (const c of ARCHIVE_COLS) {
    if (!have.has(c)) await d1(`ALTER TABLE listing_archive ADD COLUMN "${c}" ${colType(c)}`);
  }
  // `listings` gained parcel_number on 2026-11-09 (the archive always had it).
  const linfo = await d1("PRAGMA table_info(listings)");
  if (!(linfo?.[0]?.results ?? []).some(r => r.name === "parcel_number")) await d1("ALTER TABLE listings ADD COLUMN parcel_number TEXT");
  // Every URL ever used for a home -> its ec_listings row (301s). Filled by the
  // home mirror below and by emdash/seed/migrate-homes.mjs.
  await d1("CREATE TABLE IF NOT EXISTS property_slugs (slug TEXT PRIMARY KEY, property_id TEXT NOT NULL, created_at TEXT)");
  await d1("CREATE INDEX IF NOT EXISTS idx_archive_status ON listing_archive(archive_status)");
  await d1("CREATE INDEX IF NOT EXISTS idx_archive_slug ON listing_archive(slug)");
  await d1("CREATE INDEX IF NOT EXISTS idx_archive_parcel ON listing_archive(parcel_number)");
  await d1("CREATE INDEX IF NOT EXISTS idx_archive_close ON listing_archive(close_date)");
  // One row per price or status change the sync has seen (2026-11-09). The feed only
  // carries the latest change, so the full run of price cuts exists only from the
  // day this table started. `at` is the MLS timestamp when the feed gives one, so
  // a change seen twice (feed field + our own comparison) lands on the same key.
  await d1("CREATE TABLE IF NOT EXISTS listing_events (" +
    "listing_key TEXT NOT NULL, kind TEXT NOT NULL, at TEXT NOT NULL, " +
    "price REAL, from_price REAL, status TEXT, from_status TEXT, recorded_at TEXT, " +
    "PRIMARY KEY (listing_key, kind, at))");
}

function archiveStatusOf(standardStatus) {
  switch (standardStatus) {
    case "Active": return "active";
    case "ActiveUnderContract":
    case "Pending": return "under_contract";
    case "Closed": return "sold";
    default: return "off_market";
  }
}

// The archive row for a Property record: the listings row + the extras.
function buildArchiveRow(l, slug, primary, source, now) {
  const row = buildListingRow(l, slug, primary);
  return [
    ...row,
    l.ListAgentMlsId || null, l.BuyerAgentMlsId || null,
    l.CoListAgentMlsId || null, l.CoBuyerAgentMlsId || null,
    l.BuyerAgentFullName || null, l.BuyerOfficeName || null,
    l.StandardStatus || null, archiveStatusOf(l.StandardStatus),
    l.ClosePrice ?? null, l.CloseDate || null, l.OffMarketDate || null, l.PurchaseContractDate || null,
    now, now,
    null,          // owner_snapshot: never written by the upsert
    primary,
    source,
    l.OriginalListPrice ?? null, l.PreviousListPrice ?? null,
    l.PriceChangeTimestamp || null, l.StatusChangeTimestamp || null,
  ];
}

// INSERT … ON CONFLICT(id) DO UPDATE. The feed columns always win; the columns
// only this table owns (first_seen_at, owner_snapshot, source) are kept, and the
// close/photo columns are only overwritten by a non-null value.
async function upsertArchive(rows) {
  if (!rows.length) return;
  const keep = new Set(["id", "first_seen_at", "owner_snapshot", "source"]);
  const coalesce = new Set(["close_price", "close_date", "off_market_date", "contract_date", "main_photo_url"]);
  const set = ARCHIVE_COLS.filter(c => !keep.has(c)).map(c =>
    coalesce.has(c) ? `"${c}"=COALESCE(excluded."${c}", listing_archive."${c}")` : `"${c}"=excluded."${c}"`).join(",");
  const head = `INSERT INTO listing_archive (${ARCHIVE_COLS.map(c => `"${c}"`).join(",")}) VALUES `;
  const tail = ` ON CONFLICT(id) DO UPDATE SET ${set}`;
  let batch = [], len = head.length + tail.length;
  const flush = async () => { if (batch.length) { await d1(head + batch.join(",") + tail); batch = []; len = head.length + tail.length; } };
  for (const r of rows) {
    const tuple = "(" + r.map(sqlVal).join(",") + ")";
    if (len + tuple.length + 1 > 90000 || batch.length >= 25) await flush();
    batch.push(tuple); len += tuple.length + 1;
  }
  await flush();
}

// Price and status changes, recorded BEFORE the archive upsert overwrites the last
// values we saw. Two sources, both INSERT OR IGNORE so re-runs add nothing:
//  - the feed's own latest change (PreviousListPrice -> ListPrice at
//    PriceChangeTimestamp; a non-Active status at StatusChangeTimestamp), which
//    also seeds history for listings that changed before this table existed;
//  - our comparison with the archive row from the last run, which catches every
//    change from now on even when the feed's timestamp field is empty.
async function recordEvents(records, now) {
  if (!records.length) return;
  const prev = {};
  for (let i = 0; i < records.length; i += 200) {
    const ids = records.slice(i, i + 200).map(l => sqlVal(l.ListingKey)).join(",");
    const res = await d1(`SELECT id, price, feed_status FROM listing_archive WHERE id IN (${ids})`);
    for (const a of res?.[0]?.results ?? []) prev[a.id] = a;
  }
  const events = [];
  for (const l of records) {
    const p = prev[l.ListingKey];
    const price = l.ListPrice ?? null;
    if (l.PreviousListPrice != null && l.PriceChangeTimestamp && price != null && Number(l.PreviousListPrice) !== Number(price)) {
      events.push([l.ListingKey, "price", l.PriceChangeTimestamp, price, l.PreviousListPrice, null, null, now]);
    }
    if (p && p.price != null && price != null && Number(p.price) !== Number(price)) {
      events.push([l.ListingKey, "price", l.PriceChangeTimestamp || now, price, p.price, null, null, now]);
    }
    if (l.StandardStatus && l.StandardStatus !== "Active" && l.StandardStatus !== "Closed" && l.StatusChangeTimestamp) {
      events.push([l.ListingKey, "status", l.StatusChangeTimestamp, null, null, l.StandardStatus, null, now]);
    }
    if (p && p.feed_status && l.StandardStatus && p.feed_status !== l.StandardStatus) {
      events.push([l.ListingKey, "status", l.StatusChangeTimestamp || now, null, null, l.StandardStatus, p.feed_status, now]);
    }
  }
  if (!events.length) { console.log("events: no price or status changes"); return; }
  const cols = ["listing_key", "kind", "at", "price", "from_price", "status", "from_status", "recorded_at"];
  for (let i = 0; i < events.length; i += 50) {
    const tuples = events.slice(i, i + 50).map(e => "(" + e.map(sqlVal).join(",") + ")").join(",");
    await d1(`INSERT OR IGNORE INTO listing_events (${cols.join(",")}) VALUES ${tuples}`);
  }
  console.log(`events: ${events.length} price/status change(s) checked in`);
}

// Archive rows that were live last run but are not in this pull: ask the feed what
// became of them (one query per 25 keys, no status filter). Closed → sold, with
// the close facts and the buyer side. Anything else, or not returned at all →
// off_market (expired, withdrawn or cancelled; the feed does not say which).
async function reconcileDeparted(token, liveKeys) {
  const r = await d1("SELECT id, main_photo_url FROM listing_archive WHERE archive_status IN ('active','under_contract','unknown')");
  const live = new Set(liveKeys);
  const departed = (r?.[0]?.results ?? []).filter(a => !live.has(a.id));
  if (!departed.length) { console.log("reconcile: nothing left the feed"); return; }
  const today = new Date().toISOString().slice(0, 10);
  const SELECT = "ListingKey,StandardStatus,ClosePrice,CloseDate,OffMarketDate,PurchaseContractDate,ListAgentMlsId,BuyerAgentMlsId,CoListAgentMlsId,CoBuyerAgentMlsId,BuyerAgentFullName,BuyerOfficeName,ModificationTimestamp";
  const found = {};
  const keys = departed.map(a => a.id);
  for (let i = 0; i < keys.length; i += 25) {
    const batch = keys.slice(i, i + 25);
    const rows = await fetchProperties(token, `ListingKey in ('${batch.join("','")}')`, SELECT, 5);
    for (const l of rows) found[l.ListingKey] = l;
  }
  // A sold listing that never had its photo stored (it was a stub) gets one now.
  const needPhoto = departed.filter(a => !a.main_photo_url && found[a.id]?.StandardStatus === "Closed").map(a => a.id);
  const photos = needPhoto.length ? await fetchAllPhotos(token, needPhoto) : {};
  let sold = 0, off = 0;
  for (const a of departed) {
    const l = found[a.id];
    if (l && l.StandardStatus === "Closed") {
      const primary = (photos[a.id] || []).slice().sort((x, y) => x.ord - y.ord)[0]?.url || null;
      await d1(`UPDATE listing_archive SET archive_status='sold', feed_status='Closed', status='Closed', ` +
        `close_price=${sqlVal(l.ClosePrice ?? null)}, close_date=${sqlVal(l.CloseDate || null)}, off_market_date=${sqlVal(l.OffMarketDate || null)}, ` +
        `contract_date=${sqlVal(l.PurchaseContractDate || null)}, list_agent_id=COALESCE(${sqlVal(l.ListAgentMlsId || null)}, list_agent_id), ` +
        `buyer_agent_id=${sqlVal(l.BuyerAgentMlsId || null)}, co_list_agent_id=COALESCE(${sqlVal(l.CoListAgentMlsId || null)}, co_list_agent_id), ` +
        `co_buyer_agent_id=${sqlVal(l.CoBuyerAgentMlsId || null)}, buyer_agent=${sqlVal(l.BuyerAgentFullName || null)}, buyer_office=${sqlVal(l.BuyerOfficeName || null)}, ` +
        `main_photo_url=COALESCE(main_photo_url, ${sqlVal(primary)}), updated=${sqlVal(l.ModificationTimestamp || null)}, last_seen_at=${sqlVal(new Date().toISOString())} WHERE id=${sqlVal(a.id)}`);
      sold++;
    } else {
      // Still in the feed under some other status, or gone entirely.
      await d1(`UPDATE listing_archive SET archive_status='off_market', feed_status=${sqlVal(l?.StandardStatus || null)}, ` +
        `off_market_date=COALESCE(${sqlVal(l?.OffMarketDate || null)}, off_market_date, ${sqlVal(today)}) WHERE id=${sqlVal(a.id)}`);
      off++;
    }
  }
  console.log(`reconcile: ${departed.length} left the feed → ${sold} sold, ${off} off-market`);
}

// Slugs for rows going into the archive. A key already there keeps its slug; a
// new key whose slug another key holds gets "-<ListingKey>" appended, the same
// rule the live pull uses within one run.
async function assignArchiveSlugs(records) {
  const r = await d1("SELECT id, slug FROM listing_archive");
  const byId = {}, taken = new Set();
  for (const a of r?.[0]?.results ?? []) { byId[a.id] = a.slug; if (a.slug) taken.add(a.slug); }
  const out = {};
  for (const l of records) {
    if (byId[l.ListingKey]) { out[l.ListingKey] = byId[l.ListingKey]; continue; }
    let slug = baseSlugOf(l);
    if (taken.has(slug)) slug = `${slug}-${l.ListingKey}`;
    taken.add(slug);
    out[l.ListingKey] = slug;
  }
  return out;
}

// SYNC_MODE=backfill-sold: Grant's closed sales on any side, plus every closed
// sale at or above SOLD_OTHERS_MIN_PRICE, into the archive with the main photo.
// One query for the records, then the usual media batches. Re-runnable.
async function backfillSold(token) {
  const filter = `StandardStatus eq 'Closed' and (ListAgentMlsId eq '${GRANT_AGENT_ID}' or BuyerAgentMlsId eq '${GRANT_AGENT_ID}' ` +
    `or CoListAgentMlsId eq '${GRANT_AGENT_ID}' or CoBuyerAgentMlsId eq '${GRANT_AGENT_ID}' or ClosePrice ge ${SOLD_OTHERS_MIN_PRICE})`;
  const raw = await fetchProperties(token, filter);
  const grant = raw.filter(l => [l.ListAgentMlsId, l.BuyerAgentMlsId, l.CoListAgentMlsId, l.CoBuyerAgentMlsId].includes(GRANT_AGENT_ID)).length;
  console.log(`backfill: ${raw.length} closed sales (${grant} with Grant on a side, ${raw.length - grant} others at $${SOLD_OTHERS_MIN_PRICE.toLocaleString("en-US")}+)`);
  // Only fetch photos for rows that don't already have one.
  const have = await d1("SELECT id FROM listing_archive WHERE main_photo_url IS NOT NULL");
  const hasPhoto = new Set((have?.[0]?.results ?? []).map(a => a.id));
  const need = raw.map(l => l.ListingKey).filter(k => !hasPhoto.has(k));
  const photos = need.length ? await fetchAllPhotos(token, need) : {};
  console.log(`backfill: fetched main photos for ${Object.keys(photos).length} of ${need.length} listings that needed one`);
  const slugs = await assignArchiveSlugs(raw);
  const now = new Date().toISOString();
  const rows = raw.map(l => {
    const primary = (photos[l.ListingKey] || []).slice().sort((a, b) => a.ord - b.ord)[0]?.url || null;
    return buildArchiveRow(l, slugs[l.ListingKey], primary, "backfill", now);
  });
  await upsertArchive(rows);
  const v = await d1("SELECT count(*) n FROM listing_archive WHERE archive_status='sold'");
  console.log("backfill: archive now holds", v?.[0]?.results?.[0]?.n, "sold listings");
}

// SYNC_MODE=backfill-history (2026-11-09): every closed sale of every home the
// archive knows (by parcel), at any price and on any side, so each listing page's
// history goes back to the MLS's oldest record. The sold backfill only took
// Grant's sales and $5M+ ones. New listing keys only, and no photos: a row that
// is already archived keeps everything it has. These rows are not added to
// /sold/ (its filters are unchanged); they feed the history table. Re-runnable.
async function backfillHistory(token) {
  const r = await d1("SELECT DISTINCT parcel_number p FROM listing_archive WHERE parcel_number IS NOT NULL AND parcel_number <> ''");
  const parcels = (r?.[0]?.results ?? []).map(x => x.p);
  const have = await d1("SELECT id FROM listing_archive");
  const known = new Set((have?.[0]?.results ?? []).map(a => a.id));
  const raw = [];
  for (let i = 0; i < parcels.length; i += 25) {
    const batch = parcels.slice(i, i + 25).map(p => p.replace(/'/g, "''"));
    raw.push(...await fetchProperties(token, `StandardStatus eq 'Closed' and ParcelNumber in ('${batch.join("','")}')`, FULL_SELECT, 10));
  }
  const fresh = raw.filter(l => !known.has(l.ListingKey));
  console.log(`history backfill: ${parcels.length} homes, ${raw.length} closed sales in the feed, ${fresh.length} new to the archive`);
  const slugs = await assignArchiveSlugs(fresh);
  const now = new Date().toISOString();
  await upsertArchive(fresh.map(l => buildArchiveRow(l, slugs[l.ListingKey], null, "backfill-history", now)));
  // Older closed records carry their own last price change; keep it as history too.
  await recordEvents(fresh, now);
  // Rows already archived get just the new price fields (the upsert is skipped for
  // them so their photo and Grant's snapshot are untouched).
  const old = raw.filter(l => known.has(l.ListingKey));
  for (const l of old) {
    await d1(`UPDATE listing_archive SET original_price=${sqlVal(l.OriginalListPrice ?? null)}, previous_price=${sqlVal(l.PreviousListPrice ?? null)}, ` +
      `price_change_at=${sqlVal(l.PriceChangeTimestamp || null)}, status_change_at=${sqlVal(l.StatusChangeTimestamp || null)} WHERE id=${sqlVal(l.ListingKey)}`);
  }
  await recordEvents(old, now);
  const v = await d1("SELECT count(*) n FROM listing_archive WHERE archive_status='sold'");
  console.log("history backfill: archive now holds", v?.[0]?.results?.[0]?.n, "sold listings");
}

/* ------------------------------------------------------------------- main */
async function main() {
  if (!CF_TOKEN) throw new Error("CF_API_TOKEN env var is required");
  const t0 = Date.now();
  const token = await getToken();
  console.log("token ok");
  await ensureSchema();

  if (SYNC_MODE === "backfill-sold") {
    await backfillSold(token);
    try { await mirrorEmdashHomes(); } catch (e) { console.error("emdash mirror (non-fatal):", e.message); }
    console.log(`backfill complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return;
  }
  if (SYNC_MODE === "backfill-history") {
    await backfillHistory(token);
    console.log(`history backfill complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return;
  }
  if (SYNC_MODE !== "sync") throw new Error(`Unknown SYNC_MODE "${SYNC_MODE}" (use "sync", "backfill-sold" or "backfill-history")`);

  const raw = await fetchLive(token);
  const byStatus = {};
  for (const l of raw) byStatus[l.StandardStatus] = (byStatus[l.StandardStatus] || 0) + 1;
  console.log(`fetched ${raw.length} live listings`, JSON.stringify(byStatus));

  const photos = await fetchAllPhotos(token, raw.map(r => r.ListingKey));
  const photoCount = Object.values(photos).reduce((n, a) => n + a.length, 0);
  console.log(`fetched ${photoCount} photos for ${Object.keys(photos).length} listings`);

  // Build rows
  const seen = new Set();
  const now = new Date().toISOString();
  const listingRows = [], archiveRows = [];
  for (const l of raw) {
    let slug = baseSlugOf(l);
    if (seen.has(slug)) slug = `${slug}-${l.ListingKey}`;
    seen.add(slug);
    const primary = (photos[l.ListingKey] || []).slice().sort((a, b) => a.ord - b.ord)[0]?.url || null;
    listingRows.push(buildListingRow(l, slug, primary));
    archiveRows.push(buildArchiveRow(l, slug, primary, "sync", now));
  }
  const photoRows = [];
  for (const [key, arr] of Object.entries(photos)) {
    for (const p of arr) photoRows.push([key, p.ord, p.url]);
  }

  // Price/status changes first: they compare against the archive row from last run,
  // which the upsert below overwrites. Non-fatal, like every extra step.
  try { await recordEvents(raw, now); } catch (e) { console.error("events (non-fatal):", e.message); }
  // Archive first, before anything is deleted: a crash from here on loses nothing.
  await upsertArchive(archiveRows);
  console.log(`archive: upserted ${archiveRows.length} live listings`);
  try { await reconcileDeparted(token, raw.map(l => l.ListingKey)); } catch (e) { console.error("reconcile (non-fatal):", e.message); }

  // Replace-all (listings + photos hold only what is live), then re-insert.
  await d1("DELETE FROM listing_photos");
  await d1("DELETE FROM listings");
  await insertRows("listings", LCOLS, listingRows, 25);
  await insertRows("listing_photos", ["listing_key","ord","url"], photoRows, 300);
  await d1(`INSERT OR REPLACE INTO sync_meta (id,last_synced_at,count) VALUES (1,${sqlVal(new Date().toISOString())},${listingRows.length})`);

  // Keep the emdash admin "Listings" collection (ec_listings, one row per home)
  // in step with the archive. Non-fatal: a mirror failure never breaks the core
  // sync, but the workflow flags the "(non-fatal)" line. The collection is
  // registered once by emdash/seed/mirror-listings.mjs.
  try { await mirrorEmdashHomes(); } catch (e) { console.error("emdash mirror (non-fatal):", e.message); }

  const verify = await d1("SELECT (SELECT count(*) FROM listings) l, (SELECT count(*) FROM listing_photos) p, (SELECT count(*) FROM listing_archive) a, (SELECT count(*) FROM listing_archive WHERE archive_status='sold') s");
  console.log("D1 now holds:", JSON.stringify(verify?.[0]?.results?.[0] || verify));
  console.log(`sync complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch(e => { console.error("SYNC FAILED:", e.message); process.exit(1); });
