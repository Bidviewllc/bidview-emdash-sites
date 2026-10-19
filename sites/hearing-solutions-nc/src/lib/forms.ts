// Website forms (Contact, Book appointment request) built in the admin with
// EmDash's Forms plugin (@emdash-cms/plugin-forms): Plugins → Forms to change
// fields, Plugins → Submissions for the inbox. The site renders the fields in
// the design (SiteForm.astro) and takes submissions itself (/api/form) so it
// can add the spam checks, the lead source fields and the email; it writes into
// the plugin's own storage, so every submission still shows in its inbox.
//
// Each form starts from the template's fields below. A site without the form
// yet gets it created the first time the page is viewed.

import { PluginStorageRepository } from "emdash";
import { getDb } from "emdash/runtime";

export const FORMS_PLUGIN = "emdash-forms";

export type FieldType =
	| "text" | "email" | "textarea" | "number" | "tel" | "url" | "date"
	| "select" | "radio" | "checkbox" | "checkbox-group" | "file" | "hidden";

export type FormField = {
	id: string;
	type: FieldType;
	label: string;
	name: string;
	placeholder?: string;
	helpText?: string;
	required: boolean;
	options?: { label: string; value: string }[];
	defaultValue?: string;
	width: "full" | "half";
	validation?: Record<string, unknown>;
	condition?: { field: string; op: "eq" | "neq" | "filled" | "empty"; value?: string };
};

export type FormDefinition = {
	name: string;
	slug: string;
	pages: { title?: string; fields: FormField[] }[];
	settings: {
		confirmationMessage: string;
		redirectUrl?: string;
		notifyEmails: string[];
		digestEnabled: boolean;
		digestHour: number;
		webhookUrl?: string;
		retentionDays: number;
		spamProtection: "none" | "honeypot" | "turnstile";
		submitLabel: string;
	};
	status: "active" | "paused";
	submissionCount: number;
	lastSubmissionAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type Submission = {
	formId: string;
	data: Record<string, unknown>;
	status: "new" | "read" | "archived";
	starred: boolean;
	notes?: string;
	createdAt: string;
	meta: { ip: string | null; userAgent: string | null; referer: string | null; country: string | null };
};

/**
 * Hidden fields the site fills in: lead source (how the visitor found the
 * site), the page the form was sent from and the spam check result. Leave them
 * on the form in the admin, or that information isn't kept.
 */
export const TRACKING_FIELDS = ["referral_source", "referral_detail", "page_url", "spam_check"] as const;
/** Field name the site fills with the practice's offices (select). */
export const LOCATION_FIELD = "location";

const opt = (...v: string[]) => v.map((x) => ({ label: x, value: x }));
let n = 0;
const field = (type: FieldType, name: string, label: string, extra: Partial<FormField> = {}): FormField => ({
	id: `f${++n}`,
	type,
	name,
	label,
	required: false,
	width: "full",
	...extra,
});
const tracking = () => [
	field("hidden", "referral_source", "Referral source"),
	field("hidden", "referral_detail", "Referral detail"),
	field("hidden", "page_url", "Sent from page"),
	field("hidden", "spam_check", "Spam check"),
];
const base = (name: string, slug: string, fields: FormField[], submitLabel: string): FormDefinition => {
	const now = new Date().toISOString();
	return {
		name,
		slug,
		pages: [{ fields }],
		settings: {
			confirmationMessage: "Thank you, we got your message.",
			redirectUrl: "/thank-you",
			notifyEmails: [],
			digestEnabled: false,
			digestHour: 8,
			retentionDays: 0,
			// The site runs its own checks (/api/form); the plugin's would never see these submissions.
			spamProtection: "none",
			submitLabel,
		},
		status: "active",
		submissionCount: 0,
		lastSubmissionAt: null,
		createdAt: now,
		updatedAt: now,
	};
};

/**
 * HSNC's starting forms. Contact: the Contact board's fields. Appointment
 * request: the fields of the current site's request form
 * (hearingsolutionsofnc.com/schedule-online, Gravity Forms, 2026-10-19). One
 * office, so no location choice; add a "location" select in the admin if a
 * second office opens.
 */
export const DEFAULT_FORMS: Record<string, () => FormDefinition> = {
	contact: () =>
		base(
			"Contact",
			"contact",
			[
				field("text", "name", "Full name", { required: true }),
				field("email", "email", "Email", { required: true }),
				field("tel", "phone", "Phone"),
				field("textarea", "message", "How can we help?"),
				...tracking(),
			],
			"Submit",
		),
	"appointment-request": () =>
		base(
			"Appointment request",
			"appointment-request",
			[
				field("text", "name", "Name", { required: true }),
				field("email", "email", "Email", { required: true }),
				field("text", "day", "Preferred day of the week", { required: true }),
				field("checkbox-group", "times", "Preferred time of the day", { required: true, options: opt("Morning", "Afternoon") }),
				field("textarea", "reason", "Briefly describe the reason for your appointment"),
				...tracking(),
			],
			"Request now",
		),
};

const repo = async <T>(collection: "forms" | "submissions") => {
	const indexes =
		collection === "forms"
			? ["status", "createdAt", "slug"]
			: ["formId", "status", "starred", "createdAt", ["formId", "createdAt"], ["formId", "status"]];
	return new PluginStorageRepository<T>(await getDb(), FORMS_PLUGIN, collection, indexes as (string | string[])[]);
};

/**
 * The form with this slug, from the admin's Forms list. Created from the
 * template's fields the first time. Falls back to the template's fields if the
 * database can't be read, so the page never breaks.
 */
export async function getForm(slug: string): Promise<{ id: string; form: FormDefinition }> {
	const make = DEFAULT_FORMS[slug];
	try {
		const forms = await repo<FormDefinition>("forms");
		const found = await forms.query({ where: { slug }, limit: 1 });
		if (found.items[0]) return { id: found.items[0].id, form: found.items[0].data };
		if (!make) throw new Error(`No form "${slug}"`);
		const form = make();
		const id = `form-${slug}`;
		await forms.put(id, form);
		return { id, form };
	} catch (err) {
		console.error("Forms: using the template's fields", err);
		if (!make) throw err;
		return { id: `form-${slug}`, form: make() };
	}
}

/** All fields of a form (one page in our forms). */
export const fieldsOf = (form: FormDefinition) => form.pages.flatMap((p) => p.fields);

/** Save a submission into the Forms plugin's inbox and update the form's counters. */
export async function saveSubmission(formId: string, form: FormDefinition, submission: Submission): Promise<string> {
	const subs = await repo<Submission>("submissions");
	const id = crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 26);
	await subs.put(id, submission);
	try {
		const forms = await repo<FormDefinition>("forms");
		const submissionCount = await subs.count({ formId });
		await forms.put(formId, { ...form, submissionCount, lastSubmissionAt: submission.createdAt });
	} catch (err) {
		console.error("Forms: counter update failed (submission saved)", err);
	}
	return id;
}
