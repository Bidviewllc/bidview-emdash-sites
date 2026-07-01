// Custom canonical sitemap. Overrides emdash's default sitemap, which emitted
// /location_pages/{slug} and /service_pages/{slug} URLs that 302-redirect to /404/.
// ROUTES = live americasbesthearing.com canonical URLs, each verified to render 200 on this site.
export const prerender = false;

const ROUTES = [
	"/",
	"/about/",
	"/all-locations/",
	"/audiologist-hearing-aids-anoka-mn/",
	"/audiologist-hearing-aids-eden-prairie-mn/",
	"/audiologist-hearing-aids-edina-mn/",
	"/audiologist-hearing-aids-lake-wales-fl/",
	"/audiologist-hearing-aids-lansing-mi/",
	"/audiologist-hearing-aids-maple-grove-mn/",
	"/audiologist-hearing-aids-mendota-heights-mn/",
	"/audiologist-hearing-aids-new-ulm-mn/",
	"/audiologist-hearing-aids-portage-mi/",
	"/audiologist-hearing-aids-roseville-mn/",
	"/audiologist-hearing-aids-sebring-fl/",
	"/audiologist-hearing-aids-willmar-mn/",
	"/audiologist-hearing-aids-winter-haven-fl/",
	"/audiology-services/",
	"/audiology-services/ear-wax-removal/",
	"/audiology-services/hearing-aid-fittings/",
	"/audiology-services/hearing-aid-services/",
	"/audiology-services/hearing-tests/",
	"/contact/",
	"/custom-hearing-protection/",
	"/ear-candles-what-you-need-to-know-before-you-try-them/",
	"/hearing-aid-feedback-problem-why-hearing-aids-whistle-and-what-to-do/",
	"/hearing-aids-for-tinnitus/",
	"/hearing-aids-products/",
	"/hearing-aids-products/hearing-aid-alternatives/",
	"/hearing-aids-products/hearing-aid-batteries/",
	"/hearing-test-online-what-it-means-when-to-get-in-person-exam/",
	"/hyperacusis-when-everyday-sounds-feel-too-loud/",
	"/news/",
	"/our-team/",
	"/pressure-in-ear/",
	"/privacy-policy/",
	"/rechargeable-hearing-aids-simple-reliable-and-built-for-everyday-life/",
	"/request-an-appointment-anoka-mn/",
	"/request-an-appointment-eden-prairie-mn/",
	"/request-an-appointment-edina-mn/",
	"/request-an-appointment-lake-wales-fl/",
	"/request-an-appointment-lansing-mi/",
	"/request-an-appointment-maple-grove-mn/",
	"/request-an-appointment-mendota-heights-mn/",
	"/request-an-appointment-new-ulm-mn/",
	"/request-an-appointment-portage-mi/",
	"/request-an-appointment-roseville-mn/",
	"/request-an-appointment-sebring-fl/",
	"/request-an-appointment-willmar-mn/",
	"/request-an-appointment-winter-haven-fl/",
	"/request-an-appointment/",
	"/resources/insurance/",
	"/sitemap/",
	"/swimmers-ear-explained-how-to-spot-it-treat-it-and-keep-it-from-coming-back/",
	"/terms-of-service/",
	"/thank-you-for-contacting-us/",
	"/thank-you/",
	"/what-are-the-types-of-hearing-tests/",
];

function escapeXml(v) {
	return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET({ request }) {
	const origin = new URL(request.url).origin;
	const body = [...new Set(ROUTES)]
		.sort()
		.map((r) => `  <url><loc>${escapeXml(origin + r)}</loc></url>`)
		.join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
	return new Response(xml, {
		headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
	});
}
