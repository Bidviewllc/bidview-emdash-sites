// Override emdash's default /sitemap.xml (which emits a broken {route} placeholder)
// with the real Yoast-style index the site already builds at /sitemap_index.xml.
import { sitemapIndexXml } from "../lib/sitemap";
import { xmlResponse } from "../lib/xml";

export async function GET({ url }: { url: URL }) {
	return xmlResponse(await sitemapIndexXml(url.origin));
}
