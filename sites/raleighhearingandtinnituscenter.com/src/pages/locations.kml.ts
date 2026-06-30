export const prerender = false;

const LOCATION = {
	name: "Raleigh Hearing and Tinnitus Center",
	description: "Raleigh Hearing - ",
	address: "US, 10320 Durant Rd STE 107, Raleigh, NC, 27614",
	phone: "+19195050894",
	latitude: "35.90464400",
	longitude: "-78.58670460",
};

export async function GET({ url }: { url: URL }) {
	const origin = url.origin.replace(/\/+$/g, "");
	const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
	<Document>
		<name>Locations for ${escapeCdata(LOCATION.name)}</name>
		<open>1</open>
		<Folder>
			<atom:link href="${escapeAttr(origin)}" />
			<Placemark>
				<name><![CDATA[${escapeCdata(LOCATION.name)}]]></name>
				<description><![CDATA[${escapeCdata(LOCATION.description)}]]></description>
				<address><![CDATA[${escapeCdata(LOCATION.address)}]]></address>
				<phoneNumber><![CDATA[${escapeCdata(LOCATION.phone)}]]></phoneNumber>
				<atom:link href="${escapeAttr(origin)}"/>
				<LookAt>
					<latitude>${LOCATION.latitude}</latitude>
					<longitude>${LOCATION.longitude}</longitude>
					<altitude>0</altitude>
					<range></range>
					<tilt>0</tilt>
				</LookAt>
				<Point>
					<coordinates>${LOCATION.longitude},${LOCATION.latitude}</coordinates>
				</Point>
			</Placemark>
		</Folder>
	</Document>
</kml>`;

	return new Response(kml, {
		headers: { "Content-Type": "application/vnd.google-earth.kml+xml; charset=utf-8" },
	});
}

function escapeCdata(value: string) {
	return value.replace(/]]>/g, "]]]]><![CDATA[>");
}

function escapeAttr(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
