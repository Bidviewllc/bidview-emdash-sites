// Per-home owner fields — save endpoint (note + description). Gated on an
// authenticated emdash admin session (Astro.locals.user). The fields live on the
// home's ec_listings row (one row per parcel since 2026-11-09), which the
// Trestle sync never overwrites, so they survive every sync and every relist. A
// saved description REPLACES the MLS remarks on the listing page; an empty save
// reverts to the live MLS text. The page shows them only while the home's
// "Show Grant's content" switch is on.
import type { APIRoute } from "astro";
import { setNote, setDescription, getOverride, homeIdForSlug } from "../../lib/listings";

export const prerender = false;

const json = (body: any, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const GET: APIRoute = async ({ url }) => {
	const slug = (url.searchParams.get("slug") || "").replace(/\/+$/, "");
	if (!slug) return json({ error: "slug required" }, 400);
	const home = await homeIdForSlug(slug);
	if (!home) return json({ error: "Not found" }, 404);
	return json({ homeId: home.id, ...(await getOverride(home.id)) });
};

export const POST: APIRoute = async ({ request, locals }) => {
	if (!(locals as any)?.user) return json({ error: "Unauthorized" }, 401);
	let body: any = {};
	try { body = await request.json(); } catch { return json({ error: "Bad JSON" }, 400); }
	const slug = String(body.slug || "").replace(/\/+$/, "");
	if (!slug) return json({ error: "slug required" }, 400);
	const home = await homeIdForSlug(slug);
	if (!home) return json({ error: "Listing not found" }, 404);

	// Update whichever field(s) were sent.
	if (Object.prototype.hasOwnProperty.call(body, "note")) await setNote(home.id, String(body.note ?? ""));
	if (Object.prototype.hasOwnProperty.call(body, "description")) await setDescription(home.id, String(body.description ?? ""));
	if (!Object.prototype.hasOwnProperty.call(body, "note") && !Object.prototype.hasOwnProperty.call(body, "description")) {
		return json({ error: "Nothing to update (send note and/or description)" }, 400);
	}
	return json({ ok: true, homeId: home.id, ...(await getOverride(home.id)) });
};
