import type { APIRoute } from "astro";
import { bySlug } from "../../../lib/listings";
import { neighborhoodForPoint } from "../../../lib/neighborhoods";
import { imageUrl } from "../../../lib/media";
import { env } from "cloudflare:workers";
export const prerender = false;
export const GET: APIRoute = async ({ params, locals }) => {
	try {
		const slug = String(params.slug || "").replace(/\/+$/, "");
		const result = await bySlug(slug);
		if (!result) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
		// canEdit = the requester is a logged-in emdash admin (set by emdash auth
		// middleware). Lets the detail page show the inline owner-note editor.
		const canEdit = !!(locals as any)?.user;
		// Don't let the CDN cache an admin's editable view for anonymous visitors.
		const cache = canEdit ? "private, no-store" : "public, s-maxage=120";
		// Name the neighborhood by point-in-polygon so the detail page can show it
		// instead of city/state. Falls back to null outside every traced area.
		const area = neighborhoodForPoint((result as any).listing?.lng, (result as any).listing?.lat);
		const listing = { ...(result as any).listing, neighborhood: area?.name ?? null, neighborhoodSlug: area?.slug ?? null };

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
		return new Response(JSON.stringify({ ...result, listing, marketIntel, area: areaInfo, canEdit }), { headers: { "Content-Type": "application/json", "Cache-Control": cache } });
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
};
