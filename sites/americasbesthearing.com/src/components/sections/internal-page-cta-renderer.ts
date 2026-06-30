import type { CheerioAPI } from "cheerio";

const escapeHtml = (value: unknown) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

function entryData(item: any) {
	return item?.data ? { id: item.id, slug: item.slug || item.id, ...item.data } : item || {};
}

function localHref(value: unknown) {
	const href = String(value || "").trim();
	if (!href) return "/request-an-appointment/";
	return (
		href
			.replace(/^https?:\/\/(?:www\.)?americasbesthearing\.com/i, "")
			.replace(/^https?:\/\/localhost:4321/i, "")
			.replace(/^https?:\/\/127\.0\.0\.1:4321/i, "") || "/"
	);
}

export function updateInternalPageCta($: CheerioAPI, ctaEntry: unknown) {
	const data = entryData(ctaEntry);
	const heading = String(data.heading || "Are you ready to hear and be heard?").trim();
	const body = String(
		data.body ||
			"Hearing clearly impacts your quality of life now and for years to come in so many ways. Call us today and take the first step toward clearer, more confident listening.",
	).trim();
	const buttonText = String(data.button_text || "Schedule your Appointment").trim();
	const buttonUrl = localHref(data.button_url || "/request-an-appointment/");

	$(".astro-element-4e730e7").each((_, element) => {
		const section = $(element);
		if (!section.find(".astro-element-1ec867d, .astro-element-d48d373, .astro-element-26a33ab").length) return;
		section.find(".astro-element-1ec867d .astro-heading-title").first().text(heading);
		section.find(".astro-element-d48d373 .astro-widget-container").first().html(`<p>${escapeHtml(body)}</p>`);
		const button = section.find(".astro-element-26a33ab .astro-button").first();
		if (button.length) {
			button.attr("href", buttonUrl);
			button.find(".astro-button-text").first().text(buttonText);
		}
	});
}
