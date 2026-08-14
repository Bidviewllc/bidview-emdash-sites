import type { APIRoute } from "astro";
import { bySlug } from "../../../lib/listings";
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
		return new Response(JSON.stringify({ ...result, canEdit }), { headers: { "Content-Type": "application/json", "Cache-Control": cache } });
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
};
