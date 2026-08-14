// Per-listing owner overrides — save endpoint (note + description). Gated on an
// authenticated emdash admin session (Astro.locals.user). Overrides live in the
// listing_notes table keyed by the listing's id, so they survive every Trestle
// sync (the sync never writes that table). A saved description REPLACES the MLS
// remarks on the listing page; an empty save reverts to the live MLS text.
import type { APIRoute } from "astro";
import { setNote, setDescription, getOverride, keyForSlug } from "../../lib/listings";

export const prerender = false;

const json = (body: any, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const GET: APIRoute = async ({ url }) => {
	const slug = (url.searchParams.get("slug") || "").replace(/\/+$/, "");
	if (!slug) return json({ error: "slug required" }, 400);
	const key = await keyForSlug(slug);
	if (!key) return json({ error: "Not found" }, 404);
	return json(await getOverride(key));
};

export const POST: APIRoute = async ({ request, locals }) => {
	if (!(locals as any)?.user) return json({ error: "Unauthorized" }, 401);
	let body: any = {};
	try { body = await request.json(); } catch { return json({ error: "Bad JSON" }, 400); }
	const slug = String(body.slug || "").replace(/\/+$/, "");
	if (!slug) return json({ error: "slug required" }, 400);
	const key = await keyForSlug(slug);
	if (!key) return json({ error: "Listing not found" }, 404);

	// Update whichever field(s) were sent.
	if (Object.prototype.hasOwnProperty.call(body, "note")) await setNote(key, String(body.note ?? ""));
	if (Object.prototype.hasOwnProperty.call(body, "description")) await setDescription(key, String(body.description ?? ""));
	if (!Object.prototype.hasOwnProperty.call(body, "note") && !Object.prototype.hasOwnProperty.call(body, "description")) {
		return json({ error: "Nothing to update (send note and/or description)" }, 400);
	}
	return json({ ok: true, ...(await getOverride(key)) });
};
