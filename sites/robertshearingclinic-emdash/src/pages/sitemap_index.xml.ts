import { sitemapIndexXml } from "../lib/sitemap";
import { xmlResponse } from "../lib/xml";

export async function GET({ url }: { url: URL }) {
	return xmlResponse(await sitemapIndexXml(url.origin));
}
