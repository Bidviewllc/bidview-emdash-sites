const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const root = process.cwd();
const dbPaths = [
	path.join(root, "data.db"),
	...fs
		.globSync(path.join(root, ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite").replace(/\\/g, "/"))
		.filter((file) => !file.endsWith("metadata.sqlite")),
].filter((file) => fs.existsSync(file));

const contactTableSql = `
CREATE TABLE IF NOT EXISTS contact_submissions (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	phone TEXT,
	clinic TEXT,
	message TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const utilityPagesTableSql = `
CREATE TABLE IF NOT EXISTS ec_utility_pages (
	id TEXT PRIMARY KEY,
	slug TEXT,
	status TEXT DEFAULT 'draft',
	author_id TEXT,
	primary_byline_id TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now')),
	published_at TEXT,
	scheduled_at TEXT,
	deleted_at TEXT,
	version INTEGER DEFAULT 1,
	live_revision_id TEXT,
	draft_revision_id TEXT,
	locale TEXT NOT NULL DEFAULT 'en',
	translation_group TEXT,
	title TEXT NOT NULL DEFAULT '',
	page_title TEXT,
	route_path TEXT,
	meta_title TEXT,
	meta_description TEXT,
	content_body TEXT,
	sort_order INTEGER
);
`;

const aboutPagesTableSql = `
CREATE TABLE IF NOT EXISTS ec_about_pages (
	id TEXT PRIMARY KEY,
	slug TEXT,
	status TEXT DEFAULT 'draft',
	author_id TEXT,
	primary_byline_id TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now')),
	published_at TEXT,
	scheduled_at TEXT,
	deleted_at TEXT,
	version INTEGER DEFAULT 1,
	live_revision_id TEXT,
	draft_revision_id TEXT,
	locale TEXT NOT NULL DEFAULT 'en',
	translation_group TEXT,
	title TEXT NOT NULL DEFAULT '',
	page_title TEXT,
	route_path TEXT,
	meta_title TEXT,
	meta_description TEXT,
	intro_content TEXT,
	intro_image JSON,
	body_content TEXT,
	sort_order INTEGER
);
`;

const contactPagesTableSql = `
CREATE TABLE IF NOT EXISTS ec_contact_pages (
	id TEXT PRIMARY KEY,
	slug TEXT,
	status TEXT DEFAULT 'draft',
	author_id TEXT,
	primary_byline_id TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now')),
	published_at TEXT,
	scheduled_at TEXT,
	deleted_at TEXT,
	version INTEGER DEFAULT 1,
	live_revision_id TEXT,
	draft_revision_id TEXT,
	locale TEXT NOT NULL DEFAULT 'en',
	translation_group TEXT,
	title TEXT NOT NULL DEFAULT '',
	page_title TEXT,
	route_path TEXT,
	meta_title TEXT,
	meta_description TEXT,
	intro_content TEXT,
	email_intro TEXT,
	sort_order INTEGER
);
`;

const appointmentPagesTableSql = `
CREATE TABLE IF NOT EXISTS ec_appointment_pages (
	id TEXT PRIMARY KEY,
	slug TEXT,
	status TEXT DEFAULT 'draft',
	author_id TEXT,
	primary_byline_id TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now')),
	published_at TEXT,
	scheduled_at TEXT,
	deleted_at TEXT,
	version INTEGER DEFAULT 1,
	live_revision_id TEXT,
	draft_revision_id TEXT,
	locale TEXT NOT NULL DEFAULT 'en',
	translation_group TEXT,
	title TEXT NOT NULL DEFAULT '',
	page_title TEXT,
	route_path TEXT,
	meta_title TEXT,
	meta_description TEXT,
	default_location_slug TEXT,
	sort_order INTEGER
);
`;

const siteSettingsTableSql = `
CREATE TABLE IF NOT EXISTS ec_site_settings (
	id TEXT PRIMARY KEY,
	slug TEXT,
	status TEXT DEFAULT 'draft',
	author_id TEXT,
	primary_byline_id TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now')),
	published_at TEXT,
	scheduled_at TEXT,
	deleted_at TEXT,
	version INTEGER DEFAULT 1,
	live_revision_id TEXT,
	draft_revision_id TEXT,
	locale TEXT NOT NULL DEFAULT 'en',
	translation_group TEXT,
	title TEXT NOT NULL DEFAULT '',
	phone TEXT,
	phone_label TEXT,
	appointment_url TEXT,
	locations_summary TEXT,
	footer_tagline TEXT,
	copyright_year INTEGER,
	copyright_text TEXT
);
`;

const internalPageCtasTableSql = `
CREATE TABLE IF NOT EXISTS ec_internal_page_ctas (
	id TEXT PRIMARY KEY,
	slug TEXT,
	status TEXT DEFAULT 'draft',
	author_id TEXT,
	primary_byline_id TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now')),
	published_at TEXT,
	scheduled_at TEXT,
	deleted_at TEXT,
	version INTEGER DEFAULT 1,
	live_revision_id TEXT,
	draft_revision_id TEXT,
	locale TEXT NOT NULL DEFAULT 'en',
	translation_group TEXT,
	title TEXT NOT NULL DEFAULT '',
	heading TEXT,
	body TEXT,
	button_text TEXT,
	button_url TEXT
);
`;

function columnTypeForField(type) {
	if (["integer", "number"].includes(type)) return "INTEGER";
	if (["image", "portableText", "repeater", "multiSelect"].includes(type)) return "JSON";
	return "TEXT";
}

function randomId(prefix = "abh") {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureCollection(db, collection) {
	let row = db.prepare("SELECT * FROM _emdash_collections WHERE slug = ?").get(collection.slug);
	if (!row) {
		const id = randomId("collection");
		db.prepare(
			`INSERT INTO _emdash_collections
			 (id, slug, label, label_singular, supports, source, search_config, has_seo, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, 'seed', ?, ?, datetime('now'), datetime('now'))`,
		).run(
			id,
			collection.slug,
			collection.label,
			collection.labelSingular || collection.label,
			JSON.stringify(collection.supports || []),
			collection.supports?.includes("search") ? JSON.stringify({ enabled: true }) : null,
			collection.supports?.includes("seo") ? 1 : 0,
		);
		row = db.prepare("SELECT * FROM _emdash_collections WHERE slug = ?").get(collection.slug);
	} else {
		db.prepare(
			`UPDATE _emdash_collections
			 SET label = ?, label_singular = ?, supports = ?, search_config = ?, has_seo = ?, updated_at = datetime('now')
			 WHERE slug = ?`,
		).run(
			collection.label,
			collection.labelSingular || collection.label,
			JSON.stringify(collection.supports || []),
			collection.supports?.includes("search") ? JSON.stringify({ enabled: true }) : null,
			collection.supports?.includes("seo") ? 1 : 0,
			collection.slug,
		);
	}

	(collection.fields || []).forEach((field, index) => {
		const existing = db.prepare("SELECT id FROM _emdash_fields WHERE collection_id = ? AND slug = ?").get(row.id, field.slug);
		const values = [
			field.label,
			field.type,
			columnTypeForField(field.type),
			field.required ? 1 : 0,
			field.unique ? 1 : 0,
			field.validation ? JSON.stringify(field.validation) : null,
			field.options ? JSON.stringify(field.options) : null,
			index,
			field.searchable ? 1 : 0,
		];
		if (existing) {
			db.prepare(
				`UPDATE _emdash_fields
				 SET label = ?, type = ?, column_type = ?, required = ?, "unique" = ?, validation = ?, options = ?, sort_order = ?, searchable = ?
				 WHERE id = ?`,
			).run(...values, existing.id);
		} else {
			db.prepare(
				`INSERT INTO _emdash_fields
				 (id, collection_id, slug, label, type, column_type, required, "unique", validation, options, sort_order, searchable)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			).run(randomId("field"), row.id, field.slug, ...values);
		}
	});
}

function ensureColumn(db, table, field) {
	const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
	if (!columns.includes(field.slug)) {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${field.slug} ${columnTypeForField(field.type)}`);
	}
}

function ensureSiteSettings(db) {
	const existing = db.prepare("SELECT id FROM ec_site_settings WHERE id = 'site' OR slug = 'site'").get();
	if (existing) return;
	db.prepare(
		`INSERT INTO ec_site_settings
		 (id, slug, status, created_at, updated_at, published_at, locale, translation_group, title, phone, phone_label, appointment_url, locations_summary, footer_tagline, copyright_year, copyright_text)
		 VALUES ('site', 'site', 'published', datetime('now'), datetime('now'), datetime('now'), 'en', 'site', ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		"Site Settings",
		"517-777-8434",
		"Text or call: 517-777-8434",
		"http://localhost:4321/request-an-appointment/",
		"13 Locations in Michigan, Minnesota, & Florida",
		"We provide expert, affordable hearing care to help you stay connected to what matters most.",
		new Date().getFullYear(),
		`© ${new Date().getFullYear()} America's Best Hearing. | HIPAA | All rights reserved.`,
	);
}

function ensureInternalPageCta(db) {
	const existing = db.prepare("SELECT id FROM ec_internal_page_ctas WHERE id = 'default' OR slug = 'default'").get();
	if (existing) return;
	db.prepare(
		`INSERT INTO ec_internal_page_ctas
		 (id, slug, status, created_at, updated_at, published_at, locale, translation_group, title, heading, body, button_text, button_url)
		 VALUES ('default', 'default', 'published', datetime('now'), datetime('now'), datetime('now'), 'en', 'default', ?, ?, ?, ?, ?)`,
	).run(
		"Default Internal Page CTA",
		"Are you ready to hear and be heard?",
		"Hearing clearly impacts your quality of life now and for years to come in so many ways. Call us today and take the first step toward clearer, more confident listening.",
		"Schedule your Appointment",
		"http://localhost:4321/request-an-appointment/",
	);
}

function ensureMenu(db, menu) {
	let row = db.prepare("SELECT * FROM _emdash_menus WHERE name = ? AND locale = 'en'").get(menu.name);
	if (!row) {
		const id = randomId("menu");
		db.prepare(
			`INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
			 VALUES (?, ?, ?, datetime('now'), datetime('now'), 'en', ?)`,
		).run(id, menu.name, menu.label, menu.name);
		row = db.prepare("SELECT * FROM _emdash_menus WHERE id = ?").get(id);
	}

	const existingItems = db
		.prepare("SELECT label, custom_url FROM _emdash_menu_items WHERE menu_id = ? ORDER BY sort_order ASC")
		.all(row.id);
	const isPlaceholderPrimary =
		menu.name === "primary" &&
		existingItems.length === 3 &&
		existingItems.map((item) => item.label).join("|") === "Home|Posts|About";
	const shouldSeed = existingItems.length === 0 || isPlaceholderPrimary;
	if (!shouldSeed) return;

	db.prepare("DELETE FROM _emdash_menu_items WHERE menu_id = ?").run(row.id);
	const insertItem = db.prepare(
		`INSERT INTO _emdash_menu_items
		 (id, menu_id, parent_id, sort_order, type, reference_collection, reference_id, custom_url, label, title_attr, target, css_classes, created_at, locale, translation_group)
		 VALUES (?, ?, ?, ?, 'custom', NULL, NULL, ?, ?, NULL, NULL, NULL, datetime('now'), 'en', ?)`,
	);

	function addItems(items, parentId = null) {
		items.forEach((item, index) => {
			const id = randomId("menu_item");
			insertItem.run(id, row.id, parentId, index, item.url || "#", item.label, id);
			if (Array.isArray(item.children) && item.children.length) addItems(item.children, id);
		});
	}

	addItems(menu.items || []);
}

const locationPageTriggerSql = `
CREATE TRIGGER IF NOT EXISTS trg_locations_create_location_page_draft
AFTER INSERT ON ec_locations
WHEN NEW.deleted_at IS NULL
	AND NEW.slug IS NOT NULL
	AND NEW.slug != ''
	AND NOT EXISTS (
		SELECT 1 FROM ec_location_pages
		WHERE deleted_at IS NULL
			AND (location_slug = NEW.slug OR slug = NEW.slug OR id = NEW.slug)
	)
BEGIN
	INSERT INTO ec_location_pages (
		id,
		slug,
		status,
		created_at,
		updated_at,
		locale,
		translation_group,
		title,
		location_slug,
		page_title,
		meta_description,
		hero_eyebrow,
		hero_heading,
		h1_eyebrow,
		h1_heading,
		intro_body,
		sort_order,
		audiology_services_heading,
		audiology_services_heading_continuation,
		hearing_aid_services_heading,
		hearing_aid_services_heading_continuation
	)
	VALUES (
		NEW.slug,
		NEW.slug,
		'draft',
		datetime('now'),
		datetime('now'),
		COALESCE(NEW.locale, 'en'),
		NEW.slug,
		NEW.name || ' Location Page',
		NEW.slug,
		'America''s Best Hearing | Hearing Aids In ' || NEW.name,
		'America''s Best Hearing provides expert hearing care and hearing aids in ' || NEW.name || '.',
		'',
		'Expert Hearing Care in ' || NEW.name,
		'Hearing Instrument Specialist & Hearing Aids in',
		NEW.name,
		'[{"_type":"block","style":"normal","_key":"auto-location-intro","children":[{"_type":"span","text":"America''s Best Hearing provides hearing tests, hearing aids, ear wax removal, and professional hearing services in ' || NEW.name || '.","_key":"auto-location-intro-span"}]}]',
		NEW.sort_order,
		'Audiology Services Offered at America''s Best Hearing',
		'in Michigan, Minnesota, and Florida',
		'Our Hearing Aids & Protection Solutions Offered at America''s Best Hearing',
		'in Michigan, Minnesota, and Florida'
	);
END;
`;

for (const dbPath of dbPaths) {
	const db = new Database(dbPath);
	db.exec(contactTableSql);
	db.exec(utilityPagesTableSql);
	db.exec(aboutPagesTableSql);
	db.exec(contactPagesTableSql);
	db.exec(appointmentPagesTableSql);
	db.exec(siteSettingsTableSql);
	db.exec(internalPageCtasTableSql);
	ensureCollection(db, {
		slug: "utility_pages",
		label: "Utility Pages",
		labelSingular: "Utility Page",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			{ slug: "title", label: "Admin Title", type: "string", required: true, searchable: true },
			{ slug: "page_title", label: "Page Title / H1", type: "string", searchable: true },
			{ slug: "route_path", label: "Route Path", type: "url", required: true },
			{ slug: "meta_title", label: "Meta Title", type: "string" },
			{ slug: "meta_description", label: "Meta Description", type: "text" },
			{ slug: "content_body", label: "Content Body", type: "portableText", searchable: true },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	});
	ensureCollection(db, {
		slug: "about_pages",
		label: "About Pages",
		labelSingular: "About Page",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			{ slug: "title", label: "Admin Title", type: "string", required: true, searchable: true },
			{ slug: "page_title", label: "Page Title / H1", type: "string", searchable: true },
			{ slug: "route_path", label: "Route Path", type: "url", required: true },
			{ slug: "meta_title", label: "Meta Title", type: "string" },
			{ slug: "meta_description", label: "Meta Description", type: "text" },
			{ slug: "intro_content", label: "Intro Content", type: "portableText", searchable: true },
			{ slug: "intro_image", label: "Intro Image", type: "image" },
			{ slug: "body_content", label: "Body Content", type: "portableText", searchable: true },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	});
	ensureCollection(db, {
		slug: "contact_pages",
		label: "Contact Pages",
		labelSingular: "Contact Page",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			{ slug: "title", label: "Admin Title", type: "string", required: true, searchable: true },
			{ slug: "page_title", label: "Page Title / H1", type: "string", searchable: true },
			{ slug: "route_path", label: "Route Path", type: "url", required: true },
			{ slug: "meta_title", label: "Meta Title", type: "string" },
			{ slug: "meta_description", label: "Meta Description", type: "text" },
			{ slug: "intro_content", label: "Intro Content", type: "portableText", searchable: true },
			{ slug: "email_intro", label: "Email Intro", type: "portableText", searchable: true },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	});
	ensureCollection(db, {
		slug: "appointment_pages",
		label: "Appointment Pages",
		labelSingular: "Appointment Page",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			{ slug: "title", label: "Admin Title", type: "string", required: true, searchable: true },
			{ slug: "page_title", label: "Page Title / H1", type: "string", searchable: true },
			{ slug: "route_path", label: "Route Path", type: "url", required: true },
			{ slug: "meta_title", label: "Meta Title", type: "string" },
			{ slug: "meta_description", label: "Meta Description", type: "text" },
			{ slug: "default_location_slug", label: "Default Location Slug", type: "string" },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	});
	ensureCollection(db, {
		slug: "site_settings",
		label: "Site Settings",
		labelSingular: "Site Settings",
		supports: ["drafts", "revisions"],
		fields: [
			{ slug: "title", label: "Admin Title", type: "string", required: true },
			{ slug: "phone", label: "Primary Phone", type: "string" },
			{ slug: "phone_label", label: "Phone Display Label", type: "string" },
			{ slug: "appointment_url", label: "Schedule Appointment URL", type: "url" },
			{ slug: "locations_summary", label: "Header Location Summary", type: "string" },
			{ slug: "footer_tagline", label: "Footer Tagline", type: "text" },
			{ slug: "copyright_year", label: "Copyright Year", type: "integer" },
			{ slug: "copyright_text", label: "Copyright Text", type: "string" },
		],
	});
	ensureSiteSettings(db);
	ensureCollection(db, {
		slug: "internal_page_ctas",
		label: "Internal Page CTAs",
		labelSingular: "Internal Page CTA",
		supports: ["drafts", "revisions"],
		fields: [
			{ slug: "title", label: "Admin Title", type: "string", required: true },
			{ slug: "heading", label: "CTA Heading", type: "string" },
			{ slug: "body", label: "CTA Body", type: "text" },
			{ slug: "button_text", label: "Button Text", type: "string" },
			{ slug: "button_url", label: "Button URL", type: "url" },
		],
	});
	ensureInternalPageCta(db);
	ensureColumn(db, "ec_posts", { slug: "meta_title", type: "string" });
	ensureColumn(db, "ec_posts", { slug: "meta_description", type: "text" });
	ensureCollection(db, {
		slug: "posts",
		label: "Posts",
		labelSingular: "Post",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			{ slug: "title", label: "Title", type: "string", required: true, searchable: true },
			{ slug: "featured_image", label: "Featured Image", type: "image" },
			{ slug: "author", label: "Author", type: "string" },
			{ slug: "content", label: "Content", type: "portableText", searchable: true },
			{ slug: "meta_title", label: "Meta Title", type: "string" },
			{ slug: "meta_description", label: "Meta Description", type: "text" },
		],
	});
	ensureColumn(db, "ec_locations", { slug: "featured_image", type: "image" });
	ensureColumn(db, "ec_locations", { slug: "scheduler_embed_url", type: "url" });
	ensureCollection(db, {
		slug: "locations",
		label: "Locations",
		labelSingular: "Location",
		supports: ["drafts", "revisions", "search", "seo"],
		fields: [
			{ slug: "name", label: "Location Name", type: "string", required: true, searchable: true },
			{ slug: "address", label: "Address", type: "text", searchable: true },
			{ slug: "phone", label: "Phone", type: "string" },
			{ slug: "appointment_url", label: "Appointment URL", type: "url" },
			{ slug: "directions_url", label: "Directions URL", type: "url" },
			{ slug: "google_maps_query", label: "Google Maps Address / Query", type: "text" },
			{ slug: "featured_image", label: "Featured Image", type: "image" },
			{ slug: "scheduler_embed_url", label: "Scheduler Embed URL", type: "url" },
			{ slug: "sort_order", label: "Sort Order", type: "integer" },
		],
	});
	ensureMenu(db, {
		name: "primary",
		label: "Primary Navigation",
		items: [
			{ label: "About", url: "/about/" },
			{ label: "Services", url: "/audiology-services/" },
			{ label: "Hearing Aids", url: "/hearing-aids-products/" },
			{ label: "Contact Us", url: "/contact/" },
		],
	});
	ensureMenu(db, {
		name: "locations",
		label: "Locations Menu",
		items: [
			{ label: "Lansing, MI", url: "/audiologist-hearing-aids-lansing-mi/" },
			{ label: "Portage, MI", url: "/audiologist-hearing-aids-portage-mi/" },
			{ label: "Anoka, MN", url: "/audiologist-hearing-aids-anoka-mn/" },
			{ label: "Eden Prairie, MN", url: "/audiologist-hearing-aids-eden-prairie-mn/" },
			{ label: "Edina, MN", url: "/audiologist-hearing-aids-edina-mn/" },
			{ label: "Maple Grove, MN", url: "/audiologist-hearing-aids-maple-grove-mn/" },
			{ label: "Mendota Heights, MN", url: "/audiologist-hearing-aids-mendota-heights-mn/" },
			{ label: "New Ulm, MN", url: "/audiologist-hearing-aids-new-ulm-mn/" },
			{ label: "Roseville, MN", url: "/audiologist-hearing-aids-roseville-mn/" },
			{ label: "Willmar, MN", url: "/audiologist-hearing-aids-willmar-mn/" },
			{ label: "Lake Wales, FL", url: "/audiologist-hearing-aids-lake-wales-fl/" },
			{ label: "Sebring, FL", url: "/audiologist-hearing-aids-sebring-fl/" },
			{ label: "Winter Haven, FL", url: "/audiologist-hearing-aids-winter-haven-fl/" },
		],
	});
	ensureMenu(db, {
		name: "footer_services",
		label: "Footer Services",
		items: [
			{ label: "Hearing Tests", url: "/audiology-services/hearing-tests/" },
			{ label: "Ear Wax Removal", url: "/audiology-services/ear-wax-removal/" },
			{ label: "Hearing Aid Services", url: "/audiology-services/hearing-aid-services/" },
			{ label: "Assistive Listening Devices", url: "/hearing-aids-products/hearing-aid-alternatives/" },
			{ label: "Custom Hearing Protection", url: "/custom-hearing-protection/" },
			{ label: "Hearing Aid Batteries", url: "/hearing-aids-products/hearing-aid-batteries/" },
			{ label: "Hearing Aid Fittings", url: "/audiology-services/hearing-aid-fittings/" },
		],
	});
	ensureMenu(db, {
		name: "footer_legal",
		label: "Footer Legal Links",
		items: [
			{ label: "Terms of Service", url: "/terms-of-service/" },
			{ label: "Privacy Policy", url: "/privacy-policy/" },
			{ label: "Sitemap", url: "/sitemap/" },
		],
	});
	const hasLocationTables =
		db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ec_locations'").get() &&
		db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ec_location_pages'").get();
	if (hasLocationTables) db.exec(locationPageTriggerSql);
	const hasStaffTables =
		db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ec_staff'").get() &&
		db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ec_staff_pages'").get();
	if (hasStaffTables) {
		db.exec(`
CREATE TRIGGER IF NOT EXISTS trg_staff_create_staff_page_draft
AFTER INSERT ON ec_staff
WHEN NEW.deleted_at IS NULL
	AND NEW.slug IS NOT NULL
	AND NEW.slug != ''
	AND NOT EXISTS (
		SELECT 1 FROM ec_staff_pages
		WHERE deleted_at IS NULL
			AND (staff_slug = NEW.slug OR slug = NEW.slug OR id = NEW.slug)
	)
BEGIN
	INSERT INTO ec_staff_pages (
		id,
		slug,
		status,
		created_at,
		updated_at,
		locale,
		translation_group,
		title,
		staff_slug,
		page_title,
		meta_description,
		intro_body,
		audiology_services_heading,
		audiology_services_heading_continuation,
		hearing_aid_services_heading,
		hearing_aid_services_heading_continuation,
		sort_order
	)
	VALUES (
		NEW.slug,
		NEW.slug,
		'draft',
		datetime('now'),
		datetime('now'),
		COALESCE(NEW.locale, 'en'),
		NEW.slug,
		NEW.name || ' Staff Page',
		NEW.slug,
		NEW.name || ' | America''s Best Hearing',
		NEW.name || ' is a hearing care professional at America''s Best Hearing.',
		'[{"_type":"block","style":"normal","_key":"auto-staff-intro","children":[{"_type":"span","text":"' || NEW.name || ' is a hearing care professional at America''s Best Hearing.","_key":"auto-staff-intro-span"}]}]',
		'Audiology Services Offered at America''s Best Hearing',
		'in Michigan, Minnesota, and Florida',
		'Our Hearing Aids & Protection Solutions Offered at America''s Best Hearing',
		'in Michigan, Minnesota, and Florida',
		NEW.sort_order
	);
END;`);
	}
	db.close();
	console.log(`Configured ABH data hooks: ${path.relative(root, dbPath)}`);
}
