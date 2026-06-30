const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const root = process.cwd();
const seedPath = path.join(root, "seed", "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));

const collection = {
	slug: "location_pages",
	label: "Location Pages",
	labelSingular: "Location Page",
	supports: ["drafts", "revisions", "search", "seo"],
	fields: [
		{ slug: "title", label: "Admin Title", type: "string", required: true, searchable: true },
		{ slug: "location_slug", label: "Connected Location Slug", type: "string", required: true },
		{ slug: "page_title", label: "Page Title", type: "string" },
		{ slug: "meta_description", label: "Meta Description", type: "text" },
		{ slug: "hero_eyebrow", label: "Hero Eyebrow", type: "string" },
		{ slug: "hero_heading", label: "Hero Heading", type: "string" },
		{ slug: "h1_eyebrow", label: "H1 First Part", type: "string" },
		{ slug: "h1_heading", label: "H1 Continuation", type: "string" },
		{ slug: "intro_body", label: "Intro Body", type: "portableText", searchable: true },
		{ slug: "featured_image", label: "Featured Location Image", type: "image" },
		{ slug: "gallery_image_1", label: "Gallery Image 1", type: "image" },
		{ slug: "gallery_image_2", label: "Gallery Image 2", type: "image" },
		{ slug: "audiology_services_heading", label: "Audiology Services Heading", type: "string" },
		{ slug: "audiology_services_heading_continuation", label: "Audiology Services H2 Continuation", type: "string" },
		{ slug: "hearing_aid_services_heading", label: "Hearing Aid Services Heading", type: "string" },
		{ slug: "hearing_aid_services_heading_continuation", label: "Hearing Aid Services H2 Continuation", type: "string" },
		{ slug: "sort_order", label: "Sort Order", type: "integer" },
	],
};

function randomId() {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase();
}

function cityFromSlug(slug) {
	return slug
		.split("-")
		.map((part) => (part.length <= 2 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
		.join(" ")
		.replace(/\bMi\b/g, "MI")
		.replace(/\bMn\b/g, "MN")
		.replace(/\bFl\b/g, "FL");
}

function titleCaseCity(name) {
	return String(name || "").replace(/\b(Mi|Mn|Fl)\b/g, (match) => match.toUpperCase());
}

function columnType(field) {
	if (field.type === "integer" || field.type === "number") return "INTEGER";
	if (field.type === "boolean") return "INTEGER";
	return "TEXT";
}

function normalizeFieldValue(value) {
	if (value == null) return null;
	if (typeof value === "string") return value;
	return JSON.stringify(value);
}

function ensureSeed() {
	const existingIndex = seed.collections.findIndex((item) => item.slug === collection.slug);
	if (existingIndex >= 0) seed.collections[existingIndex] = collection;
	else {
		const locationsIndex = seed.collections.findIndex((item) => item.slug === "locations");
		seed.collections.splice(locationsIndex >= 0 ? locationsIndex + 1 : seed.collections.length, 0, collection);
	}

	const locations = seed.content?.locations || [];
	const existingPages = new Map((seed.content?.location_pages || []).map((item) => [item.slug || item.id, item]));
	seed.content = seed.content || {};
	seed.content.location_pages = locations.map((location, index) => {
		const data = location.data || {};
		const slug = location.slug || location.id;
		const city = titleCaseCity(data.name || cityFromSlug(slug));
		const existing = existingPages.get(slug) || {};
		const existingData = existing.data || {};
		return {
			id: slug,
			slug,
			status: existing.status || "published",
			data: {
				title: existingData.title || `${city} Location Page`,
				location_slug: existingData.location_slug || slug,
				page_title: existingData.page_title || `America's Best Hearing | Hearing Aids In ${city}`,
				meta_description: existingData.meta_description || `America's Best Hearing provides expert hearing care and hearing aids in ${city}.`,
				hero_eyebrow: existingData.hero_eyebrow || "",
				hero_heading: existingData.hero_heading || `Expert Hearing Care in ${city}`,
				h1_eyebrow: existingData.h1_eyebrow || "Hearing Instrument Specialist & Hearing Aids in",
				h1_heading: existingData.h1_heading || city,
				intro_body: existingData.intro_body || null,
				featured_image: existingData.featured_image || null,
				gallery_image_1: existingData.gallery_image_1 || null,
				gallery_image_2: existingData.gallery_image_2 || null,
				audiology_services_heading: existingData.audiology_services_heading || "Audiology Services Offered at America's Best Hearing",
				audiology_services_heading_continuation: existingData.audiology_services_heading_continuation || "in Michigan, Minnesota, and Florida",
				hearing_aid_services_heading: existingData.hearing_aid_services_heading || "Our Hearing Aids & Protection Solutions Offered at America's Best Hearing",
				hearing_aid_services_heading_continuation: existingData.hearing_aid_services_heading_continuation || "in Michigan, Minnesota, and Florida",
				sort_order: existingData.sort_order || data.sort_order || index + 1,
			},
		};
	});

	fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
}

function dbPaths() {
	const paths = [path.join(root, "data.db")];
	const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
	if (fs.existsSync(d1Dir)) {
		for (const file of fs.readdirSync(d1Dir)) {
			if (file.endsWith(".sqlite") && file !== "metadata.sqlite") paths.push(path.join(d1Dir, file));
		}
	}
	return paths.filter((file) => fs.existsSync(file));
}

function tableExists(db, table) {
	return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
}

function columnExists(db, table, column) {
	return db.prepare(`PRAGMA table_info("${table}")`).all().some((item) => item.name === column);
}

function ensureColumn(db, table, field) {
	if (columnExists(db, table, field.slug)) return;
	db.exec(`ALTER TABLE "${table}" ADD COLUMN "${field.slug}" ${columnType(field)}`);
}

function configureDatabase(dbPath) {
	const db = new Database(dbPath);
	const table = `ec_${collection.slug}`;
	const existingCollection = db.prepare("SELECT id FROM _emdash_collections WHERE slug=?").get(collection.slug);
	const collectionId = existingCollection?.id || randomId();

	const transaction = db.transaction(() => {
		if (!existingCollection) {
			db.prepare(`
				INSERT INTO _emdash_collections
					(id, slug, label, label_singular, description, icon, supports, source, created_at, updated_at, search_config, has_seo, url_pattern, comments_enabled, comments_moderation, comments_closed_after_days, comments_auto_approve_users)
				VALUES
					(@id, @slug, @label, @label_singular, NULL, NULL, @supports, 'seed', datetime('now'), datetime('now'), @search_config, 1, NULL, 0, 'first_time', 90, 1)
			`).run({
				id: collectionId,
				slug: collection.slug,
				label: collection.label,
				label_singular: collection.labelSingular,
				supports: JSON.stringify(collection.supports),
				search_config: JSON.stringify({ enabled: true }),
			});
		}

		if (!tableExists(db, table)) {
			db.exec(`
				CREATE TABLE "${table}" (
					"id" TEXT PRIMARY KEY,
					"slug" TEXT,
					"status" TEXT DEFAULT 'draft',
					"author_id" TEXT,
					"primary_byline_id" TEXT,
					"created_at" TEXT DEFAULT (datetime('now')),
					"updated_at" TEXT DEFAULT (datetime('now')),
					"published_at" TEXT,
					"scheduled_at" TEXT,
					"deleted_at" TEXT,
					"version" INTEGER DEFAULT 1,
					"live_revision_id" TEXT,
					"draft_revision_id" TEXT,
					"locale" TEXT DEFAULT 'en' NOT NULL,
					"translation_group" TEXT,
					"title" TEXT NOT NULL DEFAULT '',
					CONSTRAINT "${table}_slug_locale_unique" UNIQUE ("slug", "locale")
				)
			`);
		}

		for (const field of collection.fields) ensureColumn(db, table, field);

		for (const [index, field] of collection.fields.entries()) {
			const existingField = db.prepare("SELECT id FROM _emdash_fields WHERE collection_id=? AND slug=?").get(collectionId, field.slug);
			if (existingField) {
				db.prepare("UPDATE _emdash_fields SET label=?, type=?, column_type=?, required=?, searchable=?, sort_order=? WHERE id=?").run(
					field.label,
					field.type,
					columnType(field),
					field.required ? 1 : 0,
					field.searchable ? 1 : 0,
					index,
					existingField.id,
				);
			} else {
				db.prepare(`
					INSERT INTO _emdash_fields
						(id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
					VALUES
						(@id, @collection_id, @slug, @label, @type, @column_type, @required, 0, NULL, NULL, NULL, NULL, @sort_order, datetime('now'), @searchable, 1)
				`).run({
					id: randomId(),
					collection_id: collectionId,
					slug: field.slug,
					label: field.label,
					type: field.type,
					column_type: columnType(field),
					required: field.required ? 1 : 0,
					sort_order: index,
					searchable: field.searchable ? 1 : 0,
				});
			}
		}

		const columns = ["id", "slug", "status", "created_at", "updated_at", "published_at", "version", "locale", ...collection.fields.map((field) => field.slug)];
		const placeholders = columns.map((column) => `@${column}`).join(", ");
		const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
		const insert = db.prepare(`INSERT OR IGNORE INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`);

		for (const item of seed.content.location_pages || []) {
			const data = item.data || {};
			const row = {
				id: item.id || item.slug || randomId(),
				slug: item.slug || item.id,
				status: item.status || "published",
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				published_at: new Date().toISOString(),
				version: 1,
				locale: "en",
			};
			for (const field of collection.fields) row[field.slug] = normalizeFieldValue(data[field.slug]);
			insert.run(row);
		}
	});

	transaction();
	db.close();
	return dbPath;
}

ensureSeed();
const updated = dbPaths().map(configureDatabase);
console.log(`Location Pages collection ready in ${updated.length} database(s).`);
for (const file of updated) console.log(`- ${path.relative(root, file)}`);
