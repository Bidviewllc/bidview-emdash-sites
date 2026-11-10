// Patient resources whose PDF is handed out after a short form, as on the live
// site (Gravity Forms on /consumers-guide-to-hearing-aids/, Liz 2026-11-10: the
// practice wants an email each time someone downloads the guide).
// The resource page shows the form under its text instead of the "Forms" card;
// once the form is sent, the thank-you page (/thank-you?guide=<slug>) shows the
// download button. The PDF is the resource's "Form PDF" in the admin.
// The email goes to the form's "Notify emails" (Plugins → Forms), else the
// practice email on Practice details.

/** Resource slug → form slug (src/lib/forms.ts). */
export const GATED_DOWNLOADS: Record<string, string> = {
	"consumers-guide-to-hearing-aids": "consumer-guide",
};

/** Where the form sends people: the thank-you page with the download. */
export const guideThankYou = (resourceSlug: string) => `/thank-you?guide=${resourceSlug}`;
