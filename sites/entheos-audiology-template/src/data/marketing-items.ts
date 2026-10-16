// The "Marketing & tracking" admin page (Bidview and Entheos only: Admin role).
// Each item has an on/off switch and a value. Secrets are write-only: the page
// shows whether one is saved, never the value. Tracking and custom code run
// only on the live domain, so previews, workers.dev and local copies never
// send analytics or compete with the real site (Vince's rule).

export type MarketingItem = {
	key: string;
	label: string;
	help: string;
	kind: "text" | "secret" | "code" | "switch";
	placeholder?: string;
	/** Starting state for a new site. */
	on?: boolean;
	value?: string;
};

export type MarketingSection = { title: string; intro: string; items: MarketingItem[] };

export const MARKETING_SECTIONS: MarketingSection[] = [
	{
		title: "Live site",
		intro: "Tracking, custom code and Turnstile only run on this address. Leave it empty until the site is on its real domain.",
		items: [
			{ key: "live_domain", label: "Live domain", kind: "text", placeholder: "lakeviewhearing.com", on: true, help: "The practice's own domain, without https:// (www. is matched too)." },
		],
	},
	{
		title: "Lead emails and spam",
		intro: "How website form submissions reach the practice. Every submission is saved in Plugins → Submissions either way.",
		items: [
			{ key: "resend_key", label: "Resend API key", kind: "secret", on: true, placeholder: "re_…", help: "Sends the lead emails from noreply@bidview.net. Who gets them: each form's “Notify emails” (Plugins → Forms), else the email on Practice details." },
			{ key: "lead_bcc", label: "Hidden copy of every lead to", kind: "text", on: true, value: "local@bidviewmarketing.com", help: "Bidview's monitoring copy. Separate several addresses with commas." },
			{ key: "ai_spam", label: "AI spam check", kind: "switch", on: true, help: "Cloudflare's AI reads each message and flags sales pitches and junk. Flagged ones are saved as Archived, not emailed." },
			{ key: "turnstile_site_key", label: "Cloudflare Turnstile site key", kind: "text", on: false, placeholder: "0x4AAAA…", help: "The “are you human” check on forms. Needs the secret key below too. Runs on the live domain only." },
			{ key: "turnstile_secret", label: "Cloudflare Turnstile secret key", kind: "secret", on: false, help: "Goes with the site key above." },
		],
	},
	{
		title: "Tracking",
		intro: "Phone taps (click_phone_number) and form sends (form_submit, with the lead source) are reported to whichever of these is on.",
		items: [
			{ key: "gtm", label: "Google Tag Manager container ID", kind: "text", on: false, placeholder: "GTM-XXXXXXX", help: "If Tag Manager loads GA4 and Ads, leave those two off here." },
			{ key: "ga4", label: "Google Analytics 4 measurement ID", kind: "text", on: false, placeholder: "G-XXXXXXXXXX", help: "" },
			{ key: "gads", label: "Google Ads tag ID", kind: "text", on: false, placeholder: "AW-XXXXXXXXX", help: "" },
			{ key: "gads_form_label", label: "Google Ads conversion label for form sends", kind: "text", on: false, placeholder: "AbC-D_efG-h12_34-567", help: "Optional. Counts each form send as an Ads conversion." },
			{ key: "clarity", label: "Microsoft Clarity project ID", kind: "text", on: false, placeholder: "abcd1234ef", help: "" },
			{ key: "call_tracking", label: "Call tracking code", kind: "code", on: false, placeholder: "<script src=…></script>", help: "The snippet from CallRail, Invoca or similar. Added at the end of every page." },
		],
	},
	{
		title: "Custom code",
		intro: "For anything else a tool asks you to paste into the site. Live domain only.",
		items: [
			{ key: "code_head", label: "Code in the page head", kind: "code", on: false, help: "Verification tags, pixels." },
			{ key: "code_body_start", label: "Code at the start of the page body", kind: "code", on: false, help: "For example a Tag Manager noscript tag from another tool." },
			{ key: "code_body_end", label: "Code at the end of the page body", kind: "code", on: false, help: "Chat widgets, other scripts." },
		],
	},
];

export const MARKETING_ITEMS = MARKETING_SECTIONS.flatMap((s) => s.items);
