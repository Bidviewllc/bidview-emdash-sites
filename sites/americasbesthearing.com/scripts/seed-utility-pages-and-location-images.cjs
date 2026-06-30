const fs = require("node:fs");
const path = require("node:path");
const { load } = require("cheerio");
const Database = require("better-sqlite3");

const root = process.cwd();
const dbPaths = [
	path.join(root, "data.db"),
	...fs
		.globSync(path.join(root, ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite").replace(/\\/g, "/"))
		.filter((file) => !file.endsWith("metadata.sqlite")),
].filter((file) => fs.existsSync(file));

function randomId(prefix = "abh") {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function block(text, style = "normal", children = null, markDefs = []) {
	return {
		_type: "block",
		style,
		_key: randomId("block"),
		children: children || [{ _type: "span", text: String(text || ""), _key: randomId("span") }],
		...(markDefs.length ? { markDefs } : {}),
	};
}

function htmlToPortable(html) {
	const normalizedHtml = String(html || "")
		.replace(/\[\.\.\/assets\/other\/--a5248d3c66\s*/g, "[https://www.americasbesthearing.com/] ")
		.replace(/\[email(?:&nbsp;|\s)*protected\]/gi, "leads@proheargroup.com");
	const $ = load(`<div id="root">${normalizedHtml}</div>`, { decodeEntities: false });
	const blocks = [];

	function inlineChildren(node) {
		const children = [];
		const markDefs = [];
		const walk = (contents, marks = []) => {
			contents.each((_, child) => {
				if (child.type === "text") {
					const text = String(child.data || "").replace(/\s+/g, " ");
					if (text.trim()) children.push({ _type: "span", text, _key: randomId("span"), ...(marks.length ? { marks } : {}) });
					return;
				}
				if (child.type !== "tag") return;
				const element = $(child);
				const tag = child.tagName?.toLowerCase();
				if (tag === "br") {
					children.push({ _type: "span", text: "\n", _key: randomId("span"), ...(marks.length ? { marks } : {}) });
					return;
				}
				const nextMarks = [...marks];
				if (tag === "strong" || tag === "b") nextMarks.push("strong");
				if (tag === "em" || tag === "i") nextMarks.push("em");
				if (tag === "a") {
					const href = element.attr("href");
					if (href) {
						const key = randomId("link");
						markDefs.push({ _key: key, _type: "link", href });
						nextMarks.push(key);
					}
				}
				walk(element.contents(), nextMarks);
			});
		};
		walk(node.contents());
		return { children, markDefs };
	}

	$("#root")
		.children()
		.each((_, element) => {
			const node = $(element);
			const tag = element.tagName?.toLowerCase();
			const text = node.text().replace(/\s+/g, " ").trim();
			if (!text) return;
			if (["h2", "h3", "h4"].includes(tag)) {
				const inline = inlineChildren(node);
				blocks.push(block(text, tag, inline.children, inline.markDefs));
			} else if (tag === "ul" || tag === "ol") {
				node.find("li").each((__, li) => {
					const liNode = $(li);
					const itemText = liNode.text().replace(/\s+/g, " ").trim();
					if (itemText) {
						const inline = inlineChildren(liNode);
						blocks.push({ ...block(itemText, "normal", inline.children, inline.markDefs), listItem: "bullet" });
					}
				});
			} else {
				const inline = inlineChildren(node);
				blocks.push(block(text, "normal", inline.children, inline.markDefs));
			}
		});
	return blocks.length ? blocks : [block($("#root").text().replace(/\s+/g, " ").trim())];
}

function contentFromRaw(rawName) {
	const file = path.join(root, "src/components/raw-pages", rawName);
	if (!fs.existsSync(file)) return [];
	const $ = load(fs.readFileSync(file, "utf8"), { decodeEntities: false });
	const targets = $(".astro-widget-theme-post-content .astro-widget-container")
		.toArray()
		.map((element) => $(element))
		.filter((node) => {
			const html = node.html() || "";
			const text = node.text().replace(/\s+/g, " ").trim();
			return text && !html.includes("data-astro-type=") && !node.find(".astro-divider").length;
		});
	if (targets.length) {
		const combined = targets.map((node) => node.html() || "").join("\n");
		return htmlToPortable(combined);
	}
	const textBlocks = $(".astro-widget-text-editor .astro-widget-container")
		.map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
		.get()
		.filter(Boolean);
	return textBlocks.length ? textBlocks.map((text) => block(text)) : [];
}

function pageTextBlocks(rawName, sectionSelector = "") {
	const file = path.join(root, "src/components/raw-pages", rawName);
	if (!fs.existsSync(file)) return [];
	const $ = load(fs.readFileSync(file, "utf8"), { decodeEntities: false });
	if (sectionSelector) $(sectionSelector).remove();
	return $(".astro-widget-text-editor .astro-widget-container")
		.map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
		.get()
		.filter((text) => text && !/^Home\s*»/i.test(text));
}

function firstImageFromRaw(rawName) {
	const file = path.join(root, "src/components/raw-pages", rawName);
	if (!fs.existsSync(file)) return null;
	const $ = load(fs.readFileSync(file, "utf8"), { decodeEntities: false });
	const image = $("img").first();
	const src = image.attr("src");
	if (!src) return null;
	return {
		provider: "local",
		src,
		alt: image.attr("alt") || "",
		filename: path.basename(src),
	};
}

const aboutText = pageTextBlocks("about.html", ".astro-element-0bd9e70");
const contactText = pageTextBlocks("contact.html", ".astro-element-b25250d");

const aboutPages = [
	{
		id: "about",
		title: "About Page",
		page_title: "About America's Best Hearing",
		route_path: "http://localhost:4321/about/",
		meta_title: "About Us | America's Best Hearing",
		meta_description:
			"Explore the mission and expertise of America's Best Hearing, top audiologists serving Michigan, Minnesota, and Florida.",
		intro_content: aboutText[0] ? [block(aboutText[0])] : [],
		intro_image: firstImageFromRaw("about.html"),
		body_content: aboutText[1] ? [block(aboutText[1])] : [],
		sort_order: 1,
	},
];

const contactPages = [
	{
		id: "contact",
		title: "Contact Page",
		page_title: "Contact Us",
		route_path: "http://localhost:4321/contact/",
		meta_title: "Contact Us | America's Best Hearing",
		meta_description:
			"Contact America's Best Hearing for professional hearing care in Michigan, Minnesota, and Florida.",
		intro_content: contactText[0] ? [block(contactText[0])] : [],
		email_intro: contactText[1] ? [block(contactText[1])] : [],
		sort_order: 1,
	},
];

const utilityPages = [
	{
		id: "insurance",
		title: "Insurance And Billing FAQs",
		page_title: "Insurance And Billing FAQs",
		route_path: "http://localhost:4321/resources/insurance/",
		meta_title: "Insurance And Billing FAQs | America's Best Hearing",
		meta_description: "Learn more about America's Best Hearing's accepted insurance plans, billing, and payments.",
		content_body: contentFromRaw("resources__insurance.html"),
		sort_order: 3,
	},
	{
		id: "thank-you",
		title: "Thank You Page",
		page_title: "Thank You",
		route_path: "http://localhost:4321/thank-you/",
		meta_title: "Thank You | America's Best Hearing",
		meta_description: "Thank you for reaching out to America's Best Hearing.",
		content_body: contentFromRaw("thank-you.html"),
		sort_order: 4,
	},
	{
		id: "thank-you-for-contacting-us",
		title: "Thank You For Contacting Us Page",
		page_title: "Thank you for contacting us",
		route_path: "http://localhost:4321/thank-you-for-contacting-us/",
		meta_title: "Thank You For Contacting Us | America's Best Hearing",
		meta_description: "Thank you for contacting America's Best Hearing.",
		content_body: contentFromRaw("thank-you-for-contacting-us.html"),
		sort_order: 5,
	},
	{
		id: "terms-of-service",
		title: "Terms of Service Page",
		page_title: "Terms of Service",
		route_path: "http://localhost:4321/terms-of-service/",
		meta_title: "America's Best Hearing | Terms Of Service",
		meta_description: "Learn about our policies, user responsibilities, and legal guidelines for using our website and services.",
		content_body: contentFromRaw("terms-of-service.html"),
		sort_order: 6,
	},
	{
		id: "privacy-policy",
		title: "Privacy Policy Page",
		page_title: "Privacy Policy",
		route_path: "http://localhost:4321/privacy-policy/",
		meta_title: "America's Best Hearing | Privacy Policy",
		meta_description: "Read the America’s Best Hearing privacy policy.",
		content_body: contentFromRaw("privacy-policy.html"),
		sort_order: 7,
	},
];

function slugify(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function appointmentSourceData() {
	const file = path.join(root, "src/components/raw-pages/request-an-appointment.html");
	const data = { schedulerByLocationSlug: new Map(), pages: [] };
	if (!fs.existsSync(file)) return data;
	const $ = load(fs.readFileSync(file, "utf8"), { decodeEntities: false });
	const buttons = $(".e-n-tab-title .e-n-tab-title-text").toArray();
	const panels = $('[role="tabpanel"]').toArray();
	buttons.forEach((button, index) => {
		const name = $(button).text().replace(/\s+/g, " ").trim();
		const slug = slugify(name.replace(/,\s*/g, "-"));
		const iframe = $(panels[index]).find("iframe").first().attr("src") || "";
		if (slug && iframe) data.schedulerByLocationSlug.set(slug, iframe);
	});

	const files = fs
		.readdirSync(path.join(root, "src/components/raw-pages"))
		.filter((name) => /^request-an-appointment.*\.html$/.test(name))
		.sort();
	files.forEach((rawName, index) => {
		const raw = load(fs.readFileSync(path.join(root, "src/components/raw-pages", rawName), "utf8"), { decodeEntities: false });
		const id = rawName.replace(/\.html$/, "");
		const h1 = raw("h1.astro-heading-title").first().text().replace(/\s+/g, " ").trim() || "Request An Appointment";
		const activeName = raw('.e-n-tab-title[aria-selected="true"] .e-n-tab-title-text').first().text().replace(/\s+/g, " ").trim();
		const defaultSlug = id === "request-an-appointment" ? "" : id.replace(/^request-an-appointment-/, "");
		const title = id === "request-an-appointment" ? "Request An Appointment | America's Best Hearing" : `Request An Appointment - ${activeName} | America's Best Hearing`;
		data.pages.push({
			id,
			title,
			page_title: h1,
			route_path: `http://localhost:4321/${id}/`,
			meta_title: title,
			meta_description: id === "request-an-appointment" ? "Request an appointment with the best audiologists in MI, MN, and FL." : `Request an appointment at the ${activeName} office.`,
			default_location_slug: defaultSlug,
			sort_order: index + 1,
		});
	});
	return data;
}

function allLocationsImages() {
	const file = path.join(root, "src/components/raw-pages/all-locations.html");
	const images = new Map();
	if (!fs.existsSync(file)) return images;
	const $ = load(fs.readFileSync(file, "utf8"), { decodeEntities: false });
	$(".e-loop-item").each((_, element) => {
		const card = $(element);
		const name = card.find(".astro-heading-title").first().text().replace(/\s+/g, " ").trim();
		const image = card.find("img").first();
		const src = image.attr("src");
		if (!name || !src) return;
		images.set(name, {
			provider: "local",
			src,
			alt: image.attr("alt") || name,
			filename: path.basename(src),
		});
	});
	return images;
}

function upsertPublishedUtilityPage(db, page) {
	const revisionId = randomId("rev");
	const now = new Date().toISOString();
	const data = {
		title: page.title,
		page_title: page.page_title,
		route_path: page.route_path,
		meta_title: page.meta_title,
		meta_description: page.meta_description,
		content_body: page.content_body,
		sort_order: page.sort_order,
	};
	db.prepare(
		`INSERT OR IGNORE INTO revisions (id, collection, entry_id, data, created_at)
		 VALUES (?, 'utility_pages', ?, ?, ?)`,
	).run(revisionId, page.id, JSON.stringify(data), now);
	db.prepare(
		`INSERT INTO ec_utility_pages
		 (id, slug, status, created_at, updated_at, published_at, live_revision_id, locale, translation_group, title, page_title, route_path, meta_title, meta_description, content_body, sort_order)
		 VALUES (?, ?, 'published', ?, ?, ?, ?, 'en', ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		  slug = excluded.slug,
		  status = CASE WHEN ec_utility_pages.status IS NULL OR ec_utility_pages.status = 'draft' THEN 'published' ELSE ec_utility_pages.status END,
		  updated_at = excluded.updated_at,
		  published_at = COALESCE(ec_utility_pages.published_at, excluded.published_at),
		  live_revision_id = COALESCE(ec_utility_pages.live_revision_id, excluded.live_revision_id),
		  title = COALESCE(ec_utility_pages.title, excluded.title),
		  page_title = COALESCE(ec_utility_pages.page_title, excluded.page_title),
		  route_path = COALESCE(ec_utility_pages.route_path, excluded.route_path),
		  meta_title = COALESCE(ec_utility_pages.meta_title, excluded.meta_title),
		  meta_description = COALESCE(ec_utility_pages.meta_description, excluded.meta_description),
		  content_body = CASE
		    WHEN ec_utility_pages.id = 'insurance' AND ec_utility_pages.content_body NOT LIKE '%"style":"h2"%' THEN excluded.content_body
		    WHEN ec_utility_pages.id = 'privacy-policy' AND ec_utility_pages.content_body LIKE '%../assets/other/--%' THEN excluded.content_body
		    ELSE COALESCE(ec_utility_pages.content_body, excluded.content_body)
		  END,
		  sort_order = COALESCE(ec_utility_pages.sort_order, excluded.sort_order)`,
	).run(
		page.id,
		page.id,
		now,
		now,
		now,
		revisionId,
		page.id,
		page.title,
		page.page_title,
		page.route_path,
		page.meta_title,
		page.meta_description,
		JSON.stringify(page.content_body || []),
		page.sort_order,
	);
}

function upsertPublishedAboutPage(db, page) {
	const revisionId = randomId("rev");
	const now = new Date().toISOString();
	const data = {
		title: page.title,
		page_title: page.page_title,
		route_path: page.route_path,
		meta_title: page.meta_title,
		meta_description: page.meta_description,
		intro_content: page.intro_content,
		intro_image: page.intro_image,
		body_content: page.body_content,
		sort_order: page.sort_order,
	};
	db.prepare(
		`INSERT OR IGNORE INTO revisions (id, collection, entry_id, data, created_at)
		 VALUES (?, 'about_pages', ?, ?, ?)`,
	).run(revisionId, page.id, JSON.stringify(data), now);
	db.prepare(
		`INSERT INTO ec_about_pages
		 (id, slug, status, created_at, updated_at, published_at, live_revision_id, locale, translation_group, title, page_title, route_path, meta_title, meta_description, intro_content, intro_image, body_content, sort_order)
		 VALUES (?, ?, 'published', ?, ?, ?, ?, 'en', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		  slug = excluded.slug,
		  status = CASE WHEN ec_about_pages.status IS NULL OR ec_about_pages.status = 'draft' THEN 'published' ELSE ec_about_pages.status END,
		  updated_at = excluded.updated_at,
		  published_at = COALESCE(ec_about_pages.published_at, excluded.published_at),
		  live_revision_id = COALESCE(ec_about_pages.live_revision_id, excluded.live_revision_id),
		  title = COALESCE(ec_about_pages.title, excluded.title),
		  page_title = COALESCE(ec_about_pages.page_title, excluded.page_title),
		  route_path = COALESCE(ec_about_pages.route_path, excluded.route_path),
		  meta_title = COALESCE(ec_about_pages.meta_title, excluded.meta_title),
		  meta_description = COALESCE(ec_about_pages.meta_description, excluded.meta_description),
		  intro_content = COALESCE(ec_about_pages.intro_content, excluded.intro_content),
		  intro_image = COALESCE(ec_about_pages.intro_image, excluded.intro_image),
		  body_content = COALESCE(ec_about_pages.body_content, excluded.body_content),
		  sort_order = COALESCE(ec_about_pages.sort_order, excluded.sort_order)`,
	).run(
		page.id,
		page.id,
		now,
		now,
		now,
		revisionId,
		page.id,
		page.title,
		page.page_title,
		page.route_path,
		page.meta_title,
		page.meta_description,
		JSON.stringify(page.intro_content || []),
		page.intro_image ? JSON.stringify(page.intro_image) : null,
		JSON.stringify(page.body_content || []),
		page.sort_order,
	);
}

function upsertPublishedContactPage(db, page) {
	const revisionId = randomId("rev");
	const now = new Date().toISOString();
	const data = {
		title: page.title,
		page_title: page.page_title,
		route_path: page.route_path,
		meta_title: page.meta_title,
		meta_description: page.meta_description,
		intro_content: page.intro_content,
		email_intro: page.email_intro,
		sort_order: page.sort_order,
	};
	db.prepare(
		`INSERT OR IGNORE INTO revisions (id, collection, entry_id, data, created_at)
		 VALUES (?, 'contact_pages', ?, ?, ?)`,
	).run(revisionId, page.id, JSON.stringify(data), now);
	db.prepare(
		`INSERT INTO ec_contact_pages
		 (id, slug, status, created_at, updated_at, published_at, live_revision_id, locale, translation_group, title, page_title, route_path, meta_title, meta_description, intro_content, email_intro, sort_order)
		 VALUES (?, ?, 'published', ?, ?, ?, ?, 'en', ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		  slug = excluded.slug,
		  status = CASE WHEN ec_contact_pages.status IS NULL OR ec_contact_pages.status = 'draft' THEN 'published' ELSE ec_contact_pages.status END,
		  updated_at = excluded.updated_at,
		  published_at = COALESCE(ec_contact_pages.published_at, excluded.published_at),
		  live_revision_id = COALESCE(ec_contact_pages.live_revision_id, excluded.live_revision_id),
		  title = COALESCE(ec_contact_pages.title, excluded.title),
		  page_title = COALESCE(ec_contact_pages.page_title, excluded.page_title),
		  route_path = COALESCE(ec_contact_pages.route_path, excluded.route_path),
		  meta_title = COALESCE(ec_contact_pages.meta_title, excluded.meta_title),
		  meta_description = COALESCE(ec_contact_pages.meta_description, excluded.meta_description),
		  intro_content = COALESCE(ec_contact_pages.intro_content, excluded.intro_content),
		  email_intro = COALESCE(ec_contact_pages.email_intro, excluded.email_intro),
		  sort_order = COALESCE(ec_contact_pages.sort_order, excluded.sort_order)`,
	).run(
		page.id,
		page.id,
		now,
		now,
		now,
		revisionId,
		page.id,
		page.title,
		page.page_title,
		page.route_path,
		page.meta_title,
		page.meta_description,
		JSON.stringify(page.intro_content || []),
		JSON.stringify(page.email_intro || []),
		page.sort_order,
	);
}

function upsertPublishedAppointmentPage(db, page) {
	const revisionId = randomId("rev");
	const now = new Date().toISOString();
	const data = {
		title: page.title,
		page_title: page.page_title,
		route_path: page.route_path,
		meta_title: page.meta_title,
		meta_description: page.meta_description,
		default_location_slug: page.default_location_slug,
		sort_order: page.sort_order,
	};
	db.prepare(
		`INSERT OR IGNORE INTO revisions (id, collection, entry_id, data, created_at)
		 VALUES (?, 'appointment_pages', ?, ?, ?)`,
	).run(revisionId, page.id, JSON.stringify(data), now);
	db.prepare(
		`INSERT INTO ec_appointment_pages
		 (id, slug, status, created_at, updated_at, published_at, live_revision_id, locale, translation_group, title, page_title, route_path, meta_title, meta_description, default_location_slug, sort_order)
		 VALUES (?, ?, 'published', ?, ?, ?, ?, 'en', ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		  slug = excluded.slug,
		  status = CASE WHEN ec_appointment_pages.status IS NULL OR ec_appointment_pages.status = 'draft' THEN 'published' ELSE ec_appointment_pages.status END,
		  updated_at = excluded.updated_at,
		  published_at = COALESCE(ec_appointment_pages.published_at, excluded.published_at),
		  live_revision_id = COALESCE(ec_appointment_pages.live_revision_id, excluded.live_revision_id),
		  title = COALESCE(ec_appointment_pages.title, excluded.title),
		  page_title = COALESCE(ec_appointment_pages.page_title, excluded.page_title),
		  route_path = COALESCE(ec_appointment_pages.route_path, excluded.route_path),
		  meta_title = COALESCE(ec_appointment_pages.meta_title, excluded.meta_title),
		  meta_description = COALESCE(ec_appointment_pages.meta_description, excluded.meta_description),
		  default_location_slug = COALESCE(ec_appointment_pages.default_location_slug, excluded.default_location_slug),
		  sort_order = COALESCE(ec_appointment_pages.sort_order, excluded.sort_order)`,
	).run(
		page.id,
		page.id,
		now,
		now,
		now,
		revisionId,
		page.id,
		page.title,
		page.page_title,
		page.route_path,
		page.meta_title,
		page.meta_description,
		page.default_location_slug,
		page.sort_order,
	);
}

for (const dbPath of dbPaths) {
	const db = new Database(dbPath);
	const cards = allLocationsImages();
	const appointmentData = appointmentSourceData();
	db.prepare("DELETE FROM ec_utility_pages WHERE id IN ('about', 'contact')").run();
	for (const page of utilityPages) upsertPublishedUtilityPage(db, page);
	for (const page of aboutPages) upsertPublishedAboutPage(db, page);
	for (const page of contactPages) upsertPublishedContactPage(db, page);
	for (const page of appointmentData.pages) upsertPublishedAppointmentPage(db, page);
	for (const row of db.prepare("SELECT id, name, featured_image FROM ec_locations WHERE deleted_at IS NULL").all()) {
		if (row.featured_image) continue;
		const image = cards.get(row.name);
		if (image) db.prepare("UPDATE ec_locations SET featured_image = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(image), row.id);
	}
	for (const row of db.prepare("SELECT id, slug, scheduler_embed_url FROM ec_locations WHERE deleted_at IS NULL").all()) {
		if (row.scheduler_embed_url) continue;
		const schedulerUrl = appointmentData.schedulerByLocationSlug.get(row.slug);
		if (schedulerUrl) db.prepare("UPDATE ec_locations SET scheduler_embed_url = ?, updated_at = datetime('now') WHERE id = ?").run(schedulerUrl, row.id);
	}
	db.close();
	console.log(`Seeded utility pages and location card images: ${path.relative(root, dbPath)}`);
}
