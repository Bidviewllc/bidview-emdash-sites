// Read-only listings access from the Trestle-synced D1 tables (listings,
// listing_photos). Shapes rows into the same JSON the prototype's listings/
// detail JS expects, so that client code ports over unchanged.
import { env } from "cloudflare:workers";
import { portableTextToHtml, plainToPortableText } from "./portabletext";

const DB = () => (env as any).DB as any;

export function toListing(r: any) {
	return {
		id: r.id, slug: r.slug, address: r.address,
		city: r.city, state: r.state, zip: r.zip,
		price: r.price, beds: r.beds, baths: r.baths,
		sqft: r.sqft, lotAcres: r.lot_acres, yearBuilt: r.year_built,
		type: r.type, subType: r.sub_type, category: r.category, status: r.status,
		lat: r.lat, lng: r.lng, view: r.view, waterfront: r.waterfront === 1,
		dom: r.dom, photosCount: r.photos_count, agent: r.agent, office: r.office,
		updated: r.updated, photo: r.photo,
	};
}
export function toDetail(r: any) {
	return {
		id: r.id, address: r.address, city: r.city, state: r.state, zip: r.zip,
		price: r.price, beds: r.beds, baths: r.baths, bathsFull: r.baths_full, bathsHalf: r.baths_half,
		sqft: r.sqft, lotAcres: r.lot_acres, yearBuilt: r.year_built, garage: r.garage,
		view: r.view, description: r.description, status: r.status,
		type: r.type, subType: r.sub_type, category: r.category,
		taxes: r.taxes, daysOnMarket: r.dom, agent: r.agent, office: r.office,
		lat: r.lat, lng: r.lng, hoaFee: r.hoa_fee, heating: r.heating, cooling: r.cooling,
		parking: r.parking, appliances: r.appliances, updated: r.updated, slug: r.slug,
		// Added 2026-08-19 (Liz's field request — for the Features/Amenities cards + 3D tour):
		flooring: r.flooring, fireplaces: r.fireplaces, fireplaceYN: r.fireplace_yn,
		fireplaceFeatures: r.fireplace_features, roof: r.roof, utilities: r.utilities,
		poolFeatures: r.pool_features, listingDate: r.listing_date, hoaFrequency: r.hoa_frequency,
		tourUrlMls: r.tour_url_mls, mlsNumber: r.mls_number, stories: r.stories,
		archStyle: r.arch_style, construction: r.construction, lotFeatures: r.lot_features,
		condition: r.condition, lotSqft: r.lot_sqft,
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
export async function getOverride(listingKey: string): Promise<{ note: string | null; description: string | null; mlsDescription: string | null; isOverride: boolean }> {
	try {
		const row = await DB().prepare('SELECT owner_note, description, "_mls_description" AS mls_description FROM ec_listings WHERE id = ?').bind(listingKey).first();
		const clean = (v: any) => { const s = (v ?? "").toString().trim(); return s === "" ? null : s; };
		const description = clean((row as any)?.description);
		const mlsDescription = clean((row as any)?.mls_description);
		return { note: clean((row as any)?.owner_note), description, mlsDescription, isOverride: !!(description && description !== mlsDescription) };
	} catch { return { note: null, description: null, mlsDescription: null, isOverride: false }; }
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
