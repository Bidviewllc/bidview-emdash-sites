// Read-only listings access from the Trestle-synced D1 tables (listings,
// listing_photos). Shapes rows into the same JSON the prototype's listings/
// detail JS expects, so that client code ports over unchanged.
import { env } from "cloudflare:workers";
import { portableTextToHtml, plainToPortableText } from "./portabletext";

const DB = () => (env as any).DB as any;

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

export function toListing(r: any) {
	return {
		id: r.id, slug: r.slug, address: r.address,
		city: r.city, state: r.state, zip: r.zip,
		price: r.price, beds: r.beds, baths: r.baths,
		sqft: r.sqft, lotAcres: r.lot_acres, yearBuilt: r.year_built,
		type: r.type, subType: r.sub_type, category: r.category, status: r.status,
		lat: r.lat, lng: r.lng, view: r.view, waterfront: r.waterfront === 1,
		dom: liveDom(r), photosCount: r.photos_count, agent: r.agent, office: r.office,
		updated: r.updated, photo: r.photo, feats: featuresOf(r),
	};
}
export function toDetail(r: any) {
	return {
		id: r.id, address: r.address, city: r.city, state: r.state, zip: r.zip,
		price: r.price, beds: r.beds, baths: r.baths, bathsFull: r.baths_full, bathsHalf: r.baths_half,
		sqft: r.sqft, lotAcres: r.lot_acres, yearBuilt: r.year_built, garage: r.garage,
		view: r.view, description: r.description, status: r.status,
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

export async function allActive() {
	// LEFT JOIN the emdash mirror so cards can surface a "Grant's note" flag. Owner
	// note lives in ec_listings.owner_note (preserved across every sync).
	const { results } = await DB().prepare(
		"SELECT l.*, e.owner_note AS owner_note FROM listings l LEFT JOIN ec_listings e ON e.id = l.id WHERE l.status='Active' ORDER BY (l.photo IS NULL), l.price DESC"
	).all();
	return (results ?? []).map((r: any) => ({ ...toListing(r), ownerNote: r.owner_note ?? null }));
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
			"SELECT photo FROM listings WHERE status='Active' AND type='Residential' AND photo IS NOT NULL AND photo != '' ORDER BY RANDOM() LIMIT 1"
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
			"SELECT photo FROM listings WHERE status='Active' AND type='Residential' AND photo IS NOT NULL AND photo != '' ORDER BY RANDOM() LIMIT ?"
		).bind(n).all();
		return (results ?? []).map((r: any) => r.photo);
	} catch {
		return [];
	}
}

export async function bySlug(slug: string) {
	const row = await DB().prepare("SELECT * FROM listings WHERE slug = ?").bind(slug).first();
	if (!row) return null;
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
			tourUrl: ov.tourUrl,
			noteImage: ov.noteImage,
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
export async function getOverride(listingKey: string): Promise<{ note: string | null; description: string | null; mlsDescription: string | null; isOverride: boolean; headline: string | null; tourUrl: string | null; noteImage: string | null }> {
	try {
		const row = await DB().prepare('SELECT owner_note, description, headline, tour_url, note_image, "_mls_description" AS mls_description FROM ec_listings WHERE id = ?').bind(listingKey).first();
		const clean = (v: any) => { const s = (v ?? "").toString().trim(); return s === "" ? null : s; };
		const description = clean((row as any)?.description);
		const mlsDescription = clean((row as any)?.mls_description);
		return { note: clean((row as any)?.owner_note), description, mlsDescription, isOverride: !!(description && description !== mlsDescription), headline: clean((row as any)?.headline), tourUrl: clean((row as any)?.tour_url), noteImage: clean((row as any)?.note_image) };
	} catch { return { note: null, description: null, mlsDescription: null, isOverride: false, headline: null, tourUrl: null, noteImage: null }; }
}
export async function getNote(listingKey: string): Promise<string | null> {
	return (await getOverride(listingKey)).note;
}
export async function setNote(listingKey: string, note: string): Promise<void> {
	const trimmed = (note ?? "").toString().slice(0, 8000);
	const v = trimmed.trim() === "" ? null : trimmed;
	await DB().prepare("UPDATE ec_listings SET owner_note = ?, updated_at = datetime('now') WHERE id = ?").bind(v, listingKey).run();
}
// Empty description = "reset to MLS": set it back to the snapshot so it tracks the
// feed again. A non-empty value becomes the owner override (preserved across sync).
export async function setDescription(listingKey: string, description: string): Promise<void> {
	const trimmed = (description ?? "").toString().slice(0, 16000);
	if (trimmed.trim() === "") {
		await DB().prepare('UPDATE ec_listings SET description = "_mls_description", updated_at = datetime(\'now\') WHERE id = ?').bind(listingKey).run();
		return;
	}
	// Store as Portable Text: pass through if already PT JSON, else convert plain text.
	const val = trimmed.trim().startsWith("[") ? trimmed : plainToPortableText(trimmed);
	await DB().prepare("UPDATE ec_listings SET description = ?, updated_at = datetime('now') WHERE id = ?").bind(val, listingKey).run();
}
// Resolve a listing's id from its slug (the client edits by slug; notes key on id).
export async function keyForSlug(slug: string): Promise<string | null> {
	const row = await DB().prepare("SELECT id FROM listings WHERE slug = ?").bind(slug).first();
	return (row as any)?.id ?? null;
}
