// Blog pagination (Liz, 2026-11-05): 10 posts per page at /blog, /blog/page/2...
// and /blog/category/<cat>, /blog/category/<cat>/page/2... Real links, so search
// engines can reach every post; each page is its own canonical address. On page 1
// of "All", the featured post sits above the list and doesn't count toward the 10.
import type { Post } from "../data/types";

export const PER_PAGE = 10;

/**
 * The posts listed in an archive: "All" is every post but the featured one (it has
 * its own block on page 1); a category is every post filed under it, featured one
 * included, newest first.
 */
export const listed = (posts: Post[], featured: Post | undefined, catSlug?: string) =>
	catSlug
		? [...(featured ? [featured] : []), ...posts]
				.filter((p) => (p.catSlugs?.length ? p.catSlugs.includes(catSlug) : p.catSlug === catSlug))
				.sort((a, b) => (b.iso ?? "").localeCompare(a.iso ?? ""))
		: posts;

export const pageCount = (count: number) => Math.max(1, Math.ceil(count / PER_PAGE));

/** Page number from the address ("2" → 2); null when it isn't a page that exists (or is page 1, which lives at the plain address). */
export function pageParam(raw: string | undefined, count: number): number | null {
	if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
	const n = Number(raw);
	return n >= 2 && n <= pageCount(count) ? n : null;
}

/** Page numbers for the pager: first, last, and the two around the current one, with gaps ("…"). */
export function pagerItems(current: number, total: number): (number | "gap")[] {
	const keep = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
	const out: (number | "gap")[] = [];
	let last = 0;
	for (const n of [...keep].sort((a, b) => a - b)) {
		if (n - last === 2) out.push(n - 1);
		else if (n - last > 2) out.push("gap");
		out.push(n);
		last = n;
	}
	return out;
}
