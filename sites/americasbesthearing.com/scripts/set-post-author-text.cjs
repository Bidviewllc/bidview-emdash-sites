const fs = require("fs");
const path = require("path");
require("./require-content-overwrite.cjs");
const Database = require("better-sqlite3");

const root = process.cwd();
const seedPath = path.join(root, "seed", "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const authorName = "Kylie Kasel, Au.D.";

const postsCollection = seed.collections.find((collection) => collection.slug === "posts");
if (!postsCollection) throw new Error("Missing posts collection in seed.");
const field = postsCollection.fields.find((item) => item.slug === "author");
if (field) {
	field.label = "Author";
	field.type = "string";
	delete field.options;
} else {
	const featuredIndex = postsCollection.fields.findIndex((item) => item.slug === "featured_image");
	postsCollection.fields.splice(featuredIndex >= 0 ? featuredIndex + 1 : postsCollection.fields.length, 0, {
		slug: "author",
		label: "Author",
		type: "string",
	});
}
for (const post of seed.content.posts || []) post.data.author = authorName;
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");

function configureDatabase(dbPath) {
	if (!fs.existsSync(dbPath)) return false;
	const db = new Database(dbPath);
	const tx = db.transaction(() => {
		const posts = db.prepare("SELECT id FROM _emdash_collections WHERE slug = 'posts'").get();
		if (!posts) return;
		if (!db.prepare("PRAGMA table_info(ec_posts)").all().some((column) => column.name === "author")) {
			db.exec("ALTER TABLE ec_posts ADD COLUMN author TEXT");
		}
		const field = db.prepare("SELECT id FROM _emdash_fields WHERE collection_id = ? AND slug = 'author'").get(posts.id);
		if (field) {
			db.prepare("UPDATE _emdash_fields SET label = 'Author', type = 'string', column_type = 'TEXT', options = NULL, validation = NULL, widget = NULL WHERE id = ?").run(field.id);
		} else {
			db.prepare(`
				INSERT INTO _emdash_fields
					(id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
				VALUES
					(substr(hex(randomblob(16)), 1, 26), ?, 'author', 'Author', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 2, datetime('now'), 0, 1)
			`).run(posts.id);
		}
		db.prepare("UPDATE ec_posts SET author = ?").run(authorName);
		const rows = db.prepare("SELECT live_revision_id, title, featured_image, content, author FROM ec_posts").all();
		const getRevision = db.prepare("SELECT data FROM revisions WHERE id = ?");
		const updateRevision = db.prepare("UPDATE revisions SET data = ? WHERE id = ?");
		for (const row of rows) {
			if (!row.live_revision_id) continue;
			let data = {};
			try { data = JSON.parse(getRevision.get(row.live_revision_id)?.data || "{}"); } catch {}
			data.title = row.title;
			try { data.featured_image = JSON.parse(row.featured_image || "null"); } catch { data.featured_image = row.featured_image; }
			try { data.content = JSON.parse(row.content || "[]"); } catch { data.content = row.content; }
			data.author = authorName;
			updateRevision.run(JSON.stringify(data), row.live_revision_id);
		}
	});
	tx();
	db.close();
	return true;
}

const configured = [];
if (configureDatabase(path.join(root, "data.db"))) configured.push("data.db");
const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
if (fs.existsSync(d1Dir)) {
	for (const file of fs.readdirSync(d1Dir)) {
		if (file.endsWith(".sqlite") && file !== "metadata.sqlite") {
			if (configureDatabase(path.join(d1Dir, file))) configured.push(file);
		}
	}
}
console.log(`Converted Post author to plain text and set all posts to ${authorName}.`);
console.log(`Updated ${configured.length} sqlite database(s).`);
