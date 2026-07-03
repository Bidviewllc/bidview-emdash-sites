import { locationsKml } from "../lib/sitemap";

export async function GET({ url }: { url: URL }) {
	return new Response(locationsKml(url.origin), {
		headers: { "content-type": "application/vnd.google-earth.kml+xml; charset=utf-8" },
	});
}
