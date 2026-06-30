import { pageSitemapXml } from "../lib/blogs-emdash";

export const prerender = false;

export async function GET({ url }: { url: URL }) {
	return new Response(await pageSitemapXml({ set() {} }, url.origin), {
		headers: { "Content-Type": "application/xml; charset=utf-8" },
	});
}
