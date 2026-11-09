import type { APIRoute } from "astro";
import { bySlug, lastSyncedAt, listingHistory } from "../../../lib/listings";
import { neighborhoodForPoint } from "../../../lib/neighborhoods";
import { imageUrl } from "../../../lib/media";
import { env } from "cloudflare:workers";
import { getEmDashEntry } from "emdash";
// Shared with ContactCta: the print sheet must not carry a number a buyer
// might dial, and the site must not display one either.
import { realPhone } from "../../../lib/contact-details";
// The "Your Neighbor Before You Even Arrive" section is shared with the home
// page. Same singleton, same reader, so the two cannot drift.
import { getGrantIntro } from "../../../lib/grant-intro";
export const prerender = false;

// floor_plan_images is an emdash repeater: a JSON array of { label, image } items,
// where image is a media object. Hand the page plain { label, url } pairs and drop
// items saved without an upload.
function floorPlanImages(raw: unknown): { label: string | null; url: string }[] {
	let items: any = raw;
	if (typeof raw === "string") {
		try { items = JSON.parse(raw); } catch { return []; }
	}
	if (!Array.isArray(items)) return [];
	return items
		.map((it: any) => ({ label: String(it?.label ?? "").trim() || null, url: imageUrl(it?.image) }))
		.filter((it): it is { label: string | null; url: string } => !!it.url);
}

export const GET: APIRoute = async ({ params, locals }) => {
	try {
		const slug = String(params.slug || "").replace(/\/+$/, "");
		let result: any = await bySlug(slug);
		// An old URL for a home (the page route 301s; the API just answers for the
		// home and names its real slug so the page can fix the address bar).
		let canonicalSlug: string | null = null;
		if (result?.redirect) { canonicalSlug = result.redirect; result = await bySlug(result.redirect); }
		if (!result) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
		// Expired / withdrawn / cancelled, nothing shown about the home: gone for everyone.
		if (result.gone) return new Response(JSON.stringify({ error: "This listing is no longer available.", gone: true }), { status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=3600" } });
		// canEdit = the requester is a logged-in emdash admin (set by emdash auth
		// middleware). Lets the detail page show the inline owner-note editor.
		const canEdit = !!(locals as any)?.user;
		// Don't let the CDN cache an admin's editable view for anonymous visitors.
		const cache = canEdit ? "private, no-store" : "public, s-maxage=120";
		// Name the neighborhood by point-in-polygon so the detail page can show it
		// instead of city/state. Falls back to null outside every traced area.
		const area = neighborhoodForPoint(result.listing?.lng, result.listing?.lat);
		// noteImage is an emdash image field (a JSON media object), same as the
		// neighbourhood images below -- resolve it to a URL before the page sees it.
		const listing = { ...result.listing, noteImage: imageUrl(result.listing?.noteImage), floorPlanImages: floorPlanImages(result.listing?.floorPlanImages), neighborhood: area?.name ?? null, neighborhoodSlug: area?.slug ?? null };

		// B4 + B5. Both are optional: when there is no market-intelligence post for this
		// neighborhood, or no imagery on the neighborhood entry, the page hides that
		// section rather than showing an empty frame or invented numbers.
		const DB = (env as any)?.DB;
		let marketIntel: any = null;
		let areaInfo: any = null;
		if (DB && area?.slug) {
			try {
				marketIntel = await DB.prepare(
					"SELECT title, period, summary, list_to_sale, list_to_sale_note, avg_dom, avg_dom_note, source " +
					"FROM ec_market_intelligence WHERE neighborhood = ? AND status = 'published' " +
					"ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 1",
				).bind(area.slug).first();
			} catch { marketIntel = null; }
			try {
				areaInfo = await DB.prepare(
					"SELECT title, tag, overview, take, featured_image, map_image FROM ec_neighborhoods WHERE slug = ?",
				).bind(area.slug).first();
			} catch { areaInfo = null; }
		}
		// emdash image fields are JSON media objects and D1 returns them as strings, so
		// the detail page was dropping raw JSON into background-image:url(). Resolve to
		// real URLs here, where the media shape is known, rather than in the page.
		if (areaInfo) {
			areaInfo = {
				...areaInfo,
				featured_image: imageUrl((areaInfo as any).featured_image),
				map_image: imageUrl((areaInfo as any).map_image),
			};
		}
		// Grant's contact details for the print sheet's repeating footer. Read from
		// the same `contact_cta` singleton the site footer and every contact block
		// use, so there is one place to change it.
		let contact: { phone: string | null } = { phone: null };
		try {
			const cta = await getEmDashEntry("contact_cta", "default");
			contact = { phone: realPhone((cta as any)?.entry?.data?.phone) };
		} catch { contact = { phone: null }; }

		// Listing history (per event), grouped by the home's parcel. Off-market listings only reach a logged-in
		// admin, whose response is private/no-store (above), so they never hit the
		// edge cache.
		const home = result.home;
		const [grantIntro, syncedAt, history] = await Promise.all([
			getGrantIntro(), lastSyncedAt(),
			listingHistory(home?.parcel ?? null, listing.id, canEdit),
		]);
		return new Response(JSON.stringify({ ...result, listing, canonicalSlug, marketIntel, area: areaInfo, canEdit, contact, grantIntro, syncedAt, history }), { headers: { "Content-Type": "application/json", "Cache-Control": cache } });
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
};
