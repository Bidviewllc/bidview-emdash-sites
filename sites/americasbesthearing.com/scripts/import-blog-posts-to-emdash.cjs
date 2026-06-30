require("./require-content-overwrite.cjs");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { load } = require("cheerio");
const Database = require("better-sqlite3");

const root = process.cwd();
const seedPath = path.join(root, "seed", "seed.json");
const mediaRoot = path.join(root, "public", "assets", "media");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const defaultAuthorName = "Kylie Kasel, Au.D.";

const postSlugs = [
	"what-are-the-types-of-hearing-tests",
	"hearing-test-online-what-it-means-when-to-get-in-person-exam",
	"swimmers-ear-explained-how-to-spot-it-treat-it-and-keep-it-from-coming-back",
	"hearing-aids-for-tinnitus",
	"pressure-in-ear",
	"hyperacusis-when-everyday-sounds-feel-too-loud",
	"ear-candles-what-you-need-to-know-before-you-try-them",
	"rechargeable-hearing-aids-simple-reliable-and-built-for-everyday-life",
];

function randomId() {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase();
}

function slugify(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function cleanText(value) {
	return String(value || "").replace(/\s+/g, " ").trim();
}

function parseDate(text) {
	const date = new Date(cleanText(text));
	return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function nodeChildrenToSpans($, node) {
	const spans = [];
	const markDefs = [];
	let spanIndex = 1;

	function pushText(text, marks = []) {
		if (!text || !cleanText(text)) return;
		spans.push({
			_type: "span",
			_key: `span-${spanIndex++}`,
			text: text.replace(/\s+/g, " "),
			marks,
		});
	}

	function walk(child, inheritedMarks = []) {
		if (child.type === "text") {
			pushText(child.data || "", inheritedMarks);
			return;
		}
		if (child.type !== "tag") return;
		const name = String(child.name || "").toLowerCase();
		const marks = [...inheritedMarks];
		if (name === "strong" || name === "b") marks.push("strong");
		if (name === "em" || name === "i") marks.push("em");
		if (name === "a") {
			const href = $(child).attr("href");
			if (href) {
				const key = `link-${markDefs.length + 1}`;
				markDefs.push({ _key: key, _type: "link", href });
				marks.push(key);
			}
		}
		if (name === "br") {
			pushText("\n", marks);
			return;
		}
		for (const nested of child.children || []) walk(nested, marks);
	}

	for (const child of node.children || []) walk(child);
	return { children: spans, markDefs };
}

function blockFromElement($, element, style = "normal", extra = {}) {
	const { children, markDefs } = nodeChildrenToSpans($, element);
	if (!children.length) return null;
	return {
		_type: "block",
		_key: `block-${randomId()}`,
		style,
		children,
		markDefs,
		...extra,
	};
}

function contentToPortableText($, container) {
	const blocks = [];
	container.children().each((_, element) => {
		const tag = String(element.name || "").toLowerCase();
		if (["h2", "h3", "h4", "h5", "h6"].includes(tag)) {
			const block = blockFromElement($, element, tag);
			if (block) blocks.push(block);
			return;
		}
		if (tag === "p") {
			const block = blockFromElement($, element, "normal");
			if (block) blocks.push(block);
			return;
		}
		if (tag === "ul" || tag === "ol") {
			$(element)
				.children("li")
				.each((__, li) => {
					const block = blockFromElement($, li, "normal", {
						listItem: tag === "ol" ? "number" : "bullet",
						level: 1,
					});
					if (block) blocks.push(block);
				});
		}
	});
	return blocks;
}

function findFeaturedImage($) {
	const image = $("img")
		.filter((_, img) => {
			const src = String($(img).attr("src") || "");
			if (!src) return false;
			if (src.includes("logo")) return false;
			if (src.includes("sidebar-cta")) return false;
			if (src.includes("favicon")) return false;
			return true;
		})
		.first();
	if (!image.length) return null;
	const src = image.attr("src") || "";
	const filename = path.basename(src);
	return {
		src: `/assets/media/${filename}`,
		filename,
		alt: image.attr("alt") || "",
	};
}

function extractPost(slug) {
	const filePath = path.join(root, "local-site", slug, "index.html");
	const html = fs.readFileSync(filePath, "utf8");
	const $ = load(html, { decodeEntities: false });
	const contentContainer = $(".astro-element-7d35f86 .astro-widget-container").first();
	if (!contentContainer.length) throw new Error(`Missing post content for ${slug}`);
	const title = cleanText($("h1").first().text());
	const dateText = cleanText($("time").first().text());
	const category = cleanText($(".astro-post-info__item--type-terms, .astro-post-info__terms-list, a[rel='tag'], a[href*='category']").first().text()) || "Hearing";
	const image = findFeaturedImage($);
	if (!image) throw new Error(`Missing featured image for ${slug}`);
	return {
		id: slug,
		slug,
		title,
		published_at: parseDate(dateText),
		category,
		image,
		content: contentToPortableText($, contentContainer),
	};
}

const posts = postSlugs.map(extractPost);

const postsCollection = seed.collections.find((collection) => collection.slug === "posts");
if (!postsCollection) throw new Error("Missing posts collection in seed.");
postsCollection.fields = postsCollection.fields.filter((field) => field.slug !== "excerpt");
if (!postsCollection.fields.some((field) => field.slug === "author")) {
	const featuredIndex = postsCollection.fields.findIndex((field) => field.slug === "featured_image");
	postsCollection.fields.splice(featuredIndex >= 0 ? featuredIndex + 1 : postsCollection.fields.length, 0, {
		slug: "author",
		label: "Author",
		type: "string",
	});
} else {
	const authorField = postsCollection.fields.find((field) => field.slug === "author");
	authorField.type = "string";
	delete authorField.options;
}

const categoryTaxonomy = seed.taxonomies?.find((taxonomy) => taxonomy.name === "category");
if (categoryTaxonomy) {
	for (const label of [...new Set(posts.map((post) => post.category))]) {
		const slug = slugify(label);
		if (!categoryTaxonomy.terms.some((term) => term.slug === slug)) {
			categoryTaxonomy.terms.push({ slug, label });
		}
	}
}

seed.content.posts = posts.map((post) => ({
	id: post.id,
	slug: post.slug,
	status: "published",
	data: {
		title: post.title,
		featured_image: { src: post.image.src, alt: post.image.alt },
		author: defaultAuthorName,
		content: post.content,
	},
	taxonomies: {
		category: [slugify(post.category)],
	},
}));

fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");

const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const d1Path = fs
	.readdirSync(d1Dir)
	.filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite")
	.map((file) => path.join(d1Dir, file))[0];
if (!d1Path) throw new Error("Could not find local D1 database.");

function mediaByFilename(db, filename) {
	return db.prepare("SELECT * FROM media WHERE filename = ? AND status = 'ready' ORDER BY created_at DESC LIMIT 1").get(filename);
}

function uploadPostMedia() {
	const db = new Database(d1Path);
	for (const post of posts) {
		const filePath = path.join(mediaRoot, post.image.filename);
		if (!fs.existsSync(filePath)) throw new Error(`Missing media file: ${filePath}`);
		let media = mediaByFilename(db, post.image.filename);
		if (!media) {
			console.log(`Uploading ${post.image.filename}`);
			execFileSync(process.execPath, [path.join(root, "node_modules", "emdash", "dist", "cli", "index.mjs"), "media", "upload", filePath, "--url", "http://localhost:4321", "--json"], {
				cwd: root,
				stdio: "pipe",
			});
			media = mediaByFilename(db, post.image.filename);
		}
		if (!media) throw new Error(`Upload did not create media row for ${post.image.filename}`);
		if (post.image.alt && media.alt !== post.image.alt) {
			db.prepare("UPDATE media SET alt = ? WHERE id = ?").run(post.image.alt, media.id);
		}
	}
	db.close();
}

function mediaValue(row, alt) {
	return {
		provider: "local",
		id: row.id,
		src: `/_emdash/api/media/file/${row.storage_key}`,
		alt: alt || row.alt || undefined,
		width: row.width || undefined,
		height: row.height || undefined,
		mimeType: row.mime_type,
		filename: row.filename,
		meta: { storageKey: row.storage_key },
	};
}

function ensureCategory(db, label) {
	const slug = slugify(label);
	let row = db.prepare("SELECT * FROM taxonomies WHERE name = 'category' AND slug = ?").get(slug);
	if (!row) {
		const id = randomId();
		db.prepare(`
			INSERT INTO taxonomies (id, name, slug, label, parent_id, data, locale, translation_group)
			VALUES (?, 'category', ?, ?, NULL, NULL, 'en', ?)
		`).run(id, slug, label, id);
		row = db.prepare("SELECT * FROM taxonomies WHERE id = ?").get(id);
	}
	return row;
}

function configureDatabase(dbPath, mediaRowsByFilename) {
	const db = new Database(dbPath);
	const tx = db.transaction(() => {
		if (dbPath.endsWith("data.db")) {
			const existing = new Set(db.prepare("SELECT id FROM media").all().map((row) => row.id));
			const insertMedia = db.prepare(`INSERT INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color) VALUES (@id, @filename, @mime_type, @size, @width, @height, @alt, @caption, @storage_key, @content_hash, @created_at, @author_id, @status, @blurhash, @dominant_color)`);
			for (const row of mediaRowsByFilename.values()) {
				if (!existing.has(row.id)) insertMedia.run(row);
			}
		}

		const postCollection = db.prepare("SELECT id FROM _emdash_collections WHERE slug = 'posts'").get();
		if (postCollection) {
			db.prepare("DELETE FROM _emdash_fields WHERE collection_id = ? AND slug = 'excerpt'").run(postCollection.id);
			if (!db.prepare("SELECT id FROM _emdash_fields WHERE collection_id = ? AND slug = 'author'").get(postCollection.id)) {
				db.prepare(`
					INSERT INTO _emdash_fields
						(id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
					VALUES
						(?, ?, 'author', 'Author', 'reference', 'TEXT', 0, 0, NULL, NULL, NULL, ?, 2, datetime('now'), 0, 1)
				`).run(randomId(), postCollection.id, null);
			} else {
				db.prepare("UPDATE _emdash_fields SET label = 'Author', type = 'string', column_type = 'TEXT', options = NULL, validation = NULL, widget = NULL WHERE collection_id = ? AND slug = 'author'").run(postCollection.id);
			}
		}
		if (!db.prepare("PRAGMA table_info(ec_posts)").all().some((column) => column.name === "author")) {
			db.exec("ALTER TABLE ec_posts ADD COLUMN author TEXT");
		}
		db.prepare("DELETE FROM content_taxonomies WHERE collection = 'posts'").run();
		db.prepare("DELETE FROM ec_posts").run();
		db.prepare("DELETE FROM revisions WHERE collection = 'posts'").run();

		const insertPost = db.prepare(`
			INSERT INTO ec_posts
				(id, slug, status, created_at, updated_at, published_at, version, live_revision_id, locale, title, featured_image, author, content)
			VALUES
				(@id, @slug, 'published', @published_at, @published_at, @published_at, 1, @revision_id, 'en', @title, @featured_image, @author, @content)
		`);
		const insertRevision = db.prepare(`
			INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
			VALUES (@revision_id, 'posts', @id, @data, NULL, @published_at)
		`);
		const insertTerm = db.prepare(`
			INSERT OR REPLACE INTO content_taxonomies (collection, entry_id, taxonomy_id)
			VALUES ('posts', @id, @taxonomy_id)
		`);

		for (const post of posts) {
			const id = randomId();
			const revisionId = randomId();
			const media = mediaRowsByFilename.get(post.image.filename);
			if (!media) throw new Error(`Missing uploaded media row for ${post.image.filename}`);
			const image = mediaValue(media, post.image.alt);
			const term = ensureCategory(db, post.category);
			const data = {
				title: post.title,
				featured_image: image,
				author: defaultAuthorName,
				content: post.content,
			};
			insertRevision.run({
				id,
				revision_id: revisionId,
				data: JSON.stringify(data),
				published_at: post.published_at,
			});
			insertPost.run({
				id,
				slug: post.slug,
				published_at: post.published_at,
				revision_id: revisionId,
				title: post.title,
				featured_image: JSON.stringify(image),
				author: defaultAuthorName,
				content: JSON.stringify(post.content),
			});
			insertTerm.run({ id, taxonomy_id: term.translation_group || term.id });
		}
	});
	tx();
	db.close();
}

uploadPostMedia();
const d1 = new Database(d1Path, { readonly: true });
const mediaRowsByFilename = new Map(posts.map((post) => [post.image.filename, mediaByFilename(d1, post.image.filename)]));
d1.close();

configureDatabase(path.join(root, "data.db"), mediaRowsByFilename);
configureDatabase(d1Path, mediaRowsByFilename);

console.log(`Imported ${posts.length} published blog posts, linked featured media, assigned staff authors, and removed the editable excerpt field.`);
