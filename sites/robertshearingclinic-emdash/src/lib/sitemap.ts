import { getSitemapEntries } from "./content-routes";
import { escapeXml } from "./xml";

export const sitemapFiles = [
	{ group: "post", file: "post-sitemap.xml", fallbackLastmod: "2026-05-28T10:26:56+00:00" },
	{ group: "page", file: "page-sitemap.xml", fallbackLastmod: "2026-06-30T19:21:45+00:00" },
	{
		group: "audiologist",
		file: "audiologist-sitemap.xml",
		fallbackLastmod: "2026-04-23T15:25:11+00:00",
	},
	{
		group: "location",
		file: "location-sitemap.xml",
		fallbackLastmod: "2026-04-23T15:18:05+00:00",
	},
	{ group: "local", file: "local-sitemap.xml", fallbackLastmod: "2026-04-21T05:31:28+00:00" },
] as const;

export async function sitemapIndexXml(origin: string): Promise<string> {
	const rows = await Promise.all(
		sitemapFiles.map(async (item) => {
			if (item.group === "local") return { ...item, lastmod: item.fallbackLastmod };
			const entries = await getSitemapEntries(item.group);
			const lastmod =
				entries
					.map((entry) => String(entry.data.sitemap_lastmod || ""))
					.filter(Boolean)
					.sort()
					.at(-1) || item.fallbackLastmod;
			return { ...item, lastmod };
		}),
	);
	return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows
	.map(
		(row) => `\t<sitemap>
\t\t<loc>${escapeXml(`${origin}/${row.file}`)}</loc>
\t\t<lastmod>${escapeXml(row.lastmod)}</lastmod>
\t</sitemap>`,
	)
	.join("\n")}
</sitemapindex>`;
}

export async function urlsetXml(origin: string, group: string): Promise<string> {
	const entries = await getSitemapEntries(group);
	return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map((item) => {
		const route = String(item.data.route || "/");
		const lastmod = String(item.data.sitemap_lastmod || "");
		return `\t<url>
\t\t<loc>${escapeXml(`${origin}${route}`)}</loc>${lastmod ? `\n\t\t<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}
\t</url>`;
	})
	.join("\n")}
</urlset>`;
}

export function localSitemapXml(origin: string): string {
	return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
\t<url>
\t\t<loc>${escapeXml(`${origin}/locations.kml`)}</loc>
\t\t<lastmod>2026-04-21T05:31:28+00:00</lastmod>
\t</url>
</urlset>`;
}

export function locationsKml(origin: string): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
\t<Document>
\t\t<name>Locations for Roberts Hearing Clinic</name>
\t\t<open>1</open>
\t\t<Folder>
\t\t\t<atom:link href="${escapeXml(origin)}" />
\t\t\t<Placemark>
\t\t\t\t<name><![CDATA[Roberts Hearing Clinic]]></name>
\t\t\t\t<description><![CDATA[Roberts Hearing Clinic - Helping You Hear Life's Best Moments]]></description>
\t\t\t\t<address><![CDATA[4007 Parliament Dr, Alexandria, LA, 71303, US]]></address>
\t\t\t\t<phoneNumber><![CDATA[+1-318-217-8639]]></phoneNumber>
\t\t\t\t<atom:link href="${escapeXml(origin)}" />
\t\t\t\t<LookAt>
\t\t\t\t\t<latitude>31.28230300</latitude>
\t\t\t\t\t<longitude>-92.47903200</longitude>
\t\t\t\t\t<altitude>0</altitude>
\t\t\t\t\t<range></range>
\t\t\t\t\t<tilt>0</tilt>
\t\t\t\t</LookAt>
\t\t\t\t<Point>
\t\t\t\t\t<coordinates>-92.47903200,31.28230300,0</coordinates>
\t\t\t\t</Point>
\t\t\t</Placemark>
\t\t</Folder>
\t</Document>
</kml>`;
}
