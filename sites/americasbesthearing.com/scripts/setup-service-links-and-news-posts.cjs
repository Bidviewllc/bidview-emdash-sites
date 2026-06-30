const fs = require("fs");
const path = require("path");
require("./require-content-overwrite.cjs");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const root = process.cwd();
const seedPath = path.join(root, "seed", "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));

const serviceLinks = {
	audiology_services: {
		"hearing-evaluations": "/audiology-services/hearing-tests/",
		"ear-wax-removal": "/audiology-services/ear-wax-removal/",
		"hearing-aid-services": "/audiology-services/hearing-aid-services/",
		"hearing-aid-fittings": "/audiology-services/hearing-aid-fittings/",
		"hearing-aid-cleaning-and-repair": "/audiology-services/hearing-aid-services/",
	},
	hearing_aid_services: {
		"hearing-protection": "/custom-hearing-protection/",
		"hearing-protection-for-musicians": "/custom-hearing-protection/",
		"hearing-protection-for-hunters": "/custom-hearing-protection/",
		"hearing-aids": "/hearing-aids-products/",
		"hearing-aid-batteries-and-accessories": "/hearing-aids-products/hearing-aid-batteries/",
		"assistive-listening-devices": "/hearing-aids-products/hearing-aid-alternatives/",
	},
};

function randomId() {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase();
}

function ensureField(collectionSlug, field) {
	const collection = seed.collections.find((item) => item.slug === collectionSlug);
	if (!collection) throw new Error(`Missing collection ${collectionSlug}`);
	if (!collection.fields.some((item) => item.slug === field.slug)) {
		const sortIndex = collection.fields.findIndex((item) => item.slug === "sort_order");
		collection.fields.splice(sortIndex >= 0 ? sortIndex : collection.fields.length, 0, field);
	}
}

for (const collectionSlug of Object.keys(serviceLinks)) {
	ensureField(collectionSlug, { slug: "link_url", label: "Learn More Button URL", type: "url" });
	for (const item of seed.content[collectionSlug] || []) {
		item.data.link_url = serviceLinks[collectionSlug][item.slug] || item.data.link_url || "";
	}
}

fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");

function ensureColumn(db, table, column, type) {
	const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column);
	if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

function ensureServiceLinkField(db, collectionSlug) {
	const collection = db.prepare("SELECT id FROM _emdash_collections WHERE slug = ?").get(collectionSlug);
	if (!collection) return;
	ensureColumn(db, `ec_${collectionSlug}`, "link_url", "TEXT");
	const exists = db.prepare("SELECT id FROM _emdash_fields WHERE collection_id = ? AND slug = 'link_url'").get(collection.id);
	if (!exists) {
		db.prepare(`
			INSERT INTO _emdash_fields
				(id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
			VALUES
				(?, ?, 'link_url', 'Learn More Button URL', 'url', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 2, datetime('now'), 0, 1)
		`).run(randomId(), collection.id);
	}
	const update = db.prepare(`UPDATE ec_${collectionSlug} SET link_url = ? WHERE slug = ?`);
	for (const [slug, url] of Object.entries(serviceLinks[collectionSlug])) update.run(url, slug);
	const rows = db.prepare(`SELECT id, slug, title, body, sort_order, link_url, live_revision_id FROM ec_${collectionSlug}`).all();
	const updateRevision = db.prepare("UPDATE revisions SET data = ? WHERE id = ?");
	for (const row of rows) {
		if (!row.live_revision_id) continue;
		updateRevision.run(
			JSON.stringify({
				title: row.title,
				body: row.body,
				link_url: row.link_url,
				sort_order: row.sort_order,
			}),
			row.live_revision_id,
		);
	}
}

function configureDatabase(dbPath) {
	if (!fs.existsSync(dbPath)) return false;
	const db = new Database(dbPath);
	const transaction = db.transaction(() => {
		for (const collectionSlug of Object.keys(serviceLinks)) ensureServiceLinkField(db, collectionSlug);
	});
	transaction();
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

console.log("Added service link URLs to audiology and hearing aid service collections.");
console.log(`Updated ${configured.length} sqlite database(s).`);
