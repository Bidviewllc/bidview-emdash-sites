// Blog posts, categories and patient resources, built from the placeholder
// content Claude Design supplied (src/data/content/*.json). In phase 2 these are
// EmDash posts, categories (a taxonomy) and resource records.
import postBody from "./content/postbody.json";
import rawPosts from "./content/posts.json";
import rawRes from "./content/res.json";

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
	featured?: boolean;
	/** Publish date for structured data. */
	iso?: string;
	/** Article (rich text); the sample body shows when empty. */
	content?: import("../lib/portable-text").PTBlock[];
};

export const posts: Post[] = rawPosts.map((p) => ({
	slug: slugify(p.t),
	title: p.t,
	date: p.date,
	summary: p.sum,
	tone: p.tone,
	cat: p.cat,
	catSlug: slugify(p.cat),
	author: p.author,
}));

/** The featured post at the top of the blog's "All" view. */
export const featured: Post = {
	slug: "why-most-people-wait-seven-years-to-treat-hearing-loss",
	title: "Why most people wait seven years to treat hearing loss",
	date: "October 6, 2026",
	summary: "Fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt. In culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus. Nulla gravida orci a odio nullam varius turpis et commodo pharetra est. Eros bibendum elit nec.",
	tone: "warm",
	cat: "Hearing Loss",
	catSlug: "hearing-loss",
	author: "Dr. Jordan Ellis, Au.D.",
};

export const categories = ["Hearing Loss", "Hearing Aids", "Tinnitus", "Tips & Care"].map((name) => ({ name, slug: slugify(name) }));

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
const R = rawRes.R as Record<string, { t: string; d: string; tags: { t: string }[]; page: boolean; forms: boolean }>;
export const resources: Resource[] = Object.values(R).map((r) => ({ slug: slugify(r.t), t: r.t, d: r.d, tags: r.tags.map((x) => x.t), page: r.page, forms: r.forms }));
export const resourceGroups: string[] = rawRes.order;
