/**
 * GCM admin plugin (native, declared in astro.config.mjs): two read-only Block
 * Kit panels on every saved entry of the "Listings" collection.
 *
 *   - "From the MLS": the ~30 MLS facts of the home's current listing, read
 *     from the Trestle-synced tables, so they no longer need to be fields on
 *     the edit form (PROPERTY-PAGES-PLAN.md, admin group 4).
 *   - "Listing history": one line per MLS listing number of the home (by
 *     parcel), newest first, with what Grant had saved for each earlier
 *     listing (listing_archive.owner_snapshot).
 *
 * How EmDash 1.4 wires this (read from the installed package, 2026-11-09):
 * `admin.editorPanels` on a plugin with no React `admin.entry` puts the plugin
 * in "blocks" admin mode; the editor POSTs `{ type: "panel_load" }` to
 * /_emdash/api/content/<collection>/<id>/plugin-extensions/<plugin>/panel/<panel>,
 * the host validates it and calls the plugin route named by `route` with the
 * entry in `ctx.ui.entry` ({ collection, id, locale, version }). The route
 * returns `{ blocks }`. A native plugin runs in the host isolate, so it reads
 * D1 straight through the `cloudflare:workers` env binding.
 */
import { definePlugin } from "emdash";
import type { PluginDefinition } from "emdash";
import { env } from "cloudflare:workers";
import { PARCEL_SQL } from "../../lib/listings";

const DB = () => (env as any).DB as any;
const GRANT = "meyergra111";
const money = (n: any) => n != null && n !== "" ? "$" + Number(n).toLocaleString("en-US") : "—";
const day = (d: any) => {
	if (!d) return "—";
	const t = Date.parse(String(d).length <= 10 ? `${d}T00:00:00Z` : String(d));
	return Number.isNaN(t) ? String(d) : new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};
const spaced = (s: any) => String(s ?? "").replace(/([a-z])([A-Z])/g, "$1 $2");
const yn = (v: any) => v === 1 || v === "1" || v === true ? "Yes" : v === 0 || v === "0" || v === false ? "No" : "—";
const val = (v: any) => v == null || v === "" ? "—" : String(v);

async function homeAndRows(entryId: string): Promise<{ home: any; rows: any[] } | null> {
	const home = await DB().prepare("SELECT id, slug, title, home_status, \"_current_listing\" AS cur FROM ec_listings WHERE id = ?").bind(entryId).first();
	if (!home) return null;
	const parcel = String(home.id).startsWith("p-") ? String(home.id).slice(2) : null;
	// Parcels are keyed with their punctuation stripped (see src/lib/listings.ts).
	const { results } = parcel
		? await DB().prepare(`SELECT * FROM listing_archive WHERE ${PARCEL_SQL("parcel_number")} = ? AND archive_status <> 'unknown'`).bind(parcel).all()
		: { results: [] };
	const live = (a: any) => a.archive_status === "active" || a.archive_status === "under_contract" ? 1 : 0;
	const rows = (results ?? []).sort((x: any, y: any) => (live(y) - live(x)) || String(y.listing_date || "").localeCompare(String(x.listing_date || "")));
	return { home, rows };
}

function side(a: any): string {
	const seller = a.list_agent_id === GRANT || a.co_list_agent_id === GRANT;
	const buyer = a.buyer_agent_id === GRANT || a.co_buyer_agent_id === GRANT;
	return seller && buyer ? "Grant: both sides" : seller ? "Grant: seller" : buyer ? "Grant: buyer" : "—";
}
const outcome = (a: any) =>
	a.archive_status === "active" ? "On market" : a.archive_status === "under_contract" ? (a.feed_status === "Pending" ? "Pending" : "Under contract") : a.archive_status === "sold" ? "Sold" : "Off market";

async function mlsPanel(entryId: string) {
	const found = await homeAndRows(entryId);
	if (!found) return { blocks: [{ type: "context", text: "No home found for this entry." }] };
	const { home, rows } = found;
	// The current listing: the live row (fresh every sync) when it is live, else the archive row.
	const key = home.cur || rows[0]?.id;
	let a: any = key ? await DB().prepare("SELECT * FROM listings WHERE id = ?").bind(key).first() : null;
	if (!a) a = rows.find((r) => r.id === key) || rows[0];
	if (!a) return { blocks: [{ type: "context", text: "This home has no MLS listing on record yet." }] };
	const f = (label: string, value: any) => ({ label, value: val(value) });
	const lot = a.lot_acres != null ? `${a.lot_acres} ac${a.lot_sqft ? ` (${Number(a.lot_sqft).toLocaleString("en-US")} sq ft)` : ""}` : null;
	const baths = a.baths_full != null ? `${Number(a.baths_full) + 0.5 * Number(a.baths_half || 0)} (${a.baths_full} full${a.baths_half ? ` / ${a.baths_half} half` : ""})` : a.baths;
	return {
		blocks: [
			{ type: "context", text: `MLS # ${val(a.mls_number)} · ${spaced(a.status)} · last updated ${day(a.updated)}. Refreshed by every sync; edit nothing here — the MLS is the source.` },
			{ type: "fields", fields: [
				f("Status", home.home_status), f("List price", money(a.price)),
				f("Address", a.address), f("City", [a.city, a.state, a.zip].filter(Boolean).join(", ")),
				f("Beds", a.beds), f("Baths", baths),
				f("Living area", a.sqft != null ? `${Number(a.sqft).toLocaleString("en-US")} sq ft` : null), f("Lot", lot),
				f("Year built", a.year_built), f("Property type", `${spaced(a.type)}${a.sub_type ? ` · ${spaced(a.sub_type)}` : ""}${a.category ? ` (${a.category})` : ""}`),
				f("Stories", a.stories), f("Garage", a.garage),
				f("Listed", day(a.listing_date)), f("Days on market", a.dom),
				f("Listing agent", a.agent), f("Listing office", a.office),
				f("Taxes", money(a.taxes)), f("HOA", a.hoa_fee != null ? `${money(a.hoa_fee)}${a.hoa_frequency ? ` / ${a.hoa_frequency}` : ""}` : null),
				f("View", a.view), f("Waterfront", yn(a.waterfront)),
				f("Heating", a.heating), f("Cooling", a.cooling),
				f("Parking", a.parking), f("Appliances", a.appliances),
				f("Flooring", a.flooring), f("Fireplaces", `${val(a.fireplaces)}${a.fireplace_features ? ` · ${a.fireplace_features}` : ""}`),
				f("Roof", a.roof), f("Construction", a.construction),
				f("Architectural style", a.arch_style), f("Condition", a.condition),
				f("Lot features", a.lot_features), f("Utilities", a.utilities),
				f("Pool", a.pool_features), f("Spa", a.spa_features || yn(a.spa_yn)),
				f("Laundry", a.laundry_features), f("Security", a.security_features),
				f("HOA amenities", a.assoc_amenities), f("Parcel", a.parcel_number ?? String(home.id).slice(2)),
				f("3D tour (MLS)", a.tour_url_mls), f("Photos", a.photos_count),
			] },
			...(a.close_price != null || a.close_date ? [{ type: "fields", fields: [f("Sold price", money(a.close_price)), f("Closed", day(a.close_date)), f("Buyer agent", a.buyer_agent), f("Buyer office", a.buyer_office)] }] : []),
			{ type: "section", text: a.description ? `MLS remarks: ${String(a.description).slice(0, 1200)}${String(a.description).length > 1200 ? "…" : ""}` : "No MLS remarks." },
		],
	};
}

async function historyPanel(entryId: string) {
	const found = await homeAndRows(entryId);
	if (!found) return { blocks: [{ type: "context", text: "No home found for this entry." }] };
	const { home, rows } = found;
	if (!rows.length) return { blocks: [{ type: "context", text: "No listings on record for this home." }] };
	const tableRows = rows.map((a) => ({
		listed: `${day(a.listing_date)} · ${money(a.price)}`,
		outcome: `${outcome(a)}${a.id === home.cur ? " (current)" : ""}`,
		closed: a.archive_status === "sold" ? `${day(a.close_date)} · ${money(a.close_price)}` : a.archive_status === "off_market" ? day(a.off_market_date) : "—",
		office: [a.agent, a.office].filter(Boolean).join(", ") || "—",
		grant: side(a),
		mls: val(a.mls_number),
	}));
	// What Grant had typed for each earlier listing, kept as the listing left.
	const notes: any[] = [];
	for (const a of rows) {
		if (!a.owner_snapshot) continue;
		let snap: any; try { snap = JSON.parse(a.owner_snapshot); } catch { continue; }
		const bits: string[] = [];
		if (snap.headline) bits.push(`Headline: ${snap.headline}`);
		if (snap.owner_note) bits.push(`Note: ${String(snap.owner_note).slice(0, 400)}`);
		if (snap.description) bits.push("Custom description saved");
		if (snap.tour_url) bits.push(`3D tour: ${snap.tour_url}`);
		if (snap.note_videos) bits.push("Videos saved");
		if (snap.floor_plan_embed || snap.floor_plan_images) bits.push("Floor plans saved");
		if (!bits.length) continue;
		notes.push({ type: "section", text: `Listing ${val(a.mls_number)} (listed ${day(a.listing_date)}): ${bits.join(" · ")}` });
	}
	return {
		blocks: [
			{ type: "context", text: `${rows.length} MLS listing${rows.length === 1 ? "" : "s"} of this home, newest first. The public page shows the same list (off-market listings only to a logged-in admin).` },
			{ type: "table", columns: [
				{ key: "listed", label: "Listed" }, { key: "outcome", label: "Outcome" }, { key: "closed", label: "Closed" },
				{ key: "office", label: "Listing agent, office" }, { key: "grant", label: "Grant's side" }, { key: "mls", label: "MLS #" },
			], rows: tableRows },
			...(notes.length ? [{ type: "header", text: "Grant's saved content on earlier listings" }, ...notes] : []),
		],
	};
}

const definition: PluginDefinition = {
	id: "gcm-admin",
	version: "0.1.0",
	admin: {
		editorPanels: [
			{ id: "mls-facts", title: "From the MLS (reference only)", route: "mls-panel", collections: ["listings"], order: 10 },
			{ id: "listing-history", title: "Listing history", route: "history-panel", collections: ["listings"], order: 20 },
		],
	},
	routes: {
		"mls-panel": {
			handler: async (ctx: any) => {
				const id = ctx.ui?.entry?.id;
				if (!id) return { blocks: [{ type: "context", text: "Save the entry first." }] };
				try { return await mlsPanel(String(id)); } catch (e: any) { return { blocks: [{ type: "banner", variant: "error", title: "Could not read the MLS data", description: String(e?.message ?? e) }] }; }
			},
		},
		"history-panel": {
			handler: async (ctx: any) => {
				const id = ctx.ui?.entry?.id;
				if (!id) return { blocks: [{ type: "context", text: "Save the entry first." }] };
				try { return await historyPanel(String(id)); } catch (e: any) { return { blocks: [{ type: "banner", variant: "error", title: "Could not read the history", description: String(e?.message ?? e) }] }; }
			},
		},
	},
};

// The emdash() integration imports a native plugin's `createPlugin` and calls
// it with the descriptor options (see virtual-modules.ts in the package).
export function createPlugin() {
	return definePlugin(definition);
}

export default createPlugin;
