/**
 * Trestle MLS access — shared by the Vercel serverless functions.
 *
 * This is a port of cf-worker/worker.js. It exists because Trestle's WAF
 * (Imperva/Incapsula) 403s requests from Cloudflare Workers' egress IPs; this
 * deployment tests whether Vercel's egress is treated any differently.
 *
 * PRODUCTION feed (IDX Plus) — BILLED per Trestle contract. Listings are
 * fetched once and cached; the browser filters over that payload.
 */

// Trestle credentials come from the environment only (never commit secrets).
// Set TRESTLE_CLIENT_ID / TRESTLE_CLIENT_SECRET in Vercel project env.
export const TOKEN_URL  = "https://api.cotality.com/trestle/oidc/connect/token";
export const ODATA_BASE = "https://api.cotality.com/trestle/odata";

export const LISTINGS_TTL = 900; // 15 min

const UA = "GrantCMeyerHomes/1.0 (+https://grantcmeyer.com)";

const LIST_SELECT = [
  "ListingKey", "UnparsedAddress", "StreetNumber", "StreetName", "StreetSuffix",
  "City", "StateOrProvince", "PostalCode", "ListPrice", "BedroomsTotal",
  "BathroomsTotalInteger", "LivingArea", "LotSizeAcres", "YearBuilt",
  "PropertyType", "PropertySubType", "StandardStatus", "Latitude", "Longitude",
  "View", "WaterfrontYN", "DaysOnMarket", "PhotosCount", "ListAgentFullName",
  "ListOfficeName", "ModificationTimestamp",
].join(",");

const DETAIL_SELECT = [
  "ListingKey", "UnparsedAddress", "StreetNumber", "StreetName", "StreetSuffix",
  "City", "StateOrProvince", "PostalCode", "ListPrice", "BedroomsTotal",
  "BathroomsTotalInteger", "BathroomsFull", "BathroomsHalf", "LivingArea",
  "LotSizeAcres", "YearBuilt", "GarageSpaces", "View", "PublicRemarks",
  "StandardStatus", "PropertyType", "PropertySubType", "TaxAnnualAmount",
  "DaysOnMarket", "ListAgentFullName", "ListOfficeName", "Latitude", "Longitude",
  "AssociationFee", "Heating", "Cooling", "ParkingFeatures", "Appliances",
  "ModificationTimestamp",
].join(",");

const clientId = () => process.env.TRESTLE_CLIENT_ID;
const secret   = () => process.env.TRESTLE_CLIENT_SECRET;

export function slugify(s) {
  return (s || "").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addressOf(l) {
  const unparsed = (l.UnparsedAddress || "").trim();
  if (unparsed) return unparsed;
  return `${l.StreetNumber || ""} ${l.StreetName || ""} ${l.StreetSuffix || ""}`
    .replace(/\s+/g, " ").trim();
}

/**
 * A single, non-overlapping category for filtering.
 *
 * PropertySubType can't be trusted alone: Land parcels carry
 * "SingleFamilyResidence" and leases carry "MultiFamily"/"Commercial", so
 * filtering on it files vacant land under Single Family. PropertyType wins.
 */
export function categoryOf(l) {
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

export async function getToken() {
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId(),
      client_secret: secret(),
      scope: "api",
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    const err = new Error(`Token failed: ${resp.status}`);
    err.status = resp.status;
    err.body = body.slice(0, 400);
    throw err;
  }
  return (await resp.json()).access_token;
}

export async function odata(token, pathAndQuery) {
  const url = pathAndQuery.startsWith("http")
    ? pathAndQuery
    : `${ODATA_BASE}/${pathAndQuery}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": UA },
  });
  if (!resp.ok) throw new Error(`OData failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`);
  return resp.json();
}

/** Trestle accepts `in (...)` of >=60 keys; 50 keeps headroom. */
async function fetchPrimaryPhotos(token, keys) {
  const batches = [];
  for (let i = 0; i < keys.length; i += 50) batches.push(keys.slice(i, i + 50));

  const results = await Promise.all(batches.map(batch => {
    const inList = batch.join("','");
    const q = `Media?$filter=${encodeURIComponent(`ResourceRecordKey in ('${inList}') and Order eq 1`)}` +
              `&$select=ResourceRecordKey,MediaURL&$top=200`;
    // A photo failure must not take the page down — cards fall back to a placeholder.
    return odata(token, q).catch(() => ({ value: [] }));
  }));

  const map = {};
  for (const r of results) {
    for (const m of r.value || []) if (m.MediaURL) map[m.ResourceRecordKey] = m.MediaURL;
  }
  return map;
}

export async function fetchAllActive(token) {
  const rows = [];
  let next = `Property?$filter=${encodeURIComponent("StandardStatus eq 'Active'")}` +
             `&$select=${LIST_SELECT}&$top=200`;
  let guard = 0;
  while (next && guard++ < 20) {
    const page = await odata(token, next);
    rows.push(...(page.value || []));
    next = page["@odata.nextLink"] || null;
  }

  const photos = await fetchPrimaryPhotos(token, rows.map(r => r.ListingKey));

  const seen = new Set();
  return rows.map(l => {
    const address = addressOf(l);
    const citySlug = slugify(l.City) || "lake-tahoe";
    const stateSlug = slugify(l.StateOrProvince) || "nv";
    let slug = `${citySlug}-${stateSlug}/${slugify(address) || l.ListingKey}`;
    if (seen.has(slug)) slug = `${slug}-${l.ListingKey}`;
    seen.add(slug);

    return {
      id: l.ListingKey,
      address,
      city: l.City || null,
      state: l.StateOrProvince || null,
      zip: l.PostalCode || null,
      price: l.ListPrice ?? null,
      beds: l.BedroomsTotal ?? null,
      baths: l.BathroomsTotalInteger ?? null,
      sqft: l.LivingArea ?? null,
      lotAcres: l.LotSizeAcres ?? null,
      yearBuilt: l.YearBuilt ?? null,
      type: l.PropertyType || null,
      subType: l.PropertySubType || null,
      category: categoryOf(l),
      status: l.StandardStatus || null,
      lat: l.Latitude ?? null,
      lng: l.Longitude ?? null,
      view: l.View || null,
      waterfront: l.WaterfrontYN === true,
      dom: l.DaysOnMarket ?? null,
      photosCount: l.PhotosCount ?? 0,
      agent: l.ListAgentFullName || null,
      office: l.ListOfficeName || null,
      updated: l.ModificationTimestamp || null,
      photo: photos[l.ListingKey] || null,
      slug,
    };
  });
}

export async function fetchListingDetail(token, key) {
  const safeKey = String(key).replace(/'/g, "''");
  const data = await odata(token,
    `Property?$filter=${encodeURIComponent(`ListingKey eq '${safeKey}'`)}&$select=${DETAIL_SELECT}`);
  const l = data.value?.[0];
  if (!l) return null;

  const media = await odata(token,
    `Media?$filter=${encodeURIComponent(`ResourceRecordKey eq '${safeKey}'`)}` +
    `&$select=MediaKey,MediaURL,Order&$orderby=Order&$top=50`
  ).catch(() => ({ value: [] }));

  return {
    listing: {
      id: l.ListingKey,
      address: addressOf(l),
      city: l.City, state: l.StateOrProvince, zip: l.PostalCode,
      price: l.ListPrice, beds: l.BedroomsTotal, baths: l.BathroomsTotalInteger,
      bathsFull: l.BathroomsFull, bathsHalf: l.BathroomsHalf,
      sqft: l.LivingArea, lotAcres: l.LotSizeAcres, yearBuilt: l.YearBuilt,
      garage: l.GarageSpaces, view: l.View, description: l.PublicRemarks,
      status: l.StandardStatus, type: l.PropertyType, subType: l.PropertySubType,
      category: categoryOf(l),
      taxes: l.TaxAnnualAmount, daysOnMarket: l.DaysOnMarket,
      agent: l.ListAgentFullName, office: l.ListOfficeName,
      lat: l.Latitude, lng: l.Longitude,
      hoaFee: l.AssociationFee, heating: l.Heating, cooling: l.Cooling,
      parking: l.ParkingFeatures, appliances: l.Appliances,
      updated: l.ModificationTimestamp,
    },
    photos: (media.value || []).map(m => m.MediaURL).filter(Boolean),
  };
}

/**
 * Warm-lambda memo. Vercel's edge cache (via Cache-Control) does the heavy
 * lifting; this just stops a single warm instance re-fetching within the TTL.
 */
const memo = { listings: null, at: 0 };

export async function getListingsCached() {
  const now = Date.now();
  if (memo.listings && now - memo.at < LISTINGS_TTL * 1000) {
    return { listings: memo.listings, hit: true };
  }
  const listings = await fetchAllActive(await getToken());
  memo.listings = listings;
  memo.at = now;
  return { listings, hit: false };
}
