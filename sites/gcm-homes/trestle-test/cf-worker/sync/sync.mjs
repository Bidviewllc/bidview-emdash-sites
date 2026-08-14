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
].join(",");

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

async function fetchActive(token) {
  const rows = [];
  let next = `Property?$filter=${encodeURIComponent("StandardStatus eq 'Active'")}&$select=${FULL_SELECT}&$top=200`;
  let guard = 0;
  while (next && guard++ < 30) {
    const page = await odata(token, next);
    rows.push(...(page.value || []));
    next = page["@odata.nextLink"] || null;
  }
  return rows;
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
// Mirror the synced listings into the emdash `listings` collection (ec_listings)
// for the admin backend. PRESERVES owner columns: new listings insert (description/
// owner_note NULL); existing listings update ONLY the MLS columns via ON CONFLICT(id),
// leaving description/owner_note/status/version/revisions untouched so admin + inline
// edits survive every sync. Mirrors emdash/seed/mirror-listings.mjs.
const EMDASH_MLS_FIELDS = ["city","state","zip","price","beds","baths","sqft","lot_acres","year_built","property_type","mls_status","view","photo","dom"];
// Plain MLS remarks -> Portable Text JSON (WYSIWYG storage), deterministic keys.
function ptFromPlain(plain) {
  const text = (plain ?? "").toString();
  const paras = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const list = paras.length ? paras : (text.trim() ? [text.trim()] : []);
  return JSON.stringify(list.map((p, i) => ({ _type: "block", _key: "b" + i, style: "normal", markDefs: [], children: [{ _type: "span", _key: "s" + i, text: p, marks: [] }] })));
}
async function mirrorEmdashListings() {
  const lr = await d1("SELECT * FROM listings");
  const rows = lr?.[0]?.results ?? [];
  const insertCols = ["id","slug","status","locale","version","title","published_at","updated_at", ...EMDASH_MLS_FIELDS.map(s => '"' + s + '"'), "description", "_mls_description"];
  const trackedCols = ["slug","title","updated_at", ...EMDASH_MLS_FIELDS, "_mls_description"];
  const setClause = [
    ...trackedCols.map(c => `"${c}"=excluded."${c}"`),
    `"description"=CASE WHEN ec_listings."description" IS ec_listings."_mls_description" THEN excluded."description" ELSE ec_listings."description" END`,
  ].join(",");
  const head = `INSERT INTO ec_listings (${insertCols.join(",")}) VALUES `;
  const tail = ` ON CONFLICT(id) DO UPDATE SET ${setClause}`;
  let batch = [], len = head.length + tail.length;
  const flush = async () => { if (batch.length) { await d1(head + batch.join(",") + tail); batch = []; len = head.length + tail.length; } };
  for (const r of rows) {
    const pt = (r.sub_type || r.type || "").replace(/([a-z])([A-Z])/g, "$1 $2");
    const vals = [
      sqlVal(r.id), sqlVal(r.slug || ("listing-" + r.id)), "'published'", "'en'", "1",
      sqlVal(r.address || "(no address)"), "datetime('now')", "datetime('now')",
      sqlVal(r.city), sqlVal(r.state), sqlVal(r.zip),
      sqlVal(r.price != null ? "$" + Number(r.price).toLocaleString("en-US") : null),
      sqlVal(r.beds), sqlVal(r.baths), sqlVal(r.sqft != null ? Number(r.sqft).toLocaleString("en-US") : null),
      sqlVal(r.lot_acres), sqlVal(r.year_built), sqlVal(pt || null), sqlVal(r.status), sqlVal(r.view),
      sqlVal(r.photo), sqlVal(r.dom), sqlVal(ptFromPlain(r.description)), sqlVal(ptFromPlain(r.description)),
    ];
    const tuple = "(" + vals.join(",") + ")";
    if (len + tuple.length + 1 > 90000 || batch.length >= 40) await flush();
    batch.push(tuple); len += tuple.length + 1;
  }
  await flush();
  const ids = rows.map(r => "'" + String(r.id).replace(/'/g, "''") + "'");
  if (ids.length) await d1(`DELETE FROM ec_listings WHERE id NOT IN (${ids.join(",")})`);
  console.log("emdash mirror: ec_listings upserted", rows.length, "listings (owner cols preserved)");
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

/* ------------------------------------------------------------------- main */
async function main() {
  if (!CF_TOKEN) throw new Error("CF_API_TOKEN env var is required");
  const t0 = Date.now();
  const token = await getToken();
  console.log("token ok");

  const raw = await fetchActive(token);
  console.log(`fetched ${raw.length} active listings`);

  const photos = await fetchAllPhotos(token, raw.map(r => r.ListingKey));
  const photoCount = Object.values(photos).reduce((n, a) => n + a.length, 0);
  console.log(`fetched ${photoCount} photos for ${Object.keys(photos).length} listings`);

  // Build rows
  const seen = new Set();
  const listingRows = raw.map(l => {
    const address = addressOf(l);
    const citySlug = slugify(l.City) || "lake-tahoe";
    const stateSlug = slugify(l.StateOrProvince) || "nv";
    let slug = `${citySlug}-${stateSlug}/${slugify(address) || l.ListingKey}`;
    if (seen.has(slug)) slug = `${slug}-${l.ListingKey}`;
    seen.add(slug);
    const primary = (photos[l.ListingKey] || []).slice().sort((a, b) => a.ord - b.ord)[0]?.url || null;
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
    ];
  });
  const photoRows = [];
  for (const [key, arr] of Object.entries(photos)) {
    for (const p of arr) photoRows.push([key, p.ord, p.url]);
  }

  // Replace-all (removes sold/expired listings), then re-insert.
  await d1("DELETE FROM listing_photos");
  await d1("DELETE FROM listings");
  const LCOLS = ["id","slug","address","city","state","zip","price","beds","baths","baths_full","baths_half","sqft","lot_acres","year_built","garage","type","sub_type","category","status","lat","lng","view","waterfront","dom","photos_count","agent","office","taxes","hoa_fee","heating","cooling","parking","appliances","description","photo","updated"];
  await insertRows("listings", LCOLS, listingRows, 25);
  await insertRows("listing_photos", ["listing_key","ord","url"], photoRows, 300);
  await d1(`INSERT OR REPLACE INTO sync_meta (id,last_synced_at,count) VALUES (1,${sqlVal(new Date().toISOString())},${listingRows.length})`);

  // Keep the emdash admin "Listings" collection (ec_listings) in sync so the
  // backend browse view stays fresh. Non-fatal — a mirror failure never breaks the
  // core sync. The collection/table are registered once by emdash/seed/mirror-listings.mjs.
  try { await mirrorEmdashListings(); } catch (e) { console.error("emdash mirror (non-fatal):", e.message); }

  const verify = await d1("SELECT (SELECT count(*) FROM listings) l, (SELECT count(*) FROM listing_photos) p");
  console.log("D1 now holds:", JSON.stringify(verify?.[0]?.results?.[0] || verify));
  console.log(`sync complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch(e => { console.error("SYNC FAILED:", e.message); process.exit(1); });
