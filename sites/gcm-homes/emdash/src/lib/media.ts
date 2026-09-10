// Resolving emdash image fields to URLs.
//
// An emdash `image` field is stored as a JSON media object, not a URL — e.g.
//   {"id":"01M0…","provider":"local","filename":"Crystal-Bay.png",
//    "meta":{"storageKey":"01M0…png", …}}
// D1 hands that column back as a *string*, so anything that drops the raw value
// into an `src` or `background-image` gets a JSON blob instead of a picture. That
// was a real bug: the listing page's Community Insights map broke the moment a
// neighbourhood actually had a map image uploaded.
//
// Files are served from /_emdash/api/media/file/<storageKey> — see
// media-upload.ts in the emdash package, which builds the same URL.

export function imageUrl(field: unknown): string | null {
	if (!field) return null;

	let obj: any = field;
	if (typeof field === "string") {
		const s = field.trim();
		if (!s) return null;
		// Seeded rows and older data hold a plain path already; pass those through.
		if (s[0] !== "{" && s[0] !== "[") return s;
		try {
			obj = JSON.parse(s);
		} catch {
			return null;
		}
	}

	if (Array.isArray(obj)) obj = obj[0];
	if (!obj || typeof obj !== "object") return null;

	const key = obj?.meta?.storageKey ?? obj?.storageKey;
	if (typeof key === "string" && key) return `/_emdash/api/media/file/${key}`;

	// Some shapes carry a ready-made url instead.
	if (typeof obj.url === "string" && obj.url) return obj.url;

	return null;
}

/** First non-null resolved URL, else null. Saves a chain of `?? imageUrl(…)`. */
export function firstImageUrl(...fields: unknown[]): string | null {
	for (const f of fields) {
		const u = imageUrl(f);
		if (u) return u;
	}
	return null;
}
