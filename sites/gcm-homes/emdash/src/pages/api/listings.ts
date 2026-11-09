import type { APIRoute } from "astro";
import { allLive, lastSyncedAt } from "../../lib/listings";
export const prerender = false;
export const GET: APIRoute = async () => {
	try {
		const [listings, syncedAt] = await Promise.all([allLive(), lastSyncedAt()]);
		return new Response(JSON.stringify({ count: listings.length, syncedAt, listings }), {
			headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=120" },
		});
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
};
