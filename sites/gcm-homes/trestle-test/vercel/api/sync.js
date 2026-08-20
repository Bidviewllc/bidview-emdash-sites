/**
 * Scheduled sync: Trestle → Cloudflare D1. Runs on Vercel (a host Trestle's WAF
 * allows), pulls every active listing + photos, and replays them into the CF D1
 * that the Cloudflare Worker serves from. This is the "engine" behind Path B —
 * the Worker never calls Trestle, so it never hits the WAF.
 *
 * Trigger: Vercel Cron (see vercel.json `crons`) or a manual GET with the secret.
 * Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
 *
 * Env required on Vercel:
 *   CF_API_TOKEN          — Cloudflare token with D1 write on Cameron's account
 *   CRON_SECRET           — shared secret; Vercel Cron sends it automatically
 *   TRESTLE_CLIENT_ID / TRESTLE_CLIENT_SECRET — optional (fall back to prod creds)
 *   CF_ACCOUNT_ID / CF_D1_DATABASE_ID         — optional (default to GCM's)
 */

import { getToken, odata, categoryOf, slugify } from "../lib/trestle.js";

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || "239e9d015c7a3a39cdc2e9400312f553";
const CF_DB      = process.env.CF_D1_DATABASE_ID || "614044b7-3e0c-41ee-ac78-7805cbab6d99";
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
].join(",");

const flat = v => Array.isArray(v) ? v.filter(Boolean).join(", ") : v;
function addressOf(l) {
  const u = (l.UnparsedAddress || "").trim();
  if (u) return u;
  return `${l.StreetNumber || ""} ${l.StreetName || ""} ${l.StreetSuffix || ""}`.replace(/\s+/g, " ").trim();
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
  const byKey = {};
  for (let i = 0; i < keys.length; i += 25) {
    const inList = keys.slice(i, i + 25).join("','");
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

async function d1(sql) {
  const r = await fetch(D1_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
    signal: AbortSignal.timeout(60000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw new Error(`D1 error ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.result;
}
function sqlVal(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

// Mirror the synced listings into the emdash `listings` collection (ec_listings)
// for the admin backend. PRESERVES owner columns (description/owner_note) — updates
// only MLS columns on existing rows via ON CONFLICT(id), inserts new listings, drops
// removed ones. So admin + inline owner edits survive every sync. Mirrors
// emdash/seed/mirror-listings.mjs.
const EMDASH_MLS_FIELDS = ["city","state","zip","price","beds","baths","sqft","lot_acres","year_built","property_type","mls_status","view","photo","dom",
  // Added 2026-08-19 (Liz's field request):
  "flooring","fireplaces","fireplace_yn","fireplace_features","roof","utilities","pool_features","listing_date","hoa_frequency","tour_url_mls","mls_number","stories","arch_style","construction","lot_features","condition","lot_sqft"];
// Plain MLS remarks -> Portable Text JSON (WYSIWYG storage), deterministic keys.
function ptFromPlain(plain) {
  const text = (plain == null ? "" : plain).toString();
  const paras = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const list = paras.length ? paras : (text.trim() ? [text.trim()] : []);
  return JSON.stringify(list.map((p, i) => ({ _type: "block", _key: "b" + i, style: "normal", markDefs: [], children: [{ _type: "span", _key: "s" + i, text: p, marks: [] }] })));
}
async function mirrorEmdashListings() {
  const lr = await d1("SELECT * FROM listings");
  const rows = (lr && lr[0] && lr[0].results) || [];
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
      sqlVal(r.photo), sqlVal(r.dom),
      sqlVal(r.flooring), sqlVal(r.fireplaces), sqlVal(r.fireplace_yn), sqlVal(r.fireplace_features), sqlVal(r.roof), sqlVal(r.utilities),
      sqlVal(r.pool_features), sqlVal(r.listing_date), sqlVal(r.hoa_frequency), sqlVal(r.tour_url_mls), sqlVal(r.mls_number), sqlVal(r.stories),
      sqlVal(r.arch_style), sqlVal(r.construction), sqlVal(r.lot_features), sqlVal(r.condition), sqlVal(r.lot_sqft),
      sqlVal(ptFromPlain(r.description)), sqlVal(ptFromPlain(r.description)),
    ];
    const tuple = "(" + vals.join(",") + ")";
    if (len + tuple.length + 1 > 90000 || batch.length >= 40) await flush();
    batch.push(tuple); len += tuple.length + 1;
  }
  await flush();
  const ids = rows.map(r => "'" + String(r.id).replace(/'/g, "''") + "'");
  if (ids.length) await d1(`DELETE FROM ec_listings WHERE id NOT IN (${ids.join(",")})`);
  return rows.length;
}

async function insertRows(table, cols, rows, perBatch) {
  const head = `INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES `;
  let i = 0;
  while (i < rows.length) {
    const parts = [];
    while (i < rows.length && parts.length < perBatch) {
      parts.push("(" + rows[i].map(sqlVal).join(",") + ")");
      i++;
      if ((head.length + parts.join(",").length) > 90000) break;
    }
    await d1(head + parts.join(","));
  }
}

export default async function handler(req, res) {
  // Only allow Vercel Cron (or a manual call carrying the secret).
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (secret && auth !== `Bearer ${secret}`) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.CF_API_TOKEN) return res.status(500).json({ error: "CF_API_TOKEN not set" });

  const t0 = Date.now();
  try {
    const token = await getToken();
    const raw = await fetchActive(token);
    const photos = await fetchAllPhotos(token, raw.map(r => r.ListingKey));

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
        // Added 2026-08-19 (Liz's field request):
        flat(l.Flooring) || null, l.FireplacesTotal ?? null, l.FireplaceYN === true ? 1 : (l.FireplaceYN === false ? 0 : null),
        flat(l.FireplaceFeatures) || null, flat(l.Roof) || null, flat(l.Utilities) || null, flat(l.PoolFeatures) || null,
        l.ListingContractDate || null, l.AssociationFeeFrequency || null, l.VirtualTourURLUnbranded || null,
        l.ListingId || null, l.Stories ?? null, flat(l.ArchitecturalStyle) || null, flat(l.ConstructionMaterials) || null,
        flat(l.LotFeatures) || null, l.PropertyCondition ? flat(l.PropertyCondition) : null,
        l.LotSizeAcres != null ? Math.round(Number(l.LotSizeAcres) * 43560) : null,
      ];
    });
    const photoRows = [];
    for (const [key, arr] of Object.entries(photos)) for (const p of arr) photoRows.push([key, p.ord, p.url]);

    await d1("DELETE FROM listing_photos");
    await d1("DELETE FROM listings");
    const LCOLS = ["id","slug","address","city","state","zip","price","beds","baths","baths_full","baths_half","sqft","lot_acres","year_built","garage","type","sub_type","category","status","lat","lng","view","waterfront","dom","photos_count","agent","office","taxes","hoa_fee","heating","cooling","parking","appliances","description","photo","updated",
      // Added 2026-08-19 (Liz's field request):
      "flooring","fireplaces","fireplace_yn","fireplace_features","roof","utilities","pool_features","listing_date","hoa_frequency","tour_url_mls","mls_number","stories","arch_style","construction","lot_features","condition","lot_sqft"];
    await insertRows("listings", LCOLS, listingRows, 25);
    await insertRows("listing_photos", ["listing_key","ord","url"], photoRows, 300);
    await d1(`INSERT OR REPLACE INTO sync_meta (id,last_synced_at,count) VALUES (1,${sqlVal(new Date().toISOString())},${listingRows.length})`);

    // Keep the emdash admin "Listings" collection (ec_listings) fresh. Non-fatal.
    // Collection/table registered once by emdash/seed/mirror-listings.mjs.
    let mirrored = 0;
    try { mirrored = await mirrorEmdashListings(); } catch (e) { console.error("emdash mirror (non-fatal):", e.message); }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, listings: listingRows.length, photos: photoRows.length, mirrored, ms: Date.now() - t0 });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ ok: false, error: e.message, ms: Date.now() - t0 });
  }
}
