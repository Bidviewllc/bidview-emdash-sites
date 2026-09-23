import type { APIRoute } from "astro";
import { listingPhotos } from "../../lib/listings";
export const prerender = false;

// GET /api/listing-photos?id=<ListingKey> -> { photos: [url, ...] }
// Feeds the hover carousel on the /listings/ cards. Capped at 5: nobody sits
// through 50 photos on a grid card, and each one is a separate download.
const MAX = 5;

export const GET: APIRoute = async ({ url }) => {
	const id = url.searchParams.get("id") ?? "";
	if (!/^\d{1,20}$/.test(id)) {
		return new Response(JSON.stringify({ error: "Bad id" }), { status: 400, headers: { "Content-Type": "application/json" } });
	}
	try {
		const photos = await listingPhotos(id, MAX);
		return new Response(JSON.stringify({ photos }), {
			headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=600" },
		});
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
};
