/**
 * Placeholder detection for Grant's contact details.
 *
 * ContactCta was written so a contact row stays hidden until its field holds a
 * real value — "nothing invented can ship". That worked while the fields were
 * empty, but the shared `contact_cta` entry has since been filled in with
 * stand-ins (333-333-3333, "123 Lakeview Lane, Incline Village, NV 000000"),
 * which sail past an is-it-empty test and render as though they were real.
 *
 * It stopped being cosmetic when the Contact page got its office/hours strip:
 * the strip gives one address and the form block underneath gave a different,
 * fake one, on the same screen. A visitor cannot tell which is right.
 *
 * So the test is now "is this a real value", not "is this a non-empty value".
 * Anything that reads as a placeholder is treated as unset and its row is
 * hidden — the page is simply quieter until someone saves a genuine value in
 * the dashboard, at which point it appears with no code change.
 *
 * Deliberately conservative: these only reject patterns that cannot be real
 * (555 numbers are reserved for fiction, an all-zero postal code is not a
 * postal code). Anything plausible is passed through untouched — including
 * grant@GCMHomes.com, which looks like a genuine address and is left alone.
 */

/** The phone, or null when it is a placeholder. */
export function realPhone(v: unknown): string | null {
	const raw = String(v ?? "").trim();
	if (!raw) return null;
	const digits = raw.replace(/\D/g, "");
	if (digits.length < 10) return null;
	const ten = digits.slice(-10);
	const area = ten.slice(0, 3);
	const exchange = ten.slice(3, 6);
	if (new Set(ten).size === 1) return null; // 3333333333
	if (area === exchange) return null; // 333-333-3333, 775-775-…
	if (area === "555" || exchange === "555") return null; // reserved for fiction
	if (ten.slice(3) === "0000000") return null; // …-000-0000
	return raw;
}

/** The mailing address, or null when it is a placeholder. */
export function realAddress(v: unknown): string | null {
	const raw = String(v ?? "").trim();
	if (!raw) return null;
	// An all-zero (or all-same-digit) postal code is the giveaway: "NV 000000"
	// is not a ZIP at all — a US ZIP is 5 digits, or 5+4.
	const zip = raw.match(/\b(\d{5,6})(?:-\d{4})?\b\s*$/);
	if (zip && new Set(zip[1]).size === 1) return null;
	if (zip && zip[1].length !== 5) return null;
	// The design's own stand-in street, kept verbatim in the seeded entry.
	if (/\b123\s+Lakeview\s+Lane\b/i.test(raw)) return null;
	return raw;
}

/**
 * The email, or null when blank. There is no placeholder test here on purpose:
 * every address on file so far has been plausible, and guessing at which ones
 * are fake risks hiding a real one. Add a case here only for a value known to
 * be a stand-in.
 */
export function realEmail(v: unknown): string | null {
	const raw = String(v ?? "").trim();
	return raw || null;
}
