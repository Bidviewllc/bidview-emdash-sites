const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const root = process.cwd();
const seedPath = path.join(root, "seed", "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const authorSlug = "kylie-kasel";

function randomId() {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase();
}

function ensureSeedAuthorField() {
	const posts = seed.collections.find((collection) => collection.slug === "posts");
	if (!posts) throw new Error("Missing posts collection in seed.");
	if (!posts.fields.some((field) => field.slug === "author")) {
		const featuredIndex = posts.fields.findIndex((field) => field.slug === "featured_image");
		posts.fields.splice(featuredIndex >= 0 ? featuredIndex + 1 : posts.fields.length, 0, {
			slug: "author",
			label: "Author",
			type: "reference",
			options: { collection: "staff" },
		});
	}
	for (const post of seed.content.posts || []) {
		post.data.author = post.data.author || authorSlug;
	}
	fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
}

function ensureColumn(db, table, column, type) {
	const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column);
	if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

function configureDatabase(dbPath) {
	if (!fs.existsSync(dbPath)) return false;
	const db = new Database(dbPath);
	const transaction = db.transaction(() => {
		const postsCollection = db.prepare("SELECT id FROM _emdash_collections WHERE slug = 'posts'").get();
		if (!postsCollection) return;
		const staffAuthor = db.prepare("SELECT id, slug, name FROM ec_staff WHERE slug = ?").get(authorSlug);
		if (!staffAuthor) throw new Error(`Missing staff author ${authorSlug} in ${dbPath}`);

		ensureColumn(db, "ec_posts", "author", "TEXT");
		const existingField = db.prepare("SELECT id FROM _emdash_fields WHERE collection_id = ? AND slug = 'author'").get(postsCollection.id);
		if (!existingField) {
			db.prepare(`
				INSERT INTO _emdash_fields
					(id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
				VALUES
					(?, ?, 'author', 'Author', 'reference', 'TEXT', 0, 0, NULL, NULL, NULL, ?, 2, datetime('now'), 0, 1)
			`).run(randomId(), postsCollection.id, JSON.stringify({ collection: "staff" }));
		} else {
			db.prepare("UPDATE _emdash_fields SET type = 'reference', column_type = 'TEXT', label = 'Author', options = ? WHERE id = ?")
				.run(JSON.stringify({ collection: "staff" }), existingField.id);
		}

		db.prepare("UPDATE ec_posts SET author = COALESCE(NULLIF(author, ''), ?)").run(staffAuthor.id);
		const rows = db.prepare("SELECT id, title, featured_image, content, author, live_revision_id FROM ec_posts").all();
		const updateRevision = db.prepare("UPDATE revisions SET data = ? WHERE id = ?");
		for (const row of rows) {
			if (!row.live_revision_id) continue;
			let data = {};
			try {
				data = JSON.parse(db.prepare("SELECT data FROM revisions WHERE id = ?").get(row.live_revision_id)?.data || "{}");
			} catch {}
			data.title = row.title;
			try { data.featured_image = JSON.parse(row.featured_image || "null"); } catch { data.featured_image = row.featured_image; }
			try { data.content = JSON.parse(row.content || "[]"); } catch { data.content = row.content; }
			data.author = row.author || staffAuthor.id;
			updateRevision.run(JSON.stringify(data), row.live_revision_id);
		}
	});
	transaction();
	db.close();
	return true;
}

ensureSeedAuthorField();
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
console.log(`Added Post author reference field and set existing posts to ${authorSlug}.`);
console.log(`Updated ${configured.length} sqlite database(s).`);
