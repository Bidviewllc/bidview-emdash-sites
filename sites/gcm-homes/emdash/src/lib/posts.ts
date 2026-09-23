// Market Insights (the blog) — shared data helpers for the archive, the
// category pages and the single-post template.
//
// Reads go straight to D1, the same way the home page's Market Insights strip
// does it, so a list page costs two queries however many posts it shows:
// one for the posts, one batched taxonomy lookup for their categories.
//
// Paging and filtering live in the PATH (/posts/page/2/, /category/<slug>/),
// never the query string: the edge cache in src/worker.ts keys on the path and
// drops the query, so ?page=2 would be served page 1 from cache. Search (?q=)
// is the one exception, and worker.ts bypasses the cache for it.
import { getTermsForEntries } from "emdash";
import { env } from "cloudflare:workers";
import { firstImageUrl } from "./media";

export const POSTS_PER_PAGE = 9;

// Same three real photographs the home page falls back to when a post has no
// featured image of its own (see the note in src/pages/index.astro).
const POST_FALLBACK_IMAGES = [
	"/assets/gallery-1.jpg",
	"/assets/listing-hero-exterior.jpg",
	"/assets/listing-interior-3.jpg",
];

export interface PostCard {
	id: string;
	slug: string;
	title: string;
	excerpt: string;
	image: string;
	categories: { slug: string; label: string }[];
	date: string;
	readMinutes: number;
}

export interface Category {
	slug: string;
	label: string;
	count: number;
}

const db = () => (env as any)?.DB;

/** D1 stores published_at as "YYYY-MM-DD HH:MM:SS" in UTC. */
export function formatDate(v: unknown): string {
	if (!v) return "";
	const d = v instanceof Date ? v : new Date(String(v).replace(" ", "T") + "Z");
	if (isNaN(d.getTime())) return "";
	return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Plain text of a Portable Text value (or its JSON string). */
export function portableTextToPlain(content: unknown): string {
	let blocks: any = content;
	if (typeof content === "string") {
		try { blocks = JSON.parse(content); } catch { return content; }
	}
	if (!Array.isArray(blocks)) return "";
	return blocks
		.map((b: any) => (Array.isArray(b?.children) ? b.children.map((c: any) => c?.text ?? "").join("") : ""))
		.join(" ");
}

/** Reading time at ~225 words a minute, never less than 1. */
export function readMinutes(content: unknown): number {
	const words = portableTextToPlain(content).split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 225));
}

/** URL-safe id for a heading. PostBlock.astro and the TOC both use this. */
export function headingId(text: string): string {
	return (
		String(text)
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "section"
	);
}

/** The post's H2s, in order, for the "In this article" table of contents. */
export function extractH2s(content: unknown): { id: string; text: string }[] {
	if (!Array.isArray(content)) return [];
	return content
		.filter((b: any) => b?._type === "block" && b.style === "h2")
		.map((b: any) => {
			const text = (b.children ?? []).map((c: any) => c?.text ?? "").join("").trim();
			return { id: headingId(text), text };
		})
		.filter((h) => h.text);
}

function toCard(p: any, i: number, cats: Map<string, any[]>): PostCard {
	return {
		id: p.id,
		slug: p.slug,
		title: p.title,
		excerpt: p.excerpt || "",
		image: firstImageUrl(p.featured_image) ?? POST_FALLBACK_IMAGES[i % POST_FALLBACK_IMAGES.length],
		categories: (cats.get(p.id) ?? []).map((t: any) => ({ slug: t.slug, label: t.label })),
		date: formatDate(p.published_at),
		readMinutes: readMinutes(p.content),
	};
}

async function withCategories(rows: any[], offset = 0): Promise<PostCard[]> {
	let cats = new Map<string, any[]>();
	try {
		cats = await getTermsForEntries("posts", rows.map((r) => r.id), "category");
	} catch { cats = new Map(); }
	return rows.map((r, i) => toCard(r, offset + i, cats));
}

/**
 * One page of published posts, newest first. `categorySlug` narrows to one
 * category; `q` matches the title or excerpt. Returns the page plus the total
 * so the caller can build pagination.
 */
export async function listPosts(opts: {
	page?: number;
	perPage?: number;
	categorySlug?: string | null;
	q?: string | null;
	excludeId?: string | null;
} = {}): Promise<{ posts: PostCard[]; total: number }> {
	const DB = db();
	if (!DB) return { posts: [], total: 0 };
	const perPage = opts.perPage ?? POSTS_PER_PAGE;
	const page = Math.max(1, opts.page ?? 1);
	const offset = (page - 1) * perPage;

	const where: string[] = ["p.status = 'published'", "p.deleted_at IS NULL"];
	const args: unknown[] = [];
	if (opts.categorySlug) {
		where.push(
			`p.id IN (SELECT ct.entry_id FROM content_taxonomies ct JOIN taxonomies t ON t.id = ct.taxonomy_id
			  WHERE ct.collection = 'posts' AND t.name = 'category' AND t.slug = ?)`,
		);
		args.push(opts.categorySlug);
	}
	if (opts.q) {
		where.push("(p.title LIKE ? OR p.excerpt LIKE ?)");
		args.push(`%${opts.q}%`, `%${opts.q}%`);
	}
	if (opts.excludeId) {
		where.push("p.id != ?");
		args.push(opts.excludeId);
	}
	const whereSql = where.join(" AND ");

	try {
		const countRow = await DB.prepare(`SELECT count(*) AS n FROM ec_posts p WHERE ${whereSql}`).bind(...args).first();
		const { results } = await DB.prepare(
			`SELECT p.id, p.slug, p.title, p.excerpt, p.featured_image, p.published_at, p.content
			 FROM ec_posts p WHERE ${whereSql} ORDER BY p.published_at DESC LIMIT ? OFFSET ?`,
		)
			.bind(...args, perPage, offset)
			.all();
		return { posts: await withCategories(results ?? [], offset), total: Number(countRow?.n ?? 0) };
	} catch {
		return { posts: [], total: 0 };
	}
}

/** Every category that has at least one published post, A–Z. */
export async function listCategories(): Promise<Category[]> {
	const DB = db();
	if (!DB) return [];
	try {
		const { results } = await DB.prepare(
			`SELECT t.slug, t.label, count(p.id) AS n
			 FROM taxonomies t
			 JOIN content_taxonomies ct ON ct.taxonomy_id = t.id AND ct.collection = 'posts'
			 JOIN ec_posts p ON p.id = ct.entry_id AND p.status = 'published' AND p.deleted_at IS NULL
			 WHERE t.name = 'category'
			 GROUP BY t.id ORDER BY t.label`,
		).all();
		return (results ?? []).map((r: any) => ({ slug: r.slug, label: r.label, count: Number(r.n) }));
	} catch {
		return [];
	}
}

/**
 * The pool the post sidebar picks its "Featured Listing" from — the same query
 * as the home page's Featured Listings carousel. The whole pool is rendered and
 * a script shows one at random, so the pick changes on every page load even
 * though the page itself is edge-cached for five minutes.
 */
export async function featuredListingPool(): Promise<any[]> {
	const DB = db();
	if (!DB) return [];
	try {
		const { results } = await DB.prepare(
			"SELECT id, slug, address, city, state, price, beds, baths, sqft, lot_acres, category, sub_type, type, waterfront, photo FROM listings WHERE status='Active' AND photo IS NOT NULL ORDER BY price DESC LIMIT 9",
		).all();
		return results ?? [];
	} catch {
		return [];
	}
}
