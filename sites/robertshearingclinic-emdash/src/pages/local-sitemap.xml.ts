import { localSitemapXml } from "../lib/sitemap";
import { xmlResponse } from "../lib/xml";

export async function GET({ url }: { url: URL }) {
	return xmlResponse(localSitemapXml(url.origin));
}
