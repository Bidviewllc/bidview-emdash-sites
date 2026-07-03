import { urlsetXml } from "../lib/sitemap";
import { xmlResponse } from "../lib/xml";

export async function GET({ url }: { url: URL }) {
	return xmlResponse(await urlsetXml(url.origin, "audiologist"));
}
