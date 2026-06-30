const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");
const Database = require("better-sqlite3");

const root = process.cwd();
const seedPath = path.join(root, "seed", "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));

const sharedHeadingFields = [
	{ slug: "audiology_services_heading", label: "Audiology Services Heading", type: "string" },
	{ slug: "audiology_services_heading_continuation", label: "Audiology Services H2 Continuation", type: "string" },
	{ slug: "hearing_aid_services_heading", label: "Hearing Aid Services Heading", type: "string" },
	{ slug: "hearing_aid_services_heading_continuation", label: "Hearing Aid Services H2 Continuation", type: "string" },
];

const staffPagesCollection = {
	slug: "staff_pages",
	label: "Staff Pages",
	labelSingular: "Staff Page",
	supports: ["drafts", "revisions", "search", "seo"],
	fields: [
		{ slug: "title", label: "Admin Title", type: "string", required: true, searchable: true },
		{ slug: "staff_slug", label: "Connected Staff Slug", type: "string", required: true },
		{ slug: "page_title", label: "Page Title", type: "string" },
		{ slug: "meta_description", label: "Meta Description", type: "text" },
		{ slug: "intro_body", label: "Intro Body", type: "portableText", searchable: true },
		...sharedHeadingFields,
		{ slug: "sort_order", label: "Sort Order", type: "integer" },
	],
};

function randomId() {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase();
}

function columnType(field) {
	if (field.type === "integer" || field.type === "number") return "INTEGER";
	if (field.type === "boolean") return "INTEGER";
	if (field.type === "multiSelect") return "JSON";
	return "TEXT";
}

function normalizeFieldValue(value) {
	if (value == null) return null;
	if (typeof value === "string") return value;
	return JSON.stringify(value);
}

function plainTextToPortableText(text) {
	const value = String(text || "").trim();
	if (!value) return null;
	return [
		{
			_type: "block",
			style: "normal",
			_key: randomId(),
			children: [{ _type: "span", text: value, _key: randomId() }],
		},
	];
}

function htmlToPortableText(html) {
	const $ = cheerio.load(`<root>${html || ""}</root>`, { decodeEntities: false });
	const blocks = [];
	$("root").children().each((index, element) => {
		const tag = element.tagName?.toLowerCase();
		if (tag === "p" || /^h[2-4]$/.test(tag || "")) {
			const text = $(element).text().replace(/\s+/g, " ").trim();
			if (!text) return;
			blocks.push({
				_type: "block",
				style: tag === "h2" || tag === "h3" ? tag : "normal",
				_key: randomId(),
				children: [{ _type: "span", text, _key: randomId() }],
			});
		}
	});
	return blocks.length ? blocks : null;
}

function routeFromProfileUrl(value) {
	return String(value || "").replace(/^https?:\/\/(?:www\.)?americasbesthearing\.com/i, "").replace(/^\/+|\/+$/g, "");
}

function rawPathForStaff(staffData) {
	const route = routeFromProfileUrl(staffData.profile_url);
	if (!route) return null;
	const parts = route.split("/");
	if (parts.length < 2) return null;
	const file = `${parts[0]}__${parts[1]}.html`;
	const raw = path.join(root, "src", "components", "raw-pages", file);
	return fs.existsSync(raw) ? raw : null;
}

function introFromRaw(staffData) {
	const raw = rawPathForStaff(staffData);
	if (!raw) return null;
	const $ = cheerio.load(fs.readFileSync(raw, "utf8"), { decodeEntities: false });
	const html = $(".astro-element-9736eea .astro-widget-container").first().html();
	return htmlToPortableText(html);
}

function ensureCollection(collection, afterSlug) {
	const existingIndex = seed.collections.findIndex((item) => item.slug === collection.slug);
	if (existingIndex >= 0) seed.collections[existingIndex] = collection;
	else {
		const afterIndex = seed.collections.findIndex((item) => item.slug === afterSlug);
		seed.collections.splice(afterIndex >= 0 ? afterIndex + 1 : seed.collections.length, 0, collection);
	}
}

function ensureLocationPageFields() {
	const collection = seed.collections.find((item) => item.slug === "location_pages");
	if (!collection) return;
	for (const field of sharedHeadingFields) {
		if (!collection.fields.some((item) => item.slug === field.slug)) {
			const sortIndex = Math.max(0, collection.fields.findIndex((item) => item.slug === "sort_order"));
			collection.fields.splice(sortIndex, 0, field);
		}
	}
	for (const item of seed.content?.location_pages || []) {
		item.data ||= {};
		for (const field of sharedHeadingFields) if (!(field.slug in item.data)) item.data[field.slug] = "";
	}
}

function ensureStaffPagesContent() {
	const existing = new Map((seed.content?.staff_pages || []).map((item) => [item.slug || item.id, item]));
	seed.content ||= {};
	seed.content.staff_pages = (seed.content.staff || []).map((staff, index) => {
		const data = staff.data || {};
		const slug = staff.slug || staff.id;
		const current = existing.get(slug) || {};
		const currentData = current.data || {};
		const locationText = String(data.locations || "").trim();
		const desc = data.name && data.role
			? `${data.name} is a ${data.role} at America's Best Hearing${locationText ? ` serving ${locationText}` : ""}.`
			: "America's Best Hearing staff profile.";
		return {
			id: slug,
			slug,
			status: current.status || "published",
			data: {
				title: currentData.title || `${data.name || slug} Staff Page`,
				staff_slug: currentData.staff_slug || slug,
				page_title: currentData.page_title || `${data.name || slug} | America's Best Hearing`,
				meta_description: currentData.meta_description || desc,
				intro_body: currentData.intro_body || introFromRaw(data),
				audiology_services_heading: currentData.audiology_services_heading || "",
				audiology_services_heading_continuation: currentData.audiology_services_heading_continuation || "",
				hearing_aid_services_heading: currentData.hearing_aid_services_heading || "",
				hearing_aid_services_heading_continuation: currentData.hearing_aid_services_heading_continuation || "",
				sort_order: currentData.sort_order || data.sort_order || index + 1,
			},
		};
	});
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

function ensureFieldRows(db, collectionSlug, fields) {
	const collectionRow = db.prepare("SELECT id FROM _emdash_collections WHERE slug=?").get(collectionSlug);
	if (!collectionRow) return;
	fields.forEach((field, index) => {
		const existing = db.prepare("SELECT id FROM _emdash_fields WHERE collection_id=? AND slug=?").get(collectionRow.id, field.slug);
		if (existing) {
			db.prepare("UPDATE _emdash_fields SET label=?, type=?, column_type=?, required=?, searchable=? WHERE id=?").run(
				field.label,
				field.type,
				columnType(field),
				field.required ? 1 : 0,
				field.searchable ? 1 : 0,
				existing.id,
			);
		} else {
			db.prepare(`
				INSERT INTO _emdash_fields
					(id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
				VALUES
					(@id, @collection_id, @slug, @label, @type, @column_type, @required, 0, NULL, NULL, NULL, NULL, @sort_order, datetime('now'), @searchable, 1)
			`).run({
				id: randomId(),
				collection_id: collectionRow.id,
				slug: field.slug,
				label: field.label,
				type: field.type,
				column_type: columnType(field),
				required: field.required ? 1 : 0,
				sort_order: index,
				searchable: field.searchable ? 1 : 0,
			});
		}
	});
}

function ensureDbCollection(db, collection) {
	const existing = db.prepare("SELECT id FROM _emdash_collections WHERE slug=?").get(collection.slug);
	const collectionId = existing?.id || randomId();
	if (!existing) {
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
	return collectionId;
}

function configureDb(dbPath) {
	const db = new Database(dbPath);
	const transaction = db.transaction(() => {
		const locationTable = "ec_location_pages";
		if (tableExists(db, locationTable)) {
			for (const field of sharedHeadingFields) ensureColumn(db, locationTable, field);
			ensureFieldRows(db, "location_pages", seed.collections.find((item) => item.slug === "location_pages")?.fields || sharedHeadingFields);
		}

		const collectionId = ensureDbCollection(db, staffPagesCollection);
		const table = "ec_staff_pages";
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
		for (const field of staffPagesCollection.fields) ensureColumn(db, table, field);
		ensureFieldRows(db, staffPagesCollection.slug, staffPagesCollection.fields);

		const columns = ["id", "slug", "status", "created_at", "updated_at", "published_at", "version", "locale", ...staffPagesCollection.fields.map((field) => field.slug)];
		const quoted = columns.map((column) => `"${column}"`).join(", ");
		const placeholders = columns.map((column) => `@${column}`).join(", ");
		const insert = db.prepare(`INSERT OR IGNORE INTO "${table}" (${quoted}) VALUES (${placeholders})`);
		const updateMissing = db.prepare(`UPDATE "${table}" SET staff_slug=COALESCE(NULLIF(staff_slug,''), @staff_slug), intro_body=COALESCE(intro_body, @intro_body), updated_at=datetime('now') WHERE slug=@slug`);
		for (const item of seed.content.staff_pages || []) {
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
			for (const field of staffPagesCollection.fields) row[field.slug] = normalizeFieldValue(data[field.slug]);
			insert.run(row);
			updateMissing.run({ slug: row.slug, staff_slug: data.staff_slug || row.slug, intro_body: row.intro_body });
		}
	});
	transaction();
	db.close();
	return dbPath;
}

ensureLocationPageFields();
ensureCollection(staffPagesCollection, "staff");
ensureStaffPagesContent();
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
const updated = dbPaths().map(configureDb);
console.log(`Staff Pages collection and shared heading fields ready in ${updated.length} database(s).`);
for (const file of updated) console.log(`- ${path.relative(root, file)}`);
