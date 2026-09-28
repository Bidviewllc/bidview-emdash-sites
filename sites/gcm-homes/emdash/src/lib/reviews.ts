// Client reviews — the `reviews` collection, read straight from D1 the same way
// posts.ts does. Feeds /reviews/ and the home page's "The Proof" carousel
// (every visible review, featured ones first).
//
// Rules the data follows (see seed/reviews.json):
//   - text is verbatim from the source site, linked back to it
//   - `hidden` reviews never render (used while a review's full text is missing)
//   - review_date is YYYY-MM or YYYY; Google's are approximate (it only shows "N months ago")
//
// No Review / AggregateRating schema is emitted anywhere: Google's guidelines
// don't allow it for reviews collected from other sites.
import { env } from "cloudflare:workers";

export interface Review {
	id: string;
	name: string;
	source: string;
	rating: number | null; // null = the client gave no star rating (Realtor.com "recommendation")
	date: string; // "June 2026", or "" when unknown
	body: string;
	location: string;
	url: string;
	featured: boolean;
}

// Display order for the source filter chips on /reviews/.
export const SOURCE_ORDER = ["Google", "Zillow", "Realtor.com", "Yelp", "Experience.com", "Other"];

const db = () => (env as any)?.DB;

// "2026-04" -> "April 2026"; a bare "2024" (source only said "2 years ago") -> "2024".
function monthLabel(v: unknown): string {
	const s = String(v ?? "");
	if (/^\d{4}$/.test(s)) return s;
	const m = /^(\d{4})-(\d{2})/.exec(s);
	if (!m) return "";
	const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
	return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function toReview(r: any): Review {
	return {
		id: String(r.id),
		name: String(r.title ?? ""),
		source: String(r.source ?? "Other"),
		rating: r.rating == null || r.rating === "" ? null : Math.max(1, Math.min(5, Number(r.rating))),
		date: monthLabel(r.review_date),
		body: String(r.body ?? ""),
		location: String(r.location ?? ""),
		url: String(r.source_url ?? ""),
		featured: Number(r.featured) === 1,
	};
}

/** Every visible, published review, newest first. [] if the table doesn't exist yet. */
export async function allReviews(): Promise<Review[]> {
	try {
		const { results } = await db()
			.prepare(
				`SELECT id, title, source, rating, review_date, body, location, source_url, featured
				   FROM ec_reviews
				  WHERE status = 'published' AND deleted_at IS NULL AND COALESCE(hidden, 0) = 0
				  ORDER BY review_date DESC, title`,
			)
			.all();
		return (results ?? []).map(toReview);
	} catch {
		return [];
	}
}

/** Every visible review for the home page carousel, featured ones first. */
export async function homeReviews(): Promise<Review[]> {
	const all = await allReviews();
	return [...all.filter((r) => r.featured), ...all.filter((r) => !r.featured)];
}

/** Count, average star rating (over reviews that have one), and a per-source breakdown. */
export function summarize(reviews: Review[]) {
	const count = reviews.length;
	const rated = reviews.filter((r) => r.rating != null);
	const avg = rated.length ? rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length : 0;
	const bySource = SOURCE_ORDER.map((source) => ({
		source,
		count: reviews.filter((r) => r.source === source).length,
	})).filter((s) => s.count > 0);
	return { count, rated: rated.length, avg: Math.round(avg * 10) / 10, bySource };
}
