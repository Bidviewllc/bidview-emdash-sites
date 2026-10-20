// Blog posts, categories and patient resources: the seed's starting content.
// HSNC: migrated from the current WordPress site (2026-10-19): posts from 2025 on,
// the patient resource pages, in src/data/content/hsnc/ (JSON for the fields,
// one Markdown file per body). In EmDash these are posts, categories (a taxonomy)
// and resource records.
import postBody from "./content/postbody.json";
import hsPosts from "./content/hsnc/posts.json";
import hsRes from "./content/hsnc/resources.json";

export const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

export type Post = {
	slug: string;
	title: string;
	date: string;
	summary: string;
	tone: string;
	cat: string;
	catSlug: string;
	author: string;
	/** Featured image URL; a placeholder shows when there is none. */
	image?: string;
	/** Featured image alt text (seed). */
	imageAlt?: string;
	featured?: boolean;
	/** Publish date for structured data. */
	iso?: string;
	/** Article (rich text); the sample body shows when empty. */
	content?: import("../lib/portable-text").PTBlock[];
};

const longDate = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const allHsPosts: Post[] = hsPosts.map((p) => ({
	slug: p.slug,
	title: p.title,
	date: longDate(p.date),
	summary: p.excerpt,
	tone: "warm",
	cat: p.cat,
	catSlug: slugify(p.cat),
	author: p.author,
	...(p.image ? { image: p.image.url, imageAlt: p.image.alt } : {}),
	featured: p.featured,
}));

/** The featured post at the top of the blog's "All" view (the newest). */
export const featured: Post = allHsPosts.find((p) => p.featured) ?? allHsPosts[0];
/** Every other post, newest first. Bodies: src/data/content/hsnc/posts/<slug>.md. */
export const posts: Post[] = allHsPosts.filter((p) => p !== featured);

/** Only the categories the posts use. */
export const categories = [...new Set(allHsPosts.map((p) => p.cat))].map((name) => ({ name, slug: slugify(name) }));

/** Article body (same sample body for every post). "MIDCTA" marks where the mid-article booking box goes. */
export const articleBody: string[] = postBody.body.map((b: string) => b.replace(/src="[^"]*"/, 'src="/assets/photos/consult.jpg" loading="lazy"'));

export type Resource = {
	slug: string;
	t: string;
	d: string;
	tags: string[];
	page: boolean;
	forms: boolean;
	hideFromHub?: boolean;
	/** Own page content (rich text). */
	content?: import("../lib/portable-text").PTBlock[];
	/** Form buttons: PDF file and online form link (buttons show only when set, or while reviewing). */
	formsPdf?: string;
	formsUrl?: string;
	/** Hero photo for its own page. */
	heroImage?: { src: string; alt: string };
};
/** Resource records. Bodies (when "body" is true): src/data/content/hsnc/resources/<slug>.md. */
export const resources: (Resource & { body: boolean })[] = hsRes.resources.map((r) => ({
	slug: r.slug,
	t: r.t,
	d: r.d,
	tags: r.tags,
	page: r.page,
	forms: r.forms,
	hideFromHub: "hideFromHub" in r ? !!r.hideFromHub : false,
	body: r.body,
	...("formsUrl" in r && r.formsUrl ? { formsUrl: r.formsUrl as string } : {}),
}));
/** Tag group order ("Group by tag"). */
export const resourceGroups: string[] = hsRes.order;
