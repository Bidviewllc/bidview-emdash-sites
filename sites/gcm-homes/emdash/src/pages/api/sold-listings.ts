import type { APIRoute } from "astro";
import { soldHomes } from "../../lib/listings";
export const prerender = false;

// GET /api/sold-listings -> { count, listings } : one card per SOLD home the site
// shows (Grant's sales, and other agents' sales at the floor in the window),
// shaped like /api/listings cards plus closePrice/closeDate. The /listings/
// search fetches this only when the visitor ticks "Sold" (off by default, Liz
// 2026-09-28), so the default payload stays the live homes only.
export const GET: APIRoute = async () => {
	try {
		const { grant, notable } = await soldHomes();
		const listings = [...grant, ...notable].map((h) => ({
			...h,
			status: "Closed",
			statusLabel: "Sold",
			// The card's price line shows the sold price.
			price: h.closePrice ?? h.price,
		}));
		return new Response(JSON.stringify({ count: listings.length, listings }), {
			headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=600" },
		});
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
};
