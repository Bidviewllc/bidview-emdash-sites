import { postSitemapXml } from "../lib/blogs-emdash";

export const prerender = false;

export async function GET({ url }: { url: URL }) {
	return new Response(await postSitemapXml({ set() {} }, url.origin), {
		headers: { "Content-Type": "application/xml; charset=utf-8" },
	});
}
