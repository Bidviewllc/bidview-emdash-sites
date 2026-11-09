// Read-only listings access from the Trestle-synced D1 tables (listings,
// listing_photos). Shapes rows into the same JSON the prototype's listings/
// detail JS expects, so that client code ports over unchanged.
import { env } from "cloudflare:workers";
import { portableTextToHtml, plainToPortableText } from "./portabletext";

const DB = () => (env as any).DB as any;

// ── Owner checkboxes (ec_listings, never written by the Trestle sync) ────────
// SQL fragments for any query that joins `listings l LEFT JOIN ec_listings e
// ON e.id = l.id`. The columns are TEXT, and the admin checkbox saves a tick as
// '1.0' (so an untick as '0.0'), while SQL writes '1'/'0', so anything but
// empty/0/0.0/false counts as on.
// "Hide from search" drops a listing from every list, search, featured row,
// neighbourhood page, random section photo and the sitemap; its detail page
// still answers a direct link, with a noindex tag.
const OFF = "('', '0', '0.0', 'false')";
export const NOT_HIDDEN = `COALESCE(e.hidden, '') IN ${OFF}`;
const IS_FEATURED = `COALESCE(e.featured, '') NOT IN ${OFF}`;
// "Featured" listings sort ahead of the rest; put this first in ORDER BY.
export const FEATURED_FIRST = `(${IS_FEATURED}) DESC`;

// ── Days on market ───────────────────────────────────────────────────────────
// Trestle does NOT recompute DaysOnMarket daily. The MLS writes it when the
// record changes and then leaves it, so the feed hands us a number that is
// already stale. Measured 2026-09-10 across 28 listings: `listing_date + dom`
// lands within a day of `updated` (the ModificationTimestamp) every single
// time, while drift against real elapsed days ran 5-69 days — 580 Gonowabie
// Road had been listed 69 days and the feed still said dom = 0.
//
// So neither figure is printable as-is. Both are recomputed here on read. The
// API is only edge-cached for 120s, so a render-time calculation stays correct.
const DAY_MS = 86_400_000;

function daysSince(date: string | null | undefined): number | null {
	if (!date) return null;
	// Date-only values (listing_date) are anchored to UTC midnight; full
	// timestamps (updated) parse as-is.
	const ms = Date.parse(date.length <= 10 ? `${date}T00:00:00Z` : date);
	if (Number.isNaN(ms)) return null;
	return Math.max(0, Math.floor((Date.now() - ms) / DAY_MS));
}

/**
 * Days on the CURRENT listing contract, from ListingContractDate (100%
 * populated). A fixed date can't go stale, so this is right on every request
 * whether or not the sync has run. Falls back to the frozen feed value only if
 * the date is missing.
 */
export function liveDom(r: any): number | null {
	return daysSince(r.listing_date) ?? (r.dom ?? null);
}

/**
 * Total days across relists. CumulativeDaysOnMarket spans earlier contracts, so
 * unlike dom there is no single date to derive it from — take the feed's
 * snapshot and add the time elapsed since that snapshot was taken. `updated` is
 * the right anchor rather than our sync time, because the freeze happens at the
 * MLS, not in our pipeline. Never reports less than the current-contract count.
 */
export function liveCumDom(r: any): number | null {
	if (r.cum_dom == null) return null;
	const total = Number(r.cum_dom) + (daysSince(r.updated) ?? 0);
	const current = liveDom(r);
	return current == null ? total : Math.max(total, current);
}

// ── Features filter ──────────────────────────────────────────────────────────
// The listings page filters on features, not on raw MLS strings. Sending
// `parking`, `lot_features`, `security_features` etc. down to the browser for
// every card would roughly double the payload, so each listing is reduced here
// to the short list of feature keys it matches, and the page filters on those.
//
// THE KEYS ARE THE CONTRACT. `FEATURES` in public/listings/index.html maps the
// same keys to their checkbox labels. A key emitted here that the page doesn't
// know is ignored; a key the page knows that nothing emits hides itself (the
// page only shows options with at least one match). So the two lists can't get
// out of step in a way that breaks the search — but keep them together anyway.
//
// The multi-value MLS fields are comma-joined strings of RESO enum tokens
// ("Level, Wooded"). Tokenised rather than substring-matched so that, say,
// "SmokeDetectors" can be excluded from the gated/security test without also
// killing "SecuritySystemOwned" on the same listing.
const tokens = (v: any): string[] =>
	String(v ?? "").split(",").map(s => s.trim()).filter(Boolean);
const has = (v: any, re: RegExp): boolean => tokens(v).some(t => re.test(t));

export function featuresOf(r: any): string[] {
	const f: string[] = [];
	// The lot
	if (r.waterfront === 1) f.push("waterfront");
	if (Number(r.lot_acres) >= 1) f.push("acre");
	if (has(r.lot_features, /^Level$/i)) f.push("level");
	if (has(r.lot_features, /Wooded/i)) f.push("wooded");
	if (has(r.lot_features, /Greenbelt/i)) f.push("greenbelt");
	if (has(r.lot_features, /Cul-?De-?Sac/i)) f.push("culdesac");
	// The home
	if (Number(r.stories) === 1) f.push("single");
	if (Number(r.main_level_beds) >= 1) f.push("mainbed");
	if (tokens(r.cooling).length) f.push("ac");
	if (tokens(r.pool_features).length) f.push("pool");
	if (tokens(r.spa_features).length || r.spa_yn === 1) f.push("spa");
	// "In unit" means the laundry is inside the home. Checked against the live feed
	// 2026-09-21: it says where the laundry IS (LaundryRoom, LaundryCloset, InHall,
	// InKitchen, InBathroom, InGarage, LaundryInUtilityRoom, MainLevel), and the only
	// values that mean "not in the home" are CommonArea and None. Listing what counts
	// missed InHall and InBathroom — 21 listings — so this asks the other question:
	// anything at all beyond those two is laundry you have to yourself.
	if (tokens(r.laundry_features).some(t => !/^(CommonArea|None|SeeRemarks)$/i.test(t))) f.push("laundry");
	if (Number(r.year_built) >= 2015) f.push("newbuild");
	if (r.tour_url_mls) f.push("tour");
	// Parking
	if (Number(r.garage) >= 1) f.push("garage");
	if (Number(r.garage) >= 2) f.push("garage2");
	if (has(r.parking, /Rv|Boat/i)) f.push("rvboat");
	if (has(r.parking, /ElectricVehicle|EvCharg/i)) f.push("ev");
	// Community. Life-safety kit says nothing about a property being secured and is
	// on most listings — SmokeDetectors alone accounts for 43 of the 88 that fill
	// this field — so it is dropped before the test. FireAlarm and SecurityLights
	// are in that same category despite their names, which a bare /Alarm/ got wrong.
	// What's left in this feed: SecuritySystem, ClosedCircuitCameras, and
	// ControlledAccess (which arrives under the HOA's amenities, not security).
	const guard = /Gate|Guard|SecuritySystem|ControlledAccess|KeyCard|Camera|Surveillance|Doorman|Concierge/i;
	const lifeSafety = /Detector|Sprinkler|Extinguisher|FireAlarm|SecurityLights/i;
	const realSecurity = (v: any) =>
		tokens(v).filter(t => !lifeSafety.test(t)).some(t => guard.test(t));
	if (realSecurity(r.security_features) || realSecurity(r.assoc_amenities)) f.push("gated");
	if (Number(r.hoa_fee) > 0) f.push("hoa"); else f.push("nohoa");
	return f;
}

// ── Status ───────────────────────────────────────────────────────────────────
// The sync keeps Active, ActiveUnderContract and Pending listings on the site
// (2026-11-03; before that a home vanished the moment it went under contract),
// and `listing_archive` holds what left the feed. These are Liz's labels for
// the badge every card and detail page shows. The MLS calls
// ActiveUnderContract "Contingent"; we don't.
export const STATUS_LABELS: Record<string, string> = {
	Active: "On market",
	ActiveUnderContract: "Under contract",
	Pending: "Pending",
	Closed: "Sold",
};
export const statusLabel = (status: string | null | undefined): string =>
	STATUS_LABELS[String(status ?? "")] ?? "On market";
// What the live pull keeps, in the order the cards sort them (on market first).
const LIVE_STATUSES = "('Active','ActiveUnderContract','Pending')";
const LIVE_ORDER = "CASE l.status WHEN 'Active' THEN 0 WHEN 'ActiveUnderContract' THEN 1 ELSE 2 END";
// Which listings may sit in a featured row (home, community, blog sidebar). On
// market by default; a listing ticked "Featured" stays in while under contract or
// pending too (Liz, SOLD-ARCHIVE-PLAN.md section 7), with its status badge.
export const FEATURED_ROW = `(l.status = 'Active' OR (${IS_FEATURED} AND l.status IN ${LIVE_STATUSES})) AND ${NOT_HIDDEN}`;

// ── Recently Sold ────────────────────────────────────────────────────────────
// Grant's MLS agent id, as the feed writes it in the four agent-id fields.
export const GRANT_AGENT_ID = "meyergra111";
// Liz, 2026-11-03: /sold/ shows every sale Grant was on a side of, plus any
// other closed sale at or above this price in the last few years. The sync's
// backfill uses the same floor (SOLD_OTHERS_MIN_PRICE in sync.mjs); this one
// only decides what the page shows, so lowering it here never needs a re-pull
// as long as it stays at or above the sync's.
export const SOLD_OTHERS_MIN_PRICE = 5_000_000;
export const SOLD_OTHERS_YEARS = 3;

/** Which side(s) Grant represented on an archive row, or null if neither. */
export function representedBy(r: any): "seller" | "buyer" | "both" | null {
	const seller = r.list_agent_id === GRANT_AGENT_ID || r.co_list_agent_id === GRANT_AGENT_ID;
	const buyer = r.buyer_agent_id === GRANT_AGENT_ID || r.co_buyer_agent_id === GRANT_AGENT_ID;
	return seller && buyer ? "both" : seller ? "seller" : buyer ? "buyer" : null;
}
export const representedLabel = (side: ReturnType<typeof representedBy>): string | null =>
	side === "both" ? "Represented both sides" : side === "seller" ? "Represented the seller" : side === "buyer" ? "Represented the buyer" : null;

// ── Bathrooms ────────────────────────────────────────────────────────────────
// The feed's BathroomsTotalInteger counts a half bath as a whole one (2 full + 1
// half = 3), so the headline figure overstated the home and disagreed with the
// description. Every half bath counts as 0.5 here ("2.5"); the listing page's
// details table still shows full and half separately. Falls back to the feed's
// total when the full-bath count is missing (14 of 181 live listings, 2026-11-06).
export function bathsOf(r: any): number | null {
	const full = r.baths_full ?? r.bathsFull;
	const half = r.baths_half ?? r.bathsHalf;
	if (full == null || full === "") return r.baths ?? null;
	return Number(full) + 0.5 * Number(half || 0);
}

// ── Listing brokerage credit ─────────────────────────────────────────────────
// IDX rules: every listing display names the listing brokerage, in a readable
// size and colour. Cards print this line; the listing page prints the agent too.
export const courtesyOf = (r: any): string | null =>
	r.office ? `Listing courtesy of ${r.office}` : null;

/**
 * When the sync last finished pulling the MLS (sync_meta), as an ISO string.
 * IDX rules ask for the date the data was last updated on every display; the
 * search page and listing page print it. Null if the table can't be read.
 */
export async function lastSyncedAt(): Promise<string | null> {
	try {
		const row: any = await DB().prepare("SELECT last_synced_at FROM sync_meta WHERE id = 1").first();
		return row?.last_synced_at ?? null;
	} catch { return null; }
}

export function toListing(r: any) {
	return {
		id: r.id, slug: r.slug, address: r.address,
		city: r.city, state: r.state, zip: r.zip,
		price: r.price, beds: r.beds, baths: bathsOf(r),
		sqft: r.sqft, lotAcres: r.lot_acres, yearBuilt: r.year_built,
		type: r.type, subType: r.sub_type, category: r.category, status: r.status,
		statusLabel: statusLabel(r.status),
		lat: r.lat, lng: r.lng, view: r.view, waterfront: r.waterfront === 1,
		dom: liveDom(r), photosCount: r.photos_count, agent: r.agent, office: r.office,
		updated: r.updated, photo: r.photo, feats: featuresOf(r),
	};
}
export function toDetail(r: any) {
	return {
		id: r.id, address: r.address, city: r.city, state: r.state, zip: r.zip,
		price: r.price, beds: r.beds, baths: bathsOf(r), bathsFull: r.baths_full, bathsHalf: r.baths_half,
		sqft: r.sqft, lotAcres: r.lot_acres, yearBuilt: r.year_built, garage: r.garage,
		view: r.view, description: r.description, status: r.status,
		statusLabel: statusLabel(r.status),
		type: r.type, subType: r.sub_type, category: r.category,
		taxes: r.taxes, daysOnMarket: liveDom(r), agent: r.agent, office: r.office,
		lat: r.lat, lng: r.lng, hoaFee: r.hoa_fee, heating: r.heating, cooling: r.cooling,
		parking: r.parking, appliances: r.appliances, updated: r.updated, slug: r.slug,
		// Added 2026-08-19 (Liz's field request — for the Features/Amenities cards + 3D tour):
		flooring: r.flooring, fireplaces: r.fireplaces, fireplaceYN: r.fireplace_yn,
		fireplaceFeatures: r.fireplace_features, roof: r.roof, utilities: r.utilities,
		poolFeatures: r.pool_features, listingDate: r.listing_date, hoaFrequency: r.hoa_frequency,
		tourUrlMls: r.tour_url_mls, mlsNumber: r.mls_number, stories: r.stories,
		archStyle: r.arch_style, construction: r.construction, lotFeatures: r.lot_features,
		condition: r.condition, lotSqft: r.lot_sqft,
		// Added 2026-09-10: total days across relists (null when the feed has none).
		cumulativeDaysOnMarket: liveCumDom(r),
	};
}

/** True when the listing at `slug` is ticked "Hide from search" (detail page adds noindex). */
export async function isHiddenSlug(slug: string): Promise<boolean> {
	try {
		const row = await DB().prepare(
			`SELECT 1 AS h FROM listings l JOIN ec_listings e ON e.id = l.id WHERE l.slug = ? AND NOT (${NOT_HIDDEN})`
		).bind(slug).first();
		if (row) return true;
		// A sold page: the tick lives in ec_sold_listings (or the snapshot taken as it left the feed).
		const sold = await DB().prepare(
			`SELECT 1 AS h FROM listing_archive a LEFT JOIN ec_sold_listings e ON e.id = a.id WHERE a.slug = ? AND NOT (${NOT_HIDDEN_ARCHIVE})`
		).bind(slug).first();
		return !!sold;
	} catch {
		return false;
	}
}

/**
 * Everything on the market: active, under contract and pending, in that order,
 * then priciest first. Feeds /listings/ (where the status badge tells them
 * apart) and the sitemap. Listings ticked "Hide from search" are left out. The
 * home, community and blog featured rows use FEATURED_ROW instead.
 */
export async function allLive() {
	// LEFT JOIN the emdash mirror so cards can surface a "Grant's note" flag. Owner
	// note lives in ec_listings.owner_note (preserved across every sync).
	const { results } = await DB().prepare(
		`SELECT l.*, e.owner_note AS owner_note FROM listings l LEFT JOIN ec_listings e ON e.id = l.id WHERE l.status IN ${LIVE_STATUSES} AND ${NOT_HIDDEN} ORDER BY ${LIVE_ORDER}, (l.photo IS NULL), l.price DESC`
	).all();
	return (results ?? []).map((r: any) => ({ ...toListing(r), ownerNote: r.owner_note ?? null }));
}

// ── Sold listings (listing_archive + ec_sold_listings) ───────────────────────
// Rows the sync marked `sold`, shaped like a card plus the close facts. Grant's
// fields for a sale live in the `sold_listings` admin collection
// (ec_sold_listings, built by seed/mirror-sold-listings.mjs and kept fresh by
// the sync). Until a sale has a row there, the Hidden tick he set while the
// listing was live still counts (it travels in owner_snapshot).
function toSoldCard(r: any) {
	const side = representedBy(r);
	return {
		...toListing(r),
		headline: r.e_headline || null,
		photo: r.main_photo_url || r.photo || null,
		closePrice: r.close_price ?? null,
		closeDate: r.close_date ?? null,
		represented: side,
		representedLabel: representedLabel(side),
	};
}
const NOT_HIDDEN_ARCHIVE = `COALESCE(NULLIF(e.hidden, ''), json_extract(a.owner_snapshot, '$.hidden'), '') IN ${OFF}`;
const GRANT_ON_A_SIDE = `(a.list_agent_id = ? OR a.buyer_agent_id = ? OR a.co_list_agent_id = ? OR a.co_buyer_agent_id = ?)`;
// "Featured sale" in the admin leads its section on /sold/.
const SOLD_FEATURED_FIRST = `(COALESCE(e.featured, '') NOT IN ${OFF}) DESC`;
const SOLD_SELECT = `SELECT a.*, e.headline AS e_headline FROM listing_archive a LEFT JOIN ec_sold_listings e ON e.id = a.id`;

/** Every closed sale Grant was on a side of, newest close first. */
export async function soldByGrant() {
	try {
		const { results } = await DB().prepare(
			`${SOLD_SELECT} WHERE a.archive_status = 'sold' AND ${GRANT_ON_A_SIDE} AND ${NOT_HIDDEN_ARCHIVE} ORDER BY ${SOLD_FEATURED_FIRST}, a.close_date DESC, a.close_price DESC`
		).bind(GRANT_AGENT_ID, GRANT_AGENT_ID, GRANT_AGENT_ID, GRANT_AGENT_ID).all();
		return (results ?? []).map(toSoldCard);
	} catch { return []; }
}
/** Other agents' closed sales at or above the floor, within the window. */
export async function soldNotable() {
	try {
		const since = new Date();
		since.setFullYear(since.getFullYear() - SOLD_OTHERS_YEARS);
		const { results } = await DB().prepare(
			`${SOLD_SELECT} WHERE a.archive_status = 'sold' AND NOT ${GRANT_ON_A_SIDE} AND a.close_price >= ? AND a.close_date >= ? AND ${NOT_HIDDEN_ARCHIVE} ORDER BY ${SOLD_FEATURED_FIRST}, a.close_date DESC, a.close_price DESC`
		).bind(GRANT_AGENT_ID, GRANT_AGENT_ID, GRANT_AGENT_ID, GRANT_AGENT_ID, SOLD_OTHERS_MIN_PRICE, since.toISOString().slice(0, 10)).all();
		return (results ?? []).map(toSoldCard);
	} catch { return []; }
}
/** Slugs of every sold listing the site shows, for the sitemap. */
export async function soldSlugs(): Promise<string[]> {
	const [a, b] = await Promise.all([soldByGrant(), soldNotable()]);
	return [...a, ...b].map((l: any) => l.slug).filter(Boolean);
}
/**
 * The lead photo of one active Residential listing, picked at random -- a house,
 * never a vacant lot or a commercial building. Used as a section image on
 * /buyers/, so it changes each time the edge cache (5 min) refreshes the page.
 * Returns null when the query fails or nothing matches; callers fall back.
 */
export async function randomHomePhoto(): Promise<string | null> {
	try {
		const row = await DB().prepare(
			`SELECT l.photo FROM listings l LEFT JOIN ec_listings e ON e.id = l.id WHERE l.status='Active' AND l.type='Residential' AND l.photo IS NOT NULL AND l.photo != '' AND ${NOT_HIDDEN} ORDER BY RANDOM() LIMIT 1`
		).first();
		return (row as any)?.photo ?? null;
	} catch {
		return null;
	}
}
/**
 * Lead photos of `n` different active Residential listings, picked at random --
 * for a page that needs more than one (/sellers/). Same rules as
 * randomHomePhoto; the array is shorter than `n` (or empty) when fewer match or
 * the query fails, so callers fall back per slot.
 */
export async function randomHomePhotos(n: number): Promise<string[]> {
	try {
		const { results } = await DB().prepare(
			`SELECT l.photo FROM listings l LEFT JOIN ec_listings e ON e.id = l.id WHERE l.status='Active' AND l.type='Residential' AND l.photo IS NOT NULL AND l.photo != '' AND ${NOT_HIDDEN} ORDER BY RANDOM() LIMIT ?`
		).bind(n).all();
		return (results ?? []).map((r: any) => r.photo);
	} catch {
		return [];
	}
}

/**
 * The first `n` photo URLs of one listing, in MLS order (so [0] is the card's
 * lead photo). For the hover carousel on /listings/ -- fetched per card on
 * hover rather than shipped in /api/listings, which would add ~4 long signed
 * URLs to every one of ~190 cards for the few a visitor actually points at.
 */
export async function listingPhotos(listingKey: string, n: number): Promise<string[]> {
	const { results } = await DB().prepare(
		"SELECT url FROM listing_photos WHERE listing_key = ? ORDER BY ord LIMIT ?"
	).bind(listingKey, n).all();
	return (results ?? []).map((p: any) => p.url);
}

/**
 * A listing that is no longer live, looked up in the archive. Sold rows come
 * back shaped like a live listing (one photo, the close facts, Grant's saved
 * fields) so the detail page can show them with a Sold badge. Anything else
 * that left the feed (expired, withdrawn, cancelled) returns `{ gone: true }`
 * and the routes answer 410 so search engines drop the URL.
 */
async function archivedBySlug(slug: string) {
	let row: any;
	try {
		row = await DB().prepare("SELECT * FROM listing_archive WHERE slug = ? ORDER BY (archive_status = 'sold') DESC, close_date DESC LIMIT 1").bind(slug).first();
	} catch { row = null; }
	if (!row) return null;
	if (row.archive_status !== "sold") return { gone: true as const };
	const clean = (v: any) => { const s = (v ?? "").toString().trim(); return s === "" ? null : s; };
	// Grant's fields: the Sold Listings admin row once the mirror has made one
	// (edits after the sale land there), else the snapshot taken as the listing
	// left the feed. A description still equal to the MLS snapshot is not "custom".
	const ov = await getOverride(row.id, "ec_sold_listings");
	let fields: { description: string | null; isCustom: boolean; note: string | null; headline: string | null; tourUrl: string | null; noteImage: string | null; noteVideos: string | null; floorPlanEmbed: string | null; floorPlanImages: string | null };
	if (ov.exists) {
		fields = { description: ov.description ?? ov.mlsDescription, isCustom: ov.isOverride, note: ov.note, headline: ov.headline, tourUrl: ov.tourUrl, noteImage: ov.noteImage, noteVideos: ov.noteVideos, floorPlanEmbed: ov.floorPlanEmbed, floorPlanImages: ov.floorPlanImages };
	} else {
		let snap: any = {};
		try { snap = row.owner_snapshot ? JSON.parse(row.owner_snapshot) : {}; } catch { snap = {}; }
		const customPT = clean(snap.description);
		fields = { description: customPT, isCustom: !!customPT, note: clean(snap.owner_note), headline: clean(snap.headline), tourUrl: clean(snap.tour_url), noteImage: clean(snap.note_image), noteVideos: clean(snap.note_videos), floorPlanEmbed: clean(snap.floor_plan_embed), floorPlanImages: clean(snap.floor_plan_images) };
	}
	const pt = fields.description;
	const descriptionHtml = portableTextToHtml(pt ? (pt.startsWith("[") ? pt : plainToPortableText(pt)) : plainToPortableText(row.description ?? ""));
	const detail = toDetail(row);
	detail.description = descriptionHtml;
	const side = representedBy(row);
	const photo = row.main_photo_url || row.photo || null;
	return {
		listing: {
			...detail,
			descriptionHtml,
			descriptionIsCustom: fields.isCustom,
			ownerNote: fields.note,
			headline: fields.headline,
			tourUrl: fields.tourUrl ?? matterportFrom(row.tour_url_mls),
			noteImage: fields.noteImage,
			noteVideos: fields.noteVideos,
			floorPlanEmbed: fields.floorPlanEmbed,
			floorPlanImages: fields.floorPlanImages,
			archived: true,
			sold: {
				closePrice: row.close_price ?? null,
				closeDate: row.close_date ?? null,
				represented: side,
				representedLabel: representedLabel(side),
			},
		},
		photos: photo ? [photo] : [],
	};
}

// The 3D tour section only plays Matterport tours. The MLS tour field is more often
// a whole marketing site or a video, so it fills the section only when it holds a
// Matterport link; the admin sees the raw value under the 3D Tour URL field and can
// copy anything else across by hand. The field sometimes holds two links.
function matterportFrom(raw: unknown): string | null {
	for (const part of String(raw ?? "").split(/[\s,]+/)) {
		try {
			const u = new URL(part);
			if (/(^|\.)matterport\.com$/i.test(u.hostname) && (u.searchParams.get("m") || /\/models\/[A-Za-z0-9]+/.test(u.pathname))) return u.href;
		} catch { /* not a URL */ }
	}
	return null;
}

export async function bySlug(slug: string) {
	const row = await DB().prepare("SELECT * FROM listings WHERE slug = ?").bind(slug).first();
	if (!row) return archivedBySlug(slug);
	const { results } = await DB().prepare(
		"SELECT url FROM listing_photos WHERE listing_key = ? ORDER BY ord"
	).bind((row as any).id).all();
	const ov = await getOverride((row as any).id);
	// description is stored as Portable Text (WYSIWYG). Fall back to the live MLS
	// remarks (converted) if the snapshot is somehow missing.
	const effectivePT = ov.description ?? ov.mlsDescription ?? plainToPortableText((row as any).description ?? "");
	const descriptionHtml = portableTextToHtml(effectivePT);
	const detail = toDetail(row);
	detail.description = descriptionHtml; // legacy field now carries rendered HTML
	return {
		listing: {
			...detail,
			descriptionHtml,
			descriptionIsCustom: ov.isOverride,
			ownerNote: ov.note,
			// Empty headline falls back to the address at render time, so a corrected
			// address keeps flowing through rather than being frozen into a field.
			headline: ov.headline,
			tourUrl: ov.tourUrl ?? matterportFrom(detail.tourUrlMls),
			noteImage: ov.noteImage,
			noteVideos: ov.noteVideos,
			floorPlanEmbed: ov.floorPlanEmbed,
			floorPlanImages: ov.floorPlanImages,
		},
		photos: (results ?? []).map((p: any) => p.url),
	};
}

// --- Per-listing owner overrides (note + description) ------------------------
// Source of truth = the emdash `listings` collection (ec_listings), columns
// `description` + `owner_note`, keyed by the listing id. This is the SAME row the
// admin backend edits, so an edit in /_emdash/admin OR the inline detail-page editor
// both land here and show on the site. The Trestle sync's mirror updates only the
// MLS columns (ON CONFLICT DO UPDATE), never these two, so overrides survive every
// sync. A set description REPLACES the MLS remarks; clearing it reverts to MLS.
export async function getOverride(listingKey: string, table: OwnerTable = "ec_listings"): Promise<{ exists: boolean; note: string | null; description: string | null; mlsDescription: string | null; isOverride: boolean; headline: string | null; tourUrl: string | null; noteImage: string | null; noteVideos: string | null; floorPlanEmbed: string | null; floorPlanImages: string | null }> {
	try {
		// SELECT * rather than a column list: a newly added owner field then reads
		// as null until the mirror script has added its column, instead of the
		// whole query failing and blanking every override on the page.
		const row = await DB().prepare(`SELECT *, "_mls_description" AS mls_description FROM ${table} WHERE id = ?`).bind(listingKey).first();
		const clean = (v: any) => { const s = (v ?? "").toString().trim(); return s === "" ? null : s; };
		const description = clean((row as any)?.description);
		const mlsDescription = clean((row as any)?.mls_description);
		return { exists: !!row, note: clean((row as any)?.owner_note), description, mlsDescription, isOverride: !!(description && description !== mlsDescription), headline: clean((row as any)?.headline), tourUrl: clean((row as any)?.tour_url), noteImage: clean((row as any)?.note_image), noteVideos: clean((row as any)?.note_videos), floorPlanEmbed: clean((row as any)?.floor_plan_embed), floorPlanImages: clean((row as any)?.floor_plan_images) };
	} catch { return { exists: false, note: null, description: null, mlsDescription: null, isOverride: false, headline: null, tourUrl: null, noteImage: null, noteVideos: null, floorPlanEmbed: null, floorPlanImages: null }; }
}
export async function getNote(listingKey: string): Promise<string | null> {
	return (await getOverride(listingKey)).note;
}
// emdash 1.x stores content datetimes as UTC ISO with milliseconds, not datetime('now').
const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
export async function setNote(listingKey: string, note: string, table: OwnerTable = "ec_listings"): Promise<void> {
	const trimmed = (note ?? "").toString().slice(0, 8000);
	const v = trimmed.trim() === "" ? null : trimmed;
	await DB().prepare(`UPDATE ${table} SET owner_note = ?, updated_at = ${NOW_SQL} WHERE id = ?`).bind(v, listingKey).run();
}
// Empty description = "reset to MLS": set it back to the snapshot so it tracks the
// feed again. A non-empty value becomes the owner override (preserved across sync).
export async function setDescription(listingKey: string, description: string, table: OwnerTable = "ec_listings"): Promise<void> {
	const trimmed = (description ?? "").toString().slice(0, 16000);
	if (trimmed.trim() === "") {
		await DB().prepare(`UPDATE ${table} SET description = "_mls_description", updated_at = ${NOW_SQL} WHERE id = ?`).bind(listingKey).run();
		return;
	}
	// Store as Portable Text: pass through if already PT JSON, else convert plain text.
	const val = trimmed.trim().startsWith("[") ? trimmed : plainToPortableText(trimmed);
	await DB().prepare(`UPDATE ${table} SET description = ?, updated_at = ${NOW_SQL} WHERE id = ?`).bind(val, listingKey).run();
}
// Resolve a listing's id from its slug (the client edits by slug; notes key on id).
export async function keyForSlug(slug: string): Promise<string | null> {
	const row = await DB().prepare("SELECT id FROM listings WHERE slug = ?").bind(slug).first();
	return (row as any)?.id ?? null;
}
// Which owner table a slug's fields live in: ec_listings while the listing is
// live, ec_sold_listings once it has sold (the inline note editor on a sold page
// writes there). Null when the slug is unknown or the sale is not shown.
export type OwnerTable = "ec_listings" | "ec_sold_listings";
export async function ownerRowForSlug(slug: string): Promise<{ id: string; table: OwnerTable } | null> {
	const live = await keyForSlug(slug);
	if (live) return { id: live, table: "ec_listings" };
	try {
		const row = await DB().prepare("SELECT id FROM ec_sold_listings WHERE slug = ?").bind(slug).first();
		if ((row as any)?.id) return { id: (row as any).id, table: "ec_sold_listings" };
	} catch { /* collection not built yet */ }
	return null;
}
