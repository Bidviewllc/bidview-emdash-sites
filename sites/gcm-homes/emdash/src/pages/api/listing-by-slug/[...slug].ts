import type { APIRoute } from "astro";
import { bySlug } from "../../../lib/listings";
import { neighborhoodForPoint } from "../../../lib/neighborhoods";
import { imageUrl } from "../../../lib/media";
import { env } from "cloudflare:workers";
import { getEmDashEntry } from "emdash";
export const prerender = false;

/**
 * Grant's phone, for the printable property sheet -- but only if it is real.
 *
 * The shared `contact_cta` entry still holds a placeholder (333-333-3333), and
 * the design it came from used (775) 555-0192. A property sheet gets printed
 * and handed to a buyer, so a fake number on it is worse than no number: the
 * line is simply omitted until someone sets a genuine one in the dashboard.
 * Same principle as ContactCta, which hides a contact row until its field has
 * a real value.
 */
function realPhone(v: unknown): string | null {
	const raw = String(v ?? "").trim();
	if (!raw) return null;
	const digits = raw.replace(/\D/g, "");
	if (digits.length < 10) return null;
	const ten = digits.slice(-10);
	const area = ten.slice(0, 3);
	const exchange = ten.slice(3, 6);
	if (new Set(ten).size === 1) return null;                // 3333333333
	if (area === exchange) return null;                      // 333-333-3333
	if (area === "555" || exchange === "555") return null;   // reserved for fiction
	if (ten.slice(3) === "0000000") return null;             // ...-000-0000
	return raw;
}
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
		// Grant's contact details for the print sheet's repeating footer. Read from
		// the same `contact_cta` singleton the site footer and every contact block
		// use, so there is one place to change it.
		let contact: { phone: string | null } = { phone: null };
		try {
			const cta = await getEmDashEntry("contact_cta", "default");
			contact = { phone: realPhone((cta as any)?.entry?.data?.phone) };
		} catch { contact = { phone: null }; }

		return new Response(JSON.stringify({ ...result, listing, marketIntel, area: areaInfo, canEdit, contact }), { headers: { "Content-Type": "application/json", "Cache-Control": cache } });
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
};
