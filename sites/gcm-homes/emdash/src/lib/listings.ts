// Read-only listings access from the Trestle-synced D1 tables (listings,
// listing_photos, listing_archive) and the admin "Listings" collection
// (ec_listings). Shapes rows into the same JSON the prototype's listings/detail
// JS expects, so that client code ports over unchanged.
//
// 2026-11-09 — ONE PAGE PER HOME (sites/gcm-homes/PROPERTY-PAGES-PLAN.md).
// The MLS gives a home a new listing number every time it is relisted or
// resold, and the site used to make a new page per listing. Now a HOME is one
// row in ec_listings, keyed by parcel number (`p-<parcel>`), with one URL that
// never changes; every URL ever used for it (`property_slugs`) answers 301.
// The home row carries Grant's fields, its status (`home_status`) and the key of
// its current listing (`_current_listing`); the MLS facts come from `listings`
// while that listing is live and from `listing_archive` afterwards.
import { env } from "cloudflare:workers";
import { portableTextToHtml, plainToPortableText } from "./portabletext";

const DB = () => (env as any).DB as any;

// ── Owner checkboxes (ec_listings, never written by the Trestle sync) ────────
// SQL fragments for any query that joins the live table to its home row:
//   listings l ${HOME_JOIN}   (= LEFT JOIN ec_listings e ON e.id = 'p-' || l.parcel_number)
// The columns are TEXT, and the admin checkbox saves a tick as '1.0' (so an
// untick as '0.0'), while SQL writes '1'/'0', so anything but
// empty/0/0.0/false counts as on.
// "Hide from search" drops a home from every list, search, featured row,
// neighbourhood page, random section photo and the sitemap; its page still
// answers a direct link, with a noindex tag.
const OFF = "('', '0', '0.0', 'false')";
// The MLS writes the same parcel two ways across the years ("130-191-07" and
// "13019107"), so a home's id is `p-` + the parcel with punctuation stripped.
// A Washoe APN is 8 digits; a few listings add a "-000" suffix, dropped here
// (Douglas County's 12-digit APNs are left alone). Same rule as seed/lib/homes.mjs.
export const PARCEL_SQL = (col: string): string => { const x = `replace(replace(replace(${col},'-',''),' ',''),'.','')`; return `CASE WHEN length(${x}) = 11 AND ${x} LIKE '%000' THEN substr(${x},1,8) ELSE ${x} END`; };
export const normParcel = (s: unknown): string => { const n = String(s ?? "").replace(/[^0-9a-zA-Z]/g, ""); return n.length === 11 && n.endsWith("000") ? n.slice(0, 8) : n; };
export const HOME_JOIN = `LEFT JOIN ec_listings e ON e.id = 'p-' || ${PARCEL_SQL("l.parcel_number")}`;
// A home can carry two live MLS records at once (893 Donna Drive, 807 Alder 38
// on 2026-11-09: the same home entered twice). One page per home means one
// card: only the home's current listing is shown while that listing is live.
const CURRENT_ONLY = `(e.id IS NULL OR e."_current_listing" IS NULL OR e."_current_listing" = l.id OR NOT EXISTS (SELECT 1 FROM listings l2 WHERE l2.id = e."_current_listing"))`;
export const NOT_HIDDEN = `COALESCE(e.hidden, '') IN ${OFF} AND ${CURRENT_ONLY}`;
const IS_FEATURED = `COALESCE(e.featured, '') NOT IN ${OFF}`;
// "Featured" listings sort ahead of the rest; put this first in ORDER BY.
export const FEATURED_FIRST = `(${IS_FEATURED}) DESC`;
// Cards link to the HOME's URL (e.slug), never to a per-listing slug; add this
// to any SELECT that feeds toListing() so the link is right first time.
export const HOME_SLUG_COL = "e.slug AS home_slug";
const isOn = (v: any) => v != null && !["", "0", "0.0", "false"].includes(String(v).trim());

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
// ActiveUnderContract "Contingent"; we don't. A HOME's status (ec_listings
// .home_status, set by the sync from its current listing) uses the same five
// words: On market, Under contract, Pending, Sold, Off market.
export const STATUS_LABELS: Record<string, string> = {
	Active: "On market",
	ActiveUnderContract: "Under contract",
	Pending: "Pending",
	Closed: "Sold",
};
export const statusLabel = (status: string | null | undefined): string =>
	STATUS_LABELS[String(status ?? "")] ?? "On market";
export const HOME_STATUSES = ["On market", "Under contract", "Pending", "Sold", "Off market"] as const;
export type HomeStatus = (typeof HOME_STATUSES)[number];
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

// ── Listing history (2026-11-09) ─────────────────────────────────────────────
// Every MLS listing of the same home (grouped by parcel number in
// listing_archive), turned into one dated list: listed, price changes, under
// contract / pending, back on market, sold. Price and status changes come from
// listing_events, which the sync fills (see recordEvents in sync.mjs); before
// 2026-11-09 only each listing's latest change is known.
//
// Listings that ended off market (expired, withdrawn, cancelled) are left out
// for visitors: the IDX feed itself never carries those statuses, which usually
// means the MLS's display rules don't allow them on a public site. A logged-in
// admin sees them, marked adminOnly, so Grant still has the full story.
export type HistoryEvent = {
	date: string;
	event: string;
	price: number | null;
	change: number | null; // price change as a fraction of the old price
	adminOnly: boolean;
};
const STATUS_EVENT: Record<string, string> = {
	ActiveUnderContract: "Under contract",
	Pending: "Pending",
	Active: "Back on market",
};
// Same-day order, earliest step first: listed, price change, contract, sold.
const EVENT_RANK: Record<string, number> = { Listed: 0, "Price change": 1, "Back on market": 1, "Under contract": 2, Pending: 3, Sold: 4, "Off market": 4 };
const whenMs = (d: string) => Date.parse(d.length <= 10 ? `${d}T00:00:00Z` : d);

/** Every archive row of one home, newest listing first (a live one first of all). */
async function archiveRowsForHome(parcel: string | null, listingId: string): Promise<any[]> {
	try {
		const { results } = parcel
			? await DB().prepare(`SELECT * FROM listing_archive WHERE ${PARCEL_SQL("parcel_number")} = ?`).bind(parcel).all()
			: await DB().prepare("SELECT * FROM listing_archive WHERE id = ?").bind(listingId).all();
		const rows: any[] = (results ?? []).filter((r: any) => r.archive_status !== "unknown");
		const live = (a: any) => a.archive_status === "active" || a.archive_status === "under_contract" ? 1 : 0;
		return rows.sort((x, y) => (live(y) - live(x)) || String(y.listing_date || "").localeCompare(String(x.listing_date || "")) || String(y.first_seen_at || "").localeCompare(String(x.first_seen_at || "")));
	} catch { return []; }
}

export async function listingHistory(parcel: string | null, listingId: string, admin = false): Promise<HistoryEvent[]> {
	try {
		const rows = await archiveRowsForHome(parcel, listingId);
		if (!rows.length) return [];
		let events: any[] = [];
		try {
			const ids = rows.map(r => r.id);
			const ev = await DB().prepare(
				`SELECT listing_key, kind, at, price, from_price, status, from_status FROM listing_events WHERE listing_key IN (${ids.map(() => "?").join(",")})`
			).bind(...ids).all();
			events = ev.results ?? [];
		} catch { events = []; } // table not created yet (first sync after deploy makes it)

		const out: HistoryEvent[] = [];
		for (const r of rows) {
			const offMarket = r.archive_status === "off_market";
			if (offMarket && !admin) continue;
			const mine = events.filter(e => e.listing_key === r.id);
			const priceEvs = mine.filter(e => e.kind === "price").sort((a, b) => whenMs(a.at) - whenMs(b.at));
			const statusEvs = mine.filter(e => e.kind === "status");
			const add = (date: string | null, event: string, price: number | null = null, change: number | null = null) => {
				if (date && !Number.isNaN(whenMs(date))) out.push({ date, event, price, change, adminOnly: offMarket });
			};
			add(r.listing_date, r.office ? `Listed by ${r.office}` : "Listed", r.original_price ?? priceEvs[0]?.from_price ?? r.price ?? null);
			for (const e of priceEvs) add(e.at, "Price change", e.price ?? null, e.from_price ? (e.price - e.from_price) / e.from_price : null);
			for (const e of statusEvs) if (STATUS_EVENT[e.status] && !(e.status === "Active" && !e.from_status)) add(e.at, STATUS_EVENT[e.status]);
			// A sale's contract date, when no status change already covers it.
			if (r.contract_date && !statusEvs.some(e => e.status === "Pending" || e.status === "ActiveUnderContract")) add(r.contract_date, "Under contract");
			if (r.archive_status === "sold") add(r.close_date, "Sold", r.close_price ?? null);
			if (offMarket) add(r.off_market_date, "Off market");
		}
		const rank = (e: HistoryEvent) => EVENT_RANK[e.event.startsWith("Listed") ? "Listed" : e.event] ?? 1;
		// Newest first; on the same day the later step comes first.
		return out.sort((a, b) => (whenMs(b.date.slice(0, 10)) - whenMs(a.date.slice(0, 10))) || (rank(b) - rank(a)));
	} catch {
		return [];
	}
}

// ── Sale history (2026-11-09, plan stage 5) ──────────────────────────────────
// One line per MLS listing number of the home, newest first: when it was listed
// and for how much, how it ended, the close facts, the listing brokerage and
// Grant's side when he was on one. The per-event table above stays as the
// detail under it. Off-market listings are admin-only, as in listingHistory.
export type SaleHistoryRow = {
	key: string;
	current: boolean;
	listedDate: string | null;
	listPrice: number | null;
	originalPrice: number | null;
	outcome: string; // On market / Under contract / Pending / Sold / Off market
	closeDate: string | null;
	closePrice: number | null;
	office: string | null;
	agent: string | null;
	grantSide: string | null; // "Represented the seller" etc., or null
	adminOnly: boolean;
};
const outcomeOf = (a: any): string =>
	a.archive_status === "active" ? "On market"
	: a.archive_status === "under_contract" ? (a.feed_status === "Pending" ? "Pending" : "Under contract")
	: a.archive_status === "sold" ? "Sold" : "Off market";

export async function saleHistory(parcel: string | null, listingId: string, currentKey: string | null, admin = false): Promise<SaleHistoryRow[]> {
	const rows = await archiveRowsForHome(parcel, listingId);
	return rows
		.filter(a => admin || a.archive_status !== "off_market")
		.map(a => ({
			key: a.id,
			current: a.id === currentKey,
			listedDate: a.listing_date ?? null,
			listPrice: a.price ?? null,
			originalPrice: a.original_price ?? null,
			outcome: outcomeOf(a),
			closeDate: a.archive_status === "sold" ? (a.close_date ?? null) : null,
			closePrice: a.archive_status === "sold" ? (a.close_price ?? null) : null,
			office: a.office ?? null,
			agent: a.agent ?? null,
			grantSide: representedLabel(representedBy(a)),
			adminOnly: a.archive_status === "off_market",
		}));
}

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
		id: r.id,
		// The home's URL when the row was joined to its home (HOME_SLUG_COL); the
		// per-listing slug otherwise, which 301s to the home anyway.
		slug: r.home_slug || r.slug,
		address: r.address,
		city: r.city, state: r.state, zip: r.zip,
		price: r.price, beds: r.beds, baths: bathsOf(r),
		sqft: r.sqft, lotAcres: r.lot_acres, yearBuilt: r.year_built,
		type: r.type, subType: r.sub_type, category: r.category, status: r.status,
		statusLabel: r.home_status || statusLabel(r.status),
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

// ── Homes (ec_listings, one row per parcel) ──────────────────────────────────
export type HomeRow = Record<string, any> & { id: string; slug: string; home_status: HomeStatus | null };

/**
 * The home a URL slug belongs to. A direct hit on the home's own slug comes
 * back as `{ home }`; a slug from property_slugs (an old per-listing URL, a
 * misspelling, the `incline-village-ca` one) comes back as `{ home, redirect }`
 * so the route can 301 to the home's URL. Null when the slug is unknown.
 */
export async function homeBySlug(slug: string): Promise<{ home: HomeRow; redirect: string | null } | null> {
	try {
		const home: any = await DB().prepare("SELECT * FROM ec_listings WHERE slug = ?").bind(slug).first();
		if (home) return { home, redirect: null };
		const ps: any = await DB().prepare("SELECT property_id FROM property_slugs WHERE slug = ?").bind(slug).first();
		if (!ps?.property_id) return null;
		const target: any = await DB().prepare("SELECT * FROM ec_listings WHERE id = ?").bind(ps.property_id).first();
		return target ? { home: target, redirect: target.slug } : null;
	} catch { return null; }
}
export const parcelOf = (home: HomeRow): string | null => home.id.startsWith("p-") ? home.id.slice(2) : null;

/** True when the home at `slug` is ticked "Hide from search" (detail page adds noindex). */
export async function isHiddenSlug(slug: string): Promise<boolean> {
	const h = await homeBySlug(slug);
	return !!h && isOn(h.home.hidden);
}

/**
 * Everything on the market: active, under contract and pending, in that order,
 * then priciest first. Feeds /listings/ (where the status badge tells them
 * apart) and the sitemap. Homes ticked "Hide from search" are left out. The
 * home, community and blog featured rows use FEATURED_ROW instead.
 */
export async function allLive() {
	// Join the home row for the URL, the hidden tick and Grant's note flag.
	const { results } = await DB().prepare(
		`SELECT l.*, ${HOME_SLUG_COL}, e.home_status AS home_status, e.owner_note AS owner_note FROM listings l ${HOME_JOIN} WHERE l.status IN ${LIVE_STATUSES} AND ${NOT_HIDDEN} ORDER BY ${LIVE_ORDER}, (l.photo IS NULL), l.price DESC`
	).all();
	return (results ?? []).map((r: any) => ({ ...toListing(r), ownerNote: r.owner_note ?? null }));
}

// ── Sold homes (listing_archive grouped by parcel + the home row) ────────────
// One card per HOME, not per sale (Liz, decision 4): 571 Dale Drive is one
// card that says "2 sales with Grant". A home belongs in Grant's section when
// he was on a side of any of its sales; otherwise it is a notable sale when a
// sale closed at or above the floor within the window.
export type SoldHome = ReturnType<typeof toListing> & {
	homeId: string;
	headline: string | null;
	closePrice: number | null;
	closeDate: string | null;
	represented: ReturnType<typeof representedBy>;
	representedLabel: string | null;
	grantSales: number;
	sales: number;
	featured: boolean;
};
const GRANT_ON_A_SIDE = `(a.list_agent_id = ? OR a.buyer_agent_id = ? OR a.co_list_agent_id = ? OR a.co_buyer_agent_id = ?)`;

async function soldArchiveRows(): Promise<any[]> {
	const since = new Date();
	since.setFullYear(since.getFullYear() - SOLD_OTHERS_YEARS);
	try {
		const { results } = await DB().prepare(
			`SELECT a.*, e.slug AS home_slug, e.id AS home_id, e.headline AS e_headline, e.featured AS e_featured, e.hidden AS e_hidden, e.show_grant AS e_show_grant, e.photo AS e_photo, e.home_status AS home_status
			 FROM listing_archive a JOIN ec_listings e ON e.id = 'p-' || ${PARCEL_SQL("a.parcel_number")}
			 WHERE a.archive_status = 'sold' AND (${GRANT_ON_A_SIDE} OR (a.close_price >= ? AND a.close_date >= ?))
			 ORDER BY a.close_date DESC, a.close_price DESC`
		).bind(GRANT_AGENT_ID, GRANT_AGENT_ID, GRANT_AGENT_ID, GRANT_AGENT_ID, SOLD_OTHERS_MIN_PRICE, since.toISOString().slice(0, 10)).all();
		return results ?? [];
	} catch { return []; }
}

/** Every sold home the site shows, one entry per home, newest close first. */
export async function soldHomes(): Promise<{ grant: SoldHome[]; notable: SoldHome[] }> {
	const rows = await soldArchiveRows();
	const byHome = new Map<string, any[]>();
	for (const r of rows) {
		if (isOn(r.e_hidden)) continue;
		if (!byHome.has(r.home_id)) byHome.set(r.home_id, []);
		byHome.get(r.home_id)!.push(r);
	}
	const grant: SoldHome[] = [], notable: SoldHome[] = [];
	for (const [homeId, sales] of byHome) {
		const grantSales = sales.filter(s => representedBy(s));
		// The card shows the newest sale; when Grant was on one, his newest.
		const lead = grantSales[0] ?? sales[0];
		const side = representedBy(lead);
		const card: SoldHome = {
			...toListing(lead),
			slug: lead.home_slug,
			homeId,
			// Grant's headline shows only while his content switch is on.
			headline: isOn(lead.e_show_grant) ? (lead.e_headline || null) : null,
			photo: lead.main_photo_url || lead.photo || lead.e_photo || null,
			statusLabel: lead.home_status || "Sold",
			closePrice: lead.close_price ?? null,
			closeDate: lead.close_date ?? null,
			represented: side,
			representedLabel: representedLabel(side),
			grantSales: grantSales.length,
			sales: sales.length,
			featured: isOn(lead.e_featured),
		};
		(grantSales.length ? grant : notable).push(card);
	}
	const order = (a: SoldHome, b: SoldHome) => (Number(b.featured) - Number(a.featured)) || String(b.closeDate || "").localeCompare(String(a.closeDate || "")) || ((b.closePrice ?? 0) - (a.closePrice ?? 0));
	return { grant: grant.sort(order), notable: notable.sort(order) };
}
/** Slugs (home URLs) of every sold home the site shows, for the sitemap. */
export async function soldSlugs(): Promise<string[]> {
	const { grant, notable } = await soldHomes();
	return [...grant, ...notable].map(h => h.slug).filter(Boolean);
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
			`SELECT l.photo FROM listings l ${HOME_JOIN} WHERE l.status='Active' AND l.type='Residential' AND l.photo IS NOT NULL AND l.photo != '' AND ${NOT_HIDDEN} ORDER BY RANDOM() LIMIT 1`
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
			`SELECT l.photo FROM listings l ${HOME_JOIN} WHERE l.status='Active' AND l.type='Residential' AND l.photo IS NOT NULL AND l.photo != '' AND ${NOT_HIDDEN} ORDER BY RANDOM() LIMIT ?`
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

/**
 * Off-market rule (plan, URLs): a home whose current listing left the feed
 * without closing keeps its page, with the Off market badge, when the site shows
 * a sale of it or Grant was ever on a side of one of its listings. Any other
 * off-market home answers 410 so search engines drop the URL.
 */
async function keepsOffMarketPage(parcel: string | null): Promise<boolean> {
	if (!parcel) return false;
	try {
		const since = new Date();
		since.setFullYear(since.getFullYear() - SOLD_OTHERS_YEARS);
		const row: any = await DB().prepare(
			`SELECT 1 AS k FROM listing_archive a WHERE ${PARCEL_SQL("a.parcel_number")} = ? AND (${GRANT_ON_A_SIDE} OR (a.archive_status = 'sold' AND a.close_price >= ? AND a.close_date >= ?)) LIMIT 1`
		).bind(parcel, GRANT_AGENT_ID, GRANT_AGENT_ID, GRANT_AGENT_ID, GRANT_AGENT_ID, SOLD_OTHERS_MIN_PRICE, since.toISOString().slice(0, 10)).first();
		return !!row;
	} catch { return false; }
}

/**
 * The listing page's data for a URL slug. Resolves the slug to its HOME, then
 * reads the home's current listing: from `listings` (full MLS data, every
 * photo) while it is live, from `listing_archive` (one photo, the close facts)
 * once it has sold or left the feed. Grant's fields come from the home row and
 * are returned only while his content switch (show_grant) is on; with it off
 * the page shows the MLS remarks, and a Matterport link from the MLS still
 * plays. Returns `{ redirect }` for an old URL, `{ gone }` for an off-market
 * home the site no longer shows, null for an unknown slug.
 */
export async function bySlug(slug: string): Promise<any> {
	const found = await homeBySlug(slug);
	if (!found) return null;
	if (found.redirect && found.redirect !== slug) return { redirect: found.redirect as string, home: found.home };
	const home = found.home;
	const parcel = parcelOf(home);
	const currentKey: string | null = home._current_listing ?? null;
	let row: any = currentKey ? await DB().prepare("SELECT * FROM listings WHERE id = ?").bind(currentKey).first() : null;
	// A live listing of this home that the mirror has not caught up with yet.
	if (!row && parcel) row = await DB().prepare(`SELECT * FROM listings WHERE ${PARCEL_SQL("parcel_number")} = ? ORDER BY listing_date DESC LIMIT 1`).bind(parcel).first();
	const live = !!row;
	if (!row && currentKey) row = await DB().prepare("SELECT * FROM listing_archive WHERE id = ?").bind(currentKey).first();
	if (!row) return null;

	const homeStatus: string = home.home_status || (live ? statusLabel(row.status) : (row.archive_status === "sold" ? "Sold" : "Off market"));
	if (homeStatus === "Off market" && !(await keepsOffMarketPage(parcel))) return { gone: true as const };

	let photos: string[] = [];
	if (live) {
		const { results } = await DB().prepare("SELECT url FROM listing_photos WHERE listing_key = ? ORDER BY ord").bind(row.id).all();
		photos = (results ?? []).map((p: any) => p.url);
	} else {
		const one = row.main_photo_url || row.photo || home.photo || null;
		photos = one ? [one] : [];
	}

	const showGrant = isOn(home.show_grant);
	const ov = overrideFrom(home);
	// Description is stored as Portable Text (WYSIWYG). With the switch off, the
	// live MLS remarks are shown whatever Grant wrote.
	const mlsPT = plainToPortableText(row.description ?? "");
	const effectivePT = showGrant ? (ov.description ?? ov.mlsDescription ?? mlsPT) : (ov.mlsDescription ?? mlsPT);
	const descriptionHtml = portableTextToHtml(effectivePT);
	const detail = toDetail(row);
	detail.description = descriptionHtml; // legacy field now carries rendered HTML
	detail.statusLabel = homeStatus;
	if (!live) detail.status = homeStatus === "Sold" ? "Closed" : "OffMarket";
	const side = !live && row.archive_status === "sold" ? representedBy(row) : null;
	return {
		listing: {
			...detail,
			slug: home.slug,
			homeId: home.id,
			parcel,
			showGrant,
			descriptionHtml,
			descriptionIsCustom: showGrant && ov.isOverride,
			ownerNote: showGrant ? ov.note : null,
			// Empty headline falls back to the address at render time, so a corrected
			// address keeps flowing through rather than being frozen into a field.
			headline: showGrant ? ov.headline : null,
			tourUrl: (showGrant ? ov.tourUrl : null) ?? matterportFrom(detail.tourUrlMls),
			noteImage: showGrant ? ov.noteImage : null,
			noteVideos: showGrant ? ov.noteVideos : null,
			floorPlanEmbed: showGrant ? ov.floorPlanEmbed : null,
			floorPlanImages: showGrant ? ov.floorPlanImages : null,
			archived: !live,
			sold: !live && row.archive_status === "sold" ? {
				closePrice: row.close_price ?? null,
				closeDate: row.close_date ?? null,
				represented: side,
				representedLabel: representedLabel(side),
			} : null,
		},
		photos,
		home: { id: home.id, slug: home.slug, status: homeStatus, showGrant, hidden: isOn(home.hidden), parcel, currentListing: row.id },
	};
}

// --- Per-home owner fields (Grant's) ------------------------------------------
// Source of truth = the emdash `listings` collection (ec_listings), one row per
// home. This is the SAME row the admin backend edits, so an edit in /_emdash/admin
// OR the inline note editor on the listing page both land here. The Trestle
// sync's mirror updates only the MLS columns (ON CONFLICT DO UPDATE), never
// these, so they survive every sync. A set description REPLACES the MLS
// remarks; clearing it reverts to MLS (description = _mls_description).
type Override = { exists: boolean; note: string | null; description: string | null; mlsDescription: string | null; isOverride: boolean; headline: string | null; tourUrl: string | null; noteImage: string | null; noteVideos: string | null; floorPlanEmbed: string | null; floorPlanImages: string | null; showGrant: boolean };
const clean = (v: any) => { const s = (v ?? "").toString().trim(); return s === "" ? null : s; };
function overrideFrom(row: any): Override {
	const description = clean(row?.description);
	const mlsDescription = clean(row?._mls_description ?? row?.mls_description);
	return { exists: !!row, note: clean(row?.owner_note), description, mlsDescription, isOverride: !!(description && description !== mlsDescription), headline: clean(row?.headline), tourUrl: clean(row?.tour_url), noteImage: clean(row?.note_image), noteVideos: clean(row?.note_videos), floorPlanEmbed: clean(row?.floor_plan_embed), floorPlanImages: clean(row?.floor_plan_images), showGrant: isOn(row?.show_grant) };
}
export async function getOverride(homeId: string): Promise<Override> {
	try {
		// SELECT * rather than a column list: a newly added owner field then reads
		// as null until the mirror script has added its column, instead of the
		// whole query failing and blanking every override on the page.
		const row = await DB().prepare("SELECT * FROM ec_listings WHERE id = ?").bind(homeId).first();
		return overrideFrom(row);
	} catch { return overrideFrom(null); }
}
export async function getNote(homeId: string): Promise<string | null> {
	return (await getOverride(homeId)).note;
}
// emdash 1.x stores content datetimes as UTC ISO with milliseconds, not datetime('now').
const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
export async function setNote(homeId: string, note: string): Promise<void> {
	const trimmed = (note ?? "").toString().slice(0, 8000);
	const v = trimmed.trim() === "" ? null : trimmed;
	await DB().prepare(`UPDATE ec_listings SET owner_note = ?, updated_at = ${NOW_SQL} WHERE id = ?`).bind(v, homeId).run();
}
// Empty description = "reset to MLS": set it back to the snapshot so it tracks the
// feed again. A non-empty value becomes the owner override (preserved across sync).
export async function setDescription(homeId: string, description: string): Promise<void> {
	const trimmed = (description ?? "").toString().slice(0, 16000);
	if (trimmed.trim() === "") {
		await DB().prepare(`UPDATE ec_listings SET description = "_mls_description", updated_at = ${NOW_SQL} WHERE id = ?`).bind(homeId).run();
		return;
	}
	// Store as Portable Text: pass through if already PT JSON, else convert plain text.
	const val = trimmed.trim().startsWith("[") ? trimmed : plainToPortableText(trimmed);
	await DB().prepare(`UPDATE ec_listings SET description = ?, updated_at = ${NOW_SQL} WHERE id = ?`).bind(val, homeId).run();
}
/** The home (ec_listings id + its URL slug) a page slug belongs to, or null. */
export async function homeIdForSlug(slug: string): Promise<{ id: string; slug: string } | null> {
	const h = await homeBySlug(slug);
	return h ? { id: h.home.id, slug: h.home.slug } : null;
}
// Kept for callers that still think in listing keys: the home id is the key now.
export async function keyForSlug(slug: string): Promise<string | null> {
	return (await homeIdForSlug(slug))?.id ?? null;
}
