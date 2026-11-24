import type { APIRoute } from "astro";
import { handleLead } from "../lib/leads";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
	const result = await handleLead(request, "subscribe");
	if (result.status === "error") {
		const back = new URL("/blog/", request.url);
		back.searchParams.set("subscribe", "error");
		back.searchParams.set("message", result.message);
		return redirect(back.pathname + back.search, 303);
	}
	const back = new URL("/blog/", request.url);
	back.searchParams.set("subscribed", result.status === "saved" ? "saved" : "1");
	if (result.track) back.searchParams.set("track", "1");
	return redirect(back.pathname + back.search, 303);
};
