require("./require-content-overwrite.cjs");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const root = process.cwd();
const seedPath = path.join(root, "seed", "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));

const oldCollectionSlug = "service_items";
const splitCollections = [
	{
		slug: "audiology_services",
		label: "Audiology Services",
		labelSingular: "Audiology Service",
		group: "audiology",
	},
	{
		slug: "hearing_aid_services",
		label: "Hearing Aid Services",
		labelSingular: "Hearing Aid Service",
		group: "hearing_aids",
	},
];

const serviceCollection =
	seed.collections.find((collection) => collection.slug === oldCollectionSlug) ||
	seed.collections.find((collection) => collection.slug === "audiology_services") ||
	seed.collections.find((collection) => collection.slug === "hearing_aid_services");
if (!serviceCollection) {
	throw new Error("Could not find service collection fields in seed/seed.json.");
}

const baseFields = serviceCollection.fields.filter((field) => field.slug !== "group");
const sourceItems = seed.content[oldCollectionSlug] || [
	...(seed.content.audiology_services || []).map((item) => ({
		...item,
		data: { ...item.data, group: "audiology" },
	})),
	...(seed.content.hearing_aid_services || []).map((item) => ({
		...item,
		data: { ...item.data, group: "hearing_aids" },
	})),
];

seed.collections = seed.collections.filter((collection) => collection.slug !== oldCollectionSlug);
for (const collection of splitCollections) {
	if (!seed.collections.some((item) => item.slug === collection.slug)) {
		seed.collections.push({
			slug: collection.slug,
			label: collection.label,
			labelSingular: collection.labelSingular,
			supports: serviceCollection.supports || ["drafts", "revisions", "search"],
			fields: baseFields,
		});
	}
}

for (const collection of splitCollections) {
	seed.content[collection.slug] = sourceItems
		.filter((item) => item.data?.group === collection.group)
		.map((item) => ({
			...item,
			data: Object.fromEntries(Object.entries(item.data).filter(([key]) => key !== "group")),
		}));
}
delete seed.content[oldCollectionSlug];

fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");

function randomId() {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase();
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

function configureDatabase(dbPath) {
	if (!fs.existsSync(dbPath)) return false;
	const db = new Database(dbPath);

	const createContentTable = (slug) => {
		db.exec(`DROP TABLE IF EXISTS "ec_${slug}"`);
		db.exec(`
			CREATE TABLE "ec_${slug}" (
				"id" text primary key,
				"slug" text,
				"status" text default 'draft',
				"author_id" text,
				"primary_byline_id" text,
				"created_at" text default (datetime('now')),
				"updated_at" text default (datetime('now')),
				"published_at" text,
				"scheduled_at" text,
				"deleted_at" text,
				"version" integer default 1,
				"live_revision_id" text references "revisions" ("id"),
				"draft_revision_id" text references "revisions" ("id"),
				"locale" text default 'en' not null,
				"translation_group" text,
				"title" TEXT NOT NULL DEFAULT '',
				"body" TEXT,
				"sort_order" INTEGER,
				constraint "ec_${slug}_slug_locale_unique" unique ("slug", "locale")
			)
		`);
	};

	const insertCollection = db.prepare(`
		INSERT INTO _emdash_collections
			(id, slug, label, label_singular, description, icon, supports, source, created_at, updated_at, search_config, has_seo, url_pattern, comments_enabled, comments_moderation, comments_closed_after_days, comments_auto_approve_users)
		VALUES
			(@id, @slug, @label, @label_singular, NULL, NULL, @supports, 'seed', datetime('now'), datetime('now'), @search_config, 0, NULL, 0, 'first_time', 90, 1)
	`);

	const insertField = db.prepare(`
		INSERT INTO _emdash_fields
			(id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
		VALUES
			(@id, @collection_id, @slug, @label, @type, @column_type, @required, 0, NULL, @validation, NULL, NULL, @sort_order, datetime('now'), @searchable, 1)
	`);

	const insertRevision = db.prepare(`
		INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
		VALUES (@id, @collection, @entry_id, @data, NULL, datetime('now'))
	`);

	const transaction = db.transaction(() => {
		db.prepare("DELETE FROM _emdash_fields WHERE collection_id IN (SELECT id FROM _emdash_collections WHERE slug = ?)").run(oldCollectionSlug);
		db.prepare("DELETE FROM _emdash_collections WHERE slug = ?").run(oldCollectionSlug);
		db.exec(`DROP TABLE IF EXISTS "ec_${oldCollectionSlug}"`);
		db.prepare("DELETE FROM revisions WHERE collection = ?").run(oldCollectionSlug);

		for (const collection of splitCollections) {
			const collectionId = randomId();
			db.prepare("DELETE FROM _emdash_fields WHERE collection_id IN (SELECT id FROM _emdash_collections WHERE slug = ?)").run(collection.slug);
			db.prepare("DELETE FROM _emdash_collections WHERE slug = ?").run(collection.slug);
			db.prepare("DELETE FROM revisions WHERE collection = ?").run(collection.slug);
			createContentTable(collection.slug);

			insertCollection.run({
				id: collectionId,
				slug: collection.slug,
				label: collection.label,
				label_singular: collection.labelSingular,
				supports: JSON.stringify(serviceCollection.supports || ["drafts", "revisions", "search"]),
				search_config: JSON.stringify({ enabled: true }),
			});

			for (const [index, field] of baseFields.entries()) {
				insertField.run({
					id: randomId(),
					collection_id: collectionId,
					slug: field.slug,
					label: field.label,
					type: field.type,
					column_type: columnType(field),
					required: field.required ? 1 : 0,
					validation: field.validation ? JSON.stringify(field.validation) : null,
					sort_order: index,
					searchable: field.searchable ? 1 : 0,
				});
			}

			const insertIntoCollection = db.prepare(`
				INSERT INTO "ec_${collection.slug}"
					(id, slug, status, created_at, updated_at, published_at, version, live_revision_id, locale, title, body, sort_order)
				VALUES
					(@id, @slug, @status, datetime('now'), datetime('now'), datetime('now'), 1, @live_revision_id, 'en', @title, @body, @sort_order)
			`);
			for (const item of seed.content[collection.slug] || []) {
				const entryId = randomId();
				const revisionId = randomId();
				const data = {
					title: item.data.title,
					body: item.data.body,
					sort_order: item.data.sort_order,
				};
				insertRevision.run({
					id: revisionId,
					collection: collection.slug,
					entry_id: entryId,
					data: JSON.stringify(data),
				});
				insertIntoCollection.run({
					id: entryId,
					slug: item.slug || item.id,
					status: item.status || "published",
					live_revision_id: revisionId,
					title: item.data.title,
					body: normalizeFieldValue(item.data.body),
					sort_order: item.data.sort_order,
				});
			}
		}
	});

	transaction();
	db.close();
	return true;
}

const configured = [];
for (const dbPath of [path.join(root, "data.db")]) {
	if (configureDatabase(dbPath)) configured.push(dbPath);
}

const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
if (fs.existsSync(d1Dir)) {
	for (const file of fs.readdirSync(d1Dir)) {
		if (file.endsWith(".sqlite") && file !== "metadata.sqlite") {
			const dbPath = path.join(d1Dir, file);
			if (configureDatabase(dbPath)) configured.push(dbPath);
		}
	}
}

console.log("Split service_items into audiology_services and hearing_aid_services.");
console.log(`Updated seed/seed.json and ${configured.length} sqlite database(s).`);
