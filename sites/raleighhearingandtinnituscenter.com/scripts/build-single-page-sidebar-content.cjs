const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const Database = require("better-sqlite3");
const { parseDocument } = require("htmlparser2");
const DomUtils = require("domutils");

const root = path.resolve(__dirname, "..");

const routes = [
	"about",
	"assistive-listening-devices",
	"audiology-services",
	"audiology-services-ear-wax-removal",
	"audiology-services-hearing-aid-fittings",
	"audiology-services-hearing-tests",
	"audiology-services-sensorineural-hearing-loss",
	"audiology-services-tinntus-evaluation-treatment",
	"custom-hearing-protection",
	"hearing-aid-services",
	"hearing-aids-products",
	"hearing-aids-products-hearing-aid-batteries",
	"hearing-aids-oticon",
	"hearing-aids-phonak",
	"hearing-aids-resound",
	"hearing-aids-signia",
	"hearing-aids-starkey",
	"hearing-aids-widex",
	"lenire-tinnitus-treatment-in-raleigh-nc",
	"privacy-policy",
	"resources-insurance",
	"terms-of-service",
	"ear-candles-are-they-safe-and-effective",
	"hearing-aids-for-tinnitus",
	"lenire-side-effects-insurance-and-how-it-compares-with-hearing-aids",
	"swimmers-ear-signs-causes-when-to-see-an-audiologist",
];

const brandRoutes = [
	"hearing-aids-oticon",
	"hearing-aids-phonak",
	"hearing-aids-resound",
	"hearing-aids-signia",
	"hearing-aids-starkey",
	"hearing-aids-widex",
];

const sidebarRoutes = routes.filter((route) => !brandRoutes.includes(route));

const sidebarCollection = {
	slug: "single_page_with_sidebar",
	label: "Single Page with Sidebar",
	labelSingular: "Single Page with Sidebar",
	description: "Internal pages and article-style pages using the shared hero, content, TOC, CTA sidebar, and recent news layout.",
	supports: ["drafts", "revisions"],
	fields: [
		{ slug: "page_title", label: "Page Title", type: "string", required: true },
		{ slug: "route", label: "Route", type: "string", required: true },
		{ slug: "meta_title", label: "Meta Title", type: "text" },
		{ slug: "meta_description", label: "Meta Description", type: "text" },
		{ slug: "body_content", label: "Body Content", type: "portableText" },
	],
};

const brandCollection = {
	slug: "hearing_aid_brands",
	label: "Hearing Aid Brands",
	labelSingular: "Hearing Aid Brand",
	description: "Hearing aid manufacturer pages using the shared internal layout with product images in the body.",
	supports: ["drafts", "revisions"],
	fields: [
		{ slug: "brand_name", label: "Brand Name", type: "string", required: true },
		{ slug: "route", label: "Route", type: "string", required: true },
		{ slug: "meta_title", label: "Meta Title", type: "text" },
		{ slug: "meta_description", label: "Meta Description", type: "text" },
		{ slug: "body_content", label: "Body Content", type: "portableText" },
	],
};

const brandProductImages = {
	"hearing-aids-phonak": [
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Phonak-Infinio-Ultra-300x300.webp", "Phonak Infinio Ultra hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Phonak-Audeo-Sphere-300x300.webp", "Phonak Audéo Sphere hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Phonak-Cros-Infinio-300x300.webp", "Phonak CROS Infinio hearing aid for single-sided hearing loss"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Phonak-Virto-Infinio-300x300.webp", "Phonak Virto Infinio custom in-the-ear hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/phonak-audeo-lumity-300x300.webp", "Phonak Audéo Lumity hearing aid"],
	],
	"hearing-aids-oticon": [
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Oticon-Zeal-300x300.webp", "Oticon Zeal hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Oticon-Intent-trimmed-2-300x154.webp", "Oticon Intent hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Oticon-Jet-PX-2-300x300.webp", "Oticon Jet PX hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Oticon-Real-300x300.webp", "Oticon Real hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Oticon-Own-300x300.webp", "Oticon Own in-the-ear hearing aid"],
	],
	"hearing-aids-resound": [
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/ReSound-Enzo-IA-300x300.webp", "ReSound Enzo hearing aid for severe-to-profound hearing loss"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Resound-Nexia-CBG-300x300.webp", "ReSound Nexia hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Resound-Vivia-1-300x300.webp", "ReSound Vivia hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Resound-Savi-300x300.webp", "ReSound Savi hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Resound-Mini-RIE-CBG-300x300.png", "ReSound Mini RIE hearing aid"],
	],
	"hearing-aids-signia": [
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Signia-Pure-ChargeGo-BCT-IX-300x300.webp", "Signia Pure Charge&Go BCT IX hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Signia_Pure-Charge-Go-AX-1-300x195.webp", "Signia Pure Charge&Go AX hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Pure-Charge-Go-IX-300x300.jpg", "Signia Pure Charge&Go IX hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Signia-Silk-ChargeGo-300x300.webp", "Signia Silk Charge&Go instant-fit hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Signia_Insio-IX-300x300.webp", "Signia Insio IX custom in-the-ear hearing aid"],
	],
	"hearing-aids-starkey": [
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Starkey-Omega-AI-1024x611-1-300x179.jpg", "Starkey Omega AI hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Starkey-Edge-AI-TBG-300x300.webp", "Starkey Edge AI hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Starkey_Genesis_AI_wGlow-transparent-768x768-1-300x300.png", "Starkey Genesis AI hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/signature-series-cic-r-nw-wbst2790-300x270.png", "Starkey Signature Series CIC completely-in-canal hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Evolve-AI-bte-r-product-989x1024-1-290x300.jpg", "Starkey Evolve AI BTE rechargeable hearing aid"],
	],
	"hearing-aids-widex": [
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Widex-Allure-300x300.webp", "Widex Allure hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Widex-SmartRIC-300x300.webp", "Widex SmartRIC hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Widex-Moment-Sheer_RIC-300x300.webp", "Widex Moment Sheer RIC hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Widex-Moment-RIC-300x300.webp", "Widex Moment RIC hearing aid"],
		["https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/02/Moment_BTE-300x300.png", "Widex Moment BTE behind-the-ear hearing aid"],
	],
};

const fieldColumnType = {
	string: "TEXT",
	text: "TEXT",
	url: "TEXT",
	portableText: "JSON",
	repeater: "JSON",
	image: "TEXT",
};

function main() {
	const uploadedBrandImages = resolveBrandImages();
	const sidebarEntries = sidebarRoutes.map(extractRouteEntry);
	const brandEntries = brandRoutes.map((route) => {
		const source = extractRouteEntry(route);
		return {
			...source,
			data: {
				brand_name: source.data.page_title,
				route: source.data.route,
				meta_title: source.data.meta_title,
				meta_description: source.data.meta_description,
				body_content: injectBrandImages(source.data.body_content, uploadedBrandImages[route] ?? []),
			},
		};
	});
	updateSeed(sidebarEntries, brandEntries);
	updateLocalDatabase(sidebarEntries, brandEntries);
	console.log(`Prepared ${sidebarEntries.length} Single Page with Sidebar entries.`);
	console.log(`Prepared ${brandEntries.length} Hearing Aid Brand entries.`);
}

function extractRouteEntry(route) {
	const file = path.join(root, "local-copy", route, "index.html");
	if (!fs.existsSync(file)) throw new Error(`Missing local copy for ${route}`);
	const html = fs.readFileSync(file, "utf8");
	const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
	const title = decodeHtml(stripTags(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""));
	const metaDescription =
		head.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] ??
		head.match(/<meta\s+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)?.[1] ??
		"";
	const h1 = decodeHtml(stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? title));
	const bodyHtml = extractBodyRegion(html, route);
	const bodyContent = htmlToPortableText(bodyHtml);

	return {
		id: route,
		slug: route,
		status: "published",
		data: {
			page_title: h1,
			route: `/${route}/`,
			meta_title: title,
			meta_description: decodeHtml(metaDescription),
			body_content: bodyContent,
		},
	};
}

function extractBodyRegion(html, route) {
	const tocOpen = findWidgetOpening(html, "table-of-contents");
	if (tocOpen < 0) throw new Error(`No table of contents widget found for ${route}`);
	const tocEnd = findMatchingDivEnd(html, tocOpen);
	if (tocEnd < 0) throw new Error(`Could not close TOC widget for ${route}`);

	const sidebarTextCandidates = [
		"Are you ready to hear and be heard?",
		"Or give us a call at:",
		"Recent News",
	];
	const sidebarTextIndex = sidebarTextCandidates
		.map((needle) => html.indexOf(needle, tocEnd))
		.filter((index) => index >= 0)
		.sort((a, b) => a - b)[0];
	if (sidebarTextIndex === undefined) throw new Error(`No sidebar marker found for ${route}`);

	const sidebarStart = findSidebarColumnStart(html, tocEnd, sidebarTextIndex);
	if (sidebarStart < 0 || sidebarStart <= tocEnd) {
		throw new Error(`Could not find sidebar boundary for ${route}`);
	}
	const contentEnd = findContentColumnCloseStart(html, tocEnd, sidebarStart);

	return html.slice(tocEnd, contentEnd).trim();
}

function findWidgetOpening(html, widgetType) {
	const attrIndex = html.search(new RegExp(`data-widget_type=["']${escapeRegExp(widgetType)}\\.default["']`, "i"));
	if (attrIndex < 0) return -1;
	return html.lastIndexOf("<div", attrIndex);
}

function findSidebarColumnStart(html, contentStart, markerIndex) {
	const starts = [];
	const divRe = /<div\b[^>]*>/gi;
	let match;
	while ((match = divRe.exec(html)) && match.index < markerIndex) {
		if (match.index <= contentStart) continue;
		const end = findMatchingDivEnd(html, match.index);
		if (end > markerIndex) starts.push(match.index);
	}
	if (starts.length === 0) return -1;
	return starts[0];
}

function findContentColumnCloseStart(html, contentStart, sidebarStart) {
	const closeStart = html.lastIndexOf("</div>", sidebarStart);
	if (closeStart > contentStart) return closeStart;
	return sidebarStart;
}

function findMatchingDivEnd(html, startIndex) {
	const tagRe = /<\/?div\b[^>]*>/gi;
	tagRe.lastIndex = startIndex;
	let depth = 0;
	let match;
	while ((match = tagRe.exec(html))) {
		if (match[0][1] === "/") {
			depth -= 1;
			if (depth === 0) return tagRe.lastIndex;
		} else {
			depth += 1;
		}
	}
	return -1;
}

function htmlToPortableText(html) {
	const doc = parseDocument(`<div>${html}</div>`, { decodeEntities: true });
	const rootNode = DomUtils.findOne((node) => node.name === "div", doc.children, true);
	const blocks = [];
	walkSemantic(rootNode?.children ?? [], blocks, null, 1);
	return blocks;
}

function walkSemantic(nodes, blocks, listType, listLevel, detailsLevel = 0) {
	for (const node of nodes) {
		if (node.type === "text") {
			const text = normalizeTextNode(node.data);
			if (text) blocks.push(blockFromText(text, "normal"));
			continue;
		}
		if (!isTag(node)) continue;
		const name = node.name.toLowerCase();
		if (name === "details") {
			const summary = DomUtils.findOne((item) => isTag(item) && item.name.toLowerCase() === "summary", node.children ?? [], true);
			const title = normalizeTextNode(summary ? DomUtils.textContent(summary) : "");
			if (title) blocks.push(blockFromText(title, detailsLevel > 0 ? "h4" : "h3"));
			walkSemantic(
				(node.children ?? []).filter((item) => !(isTag(item) && item.name.toLowerCase() === "summary")),
				blocks,
				listType,
				listLevel,
				detailsLevel + 1,
			);
			continue;
		}
		if (name === "summary") continue;
		if (name === "h1") continue;
		if (/^h[2-6]$/.test(name)) {
			const block = blockFromNode(node, name);
			if (hasText(block)) blocks.push(block);
			continue;
		}
		if (name === "p") {
			const block = blockFromNode(node, "normal");
			if (hasText(block)) blocks.push(block);
			continue;
		}
		if (name === "ul" || name === "ol") {
			for (const child of node.children ?? []) {
				if (isTag(child) && child.name.toLowerCase() === "li") {
					const block = blockFromNode(child, "normal");
					if (hasText(block)) {
						block.listItem = name === "ol" ? "number" : "bullet";
						block.level = listLevel;
						blocks.push(block);
					}
					walkSemantic(
						(child.children ?? []).filter((item) => isTag(item) && ["ul", "ol"].includes(item.name.toLowerCase())),
						blocks,
						name,
						listLevel + 1,
						detailsLevel,
					);
				}
			}
			continue;
		}
		if (name === "img") {
			const src = normalizeAssetPath(node.attribs?.src ?? "");
			if (src) {
				blocks.push({
					_type: "image",
					_key: key("img"),
					asset: {
						_type: "reference",
						_ref: src,
						url: src,
					},
					alt: decodeHtml(node.attribs?.alt ?? ""),
				});
			}
			continue;
		}
		if (name === "figure") {
			const image = DomUtils.findOne((item) => isTag(item) && item.name.toLowerCase() === "img", node.children ?? [], true);
			if (image) {
				const src = normalizeAssetPath(image.attribs?.src ?? "");
				if (src) {
					blocks.push({
						_type: "image",
						_key: key("img"),
						asset: {
							_type: "reference",
							_ref: src,
							url: src,
						},
						alt: decodeHtml(image.attribs?.alt ?? ""),
					});
				}
			}
			continue;
		}
		walkSemantic(node.children ?? [], blocks, listType, listLevel, detailsLevel);
	}
}

function blockFromText(text, style) {
	return {
		_type: "block",
		_key: key("b"),
		style,
		children: [{ _type: "span", _key: key("s"), text, marks: [] }],
		markDefs: [],
	};
}

function blockFromNode(node, style) {
	const markDefs = [];
	const children = inlineChildren(node.children ?? [], [], markDefs);
	return {
		_type: "block",
		_key: key("b"),
		style,
		children: mergeSpans(children),
		markDefs,
	};
}

function inlineChildren(nodes, activeMarks, markDefs) {
	const spans = [];
	for (const node of nodes) {
		if (node.type === "text") {
			const text = node.data.replace(/\s+/g, " ");
			if (text) {
				spans.push({
					_type: "span",
					_key: key("s"),
					text,
					marks: [...activeMarks],
				});
			}
			continue;
		}
		if (!isTag(node)) continue;
		const name = node.name.toLowerCase();
		if (name === "br") {
			spans.push({ _type: "span", _key: key("s"), text: "\n", marks: [...activeMarks] });
			continue;
		}
		if (name === "img") continue;

		let nextMarks = [...activeMarks];
		if (["strong", "b"].includes(name)) nextMarks.push("strong");
		if (["em", "i"].includes(name)) nextMarks.push("em");
		if (name === "code") nextMarks.push("code");
		if (name === "u") nextMarks.push("underline");
		if (name === "s" || name === "strike") nextMarks.push("strike-through");
		if (name === "a" && node.attribs?.href) {
			const linkKey = key("link");
			markDefs.push({
				_type: "link",
				_key: linkKey,
				href: normalizeHref(node.attribs.href),
				blank: node.attribs.target === "_blank",
			});
			nextMarks.push(linkKey);
		}
		spans.push(...inlineChildren(node.children ?? [], nextMarks, markDefs));
	}
	return spans;
}

function mergeSpans(spans) {
	const merged = [];
	for (const span of spans) {
		if (!span.text) continue;
		const previous = merged[merged.length - 1];
		if (previous && JSON.stringify(previous.marks) === JSON.stringify(span.marks)) {
			previous.text += span.text;
		} else {
			merged.push(span);
		}
	}
	if (merged[0]) merged[0].text = merged[0].text.replace(/^\s+/, "");
	if (merged[merged.length - 1]) merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/\s+$/, "");
	return merged.filter((span) => span.text);
}

function hasText(block) {
	return block.children?.some((span) => span.text.trim()) ?? false;
}

function updateSeed(sidebarEntries, brandEntries) {
	const seedPath = path.join(root, "seed", "seed.json");
	const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
	upsertSeedCollection(seed, sidebarCollection);
	upsertSeedCollection(seed, brandCollection);
	seed.content = seed.content ?? {};
	seed.content[sidebarCollection.slug] = sidebarEntries;
	seed.content[brandCollection.slug] = brandEntries;
	fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);
}

function upsertSeedCollection(seed, collection) {
	const collectionIndex = seed.collections.findIndex((item) => item.slug === collection.slug);
	if (collectionIndex >= 0) seed.collections[collectionIndex] = collection;
	else seed.collections.push(collection);
}

function updateLocalDatabase(sidebarEntries, brandEntries) {
	const dbPath = findLocalD1Database();
	if (!dbPath) {
		console.warn("No local D1 sqlite database found. Seed file was updated only.");
		return;
	}
	const backupPath = dbPath.replace(/\.sqlite$/, `.backup-before-single-page-sidebar-${Date.now()}.sqlite`);
	fs.copyFileSync(dbPath, backupPath);
	const db = new Database(dbPath);
	const run = db.transaction(() => {
		upsertCollection(db, sidebarCollection);
		upsertCollection(db, brandCollection);
		ensureContentTable(db, sidebarCollection);
		ensureContentTable(db, brandCollection);
		for (const route of brandRoutes) deleteEntry(db, sidebarCollection, route);
		for (const entry of sidebarEntries) upsertEntry(db, sidebarCollection, entry);
		for (const entry of brandEntries) upsertEntry(db, brandCollection, entry);
	});
	run();
	db.close();
	console.log(`Updated local D1 database: ${path.relative(root, dbPath)}`);
	console.log(`Backup written: ${path.relative(root, backupPath)}`);
}

function upsertCollection(db, collection) {
	const existing = db.prepare("SELECT id FROM _emdash_collections WHERE slug = ?").get(collection.slug);
	const collectionId = existing?.id ?? ulid();
	db.prepare(`
		INSERT INTO _emdash_collections (id, slug, label, label_singular, description, supports, created_at, updated_at)
		VALUES (@id, @slug, @label, @labelSingular, @description, @supports, datetime('now'), datetime('now'))
		ON CONFLICT(slug) DO UPDATE SET
			label = excluded.label,
			label_singular = excluded.label_singular,
			description = excluded.description,
			supports = excluded.supports,
			updated_at = datetime('now')
	`).run({
		id: collectionId,
		slug: collection.slug,
		label: collection.label,
		labelSingular: collection.labelSingular,
		description: collection.description,
		supports: JSON.stringify(collection.supports),
	});

	db.prepare("DELETE FROM _emdash_fields WHERE collection_id = ?").run(collectionId);
	const insertField = db.prepare(`
		INSERT INTO _emdash_fields (id, collection_id, slug, label, type, column_type, required, sort_order, created_at, searchable, translatable)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 1)
	`);
	collection.fields.forEach((field, index) => {
		insertField.run(
			ulid(),
			collectionId,
			field.slug,
			field.label,
			field.type,
			fieldColumnType[field.type] ?? "TEXT",
			field.required ? 1 : 0,
			index,
			field.slug === "body_content" || field.slug === "page_title" ? 1 : 0,
		);
	});
}

function ensureContentTable(db, collection) {
	if (collection.slug === brandCollection.slug) {
		db.prepare(`
			CREATE TABLE IF NOT EXISTS ec_hearing_aid_brands (
				id text primary key,
				slug text,
				status text default 'draft',
				author_id text,
				primary_byline_id text,
				created_at text default (datetime('now')),
				updated_at text default (datetime('now')),
				published_at text,
				scheduled_at text,
				deleted_at text,
				version integer default 1,
				live_revision_id text references revisions (id),
				draft_revision_id text references revisions (id),
				locale text default 'en' not null,
				translation_group text,
				brand_name TEXT NOT NULL DEFAULT '',
				route TEXT NOT NULL DEFAULT '',
				meta_title TEXT,
				meta_description TEXT,
				body_content JSON,
				constraint ec_hearing_aid_brands_slug_locale_unique unique (slug, locale)
			)
		`).run();
		return;
	}
	db.prepare(`
		CREATE TABLE IF NOT EXISTS ec_single_page_with_sidebar (
			id text primary key,
			slug text,
			status text default 'draft',
			author_id text,
			primary_byline_id text,
			created_at text default (datetime('now')),
			updated_at text default (datetime('now')),
			published_at text,
			scheduled_at text,
			deleted_at text,
			version integer default 1,
			live_revision_id text references revisions (id),
			draft_revision_id text references revisions (id),
			locale text default 'en' not null,
			translation_group text,
			page_title TEXT NOT NULL DEFAULT '',
			route TEXT NOT NULL DEFAULT '',
			meta_title TEXT,
			meta_description TEXT,
			body_content JSON,
			constraint ec_single_page_with_sidebar_slug_locale_unique unique (slug, locale)
		)
	`).run();
}

function upsertEntry(db, collection, entry) {
	const table = `ec_${collection.slug}`;
	const existing = db.prepare(`SELECT id, version FROM ${table} WHERE slug = ? AND locale = 'en'`).get(entry.slug);
	const id = existing?.id ?? ulid();
	const revisionId = ulid();
	const publishedAt = new Date().toISOString();
	const dataJson = JSON.stringify(entry.data);

	db.prepare(`
		INSERT INTO revisions (id, collection, entry_id, data, created_at)
		VALUES (?, ?, ?, ?, datetime('now'))
	`).run(revisionId, collection.slug, id, dataJson);

	if (collection.slug === brandCollection.slug) {
		db.prepare(`
			INSERT INTO ec_hearing_aid_brands (
				id, slug, status, created_at, updated_at, published_at, version, live_revision_id, locale,
				brand_name, route, meta_title, meta_description, body_content
			)
			VALUES (
				@id, @slug, 'published', datetime('now'), datetime('now'), @publishedAt, 1, @revisionId, 'en',
				@brandName, @route, @metaTitle, @metaDescription, @bodyContent
			)
			ON CONFLICT(slug, locale) DO UPDATE SET
				status = 'published',
				updated_at = datetime('now'),
				published_at = COALESCE(ec_hearing_aid_brands.published_at, excluded.published_at),
				version = ec_hearing_aid_brands.version + 1,
				live_revision_id = excluded.live_revision_id,
				draft_revision_id = null,
				brand_name = excluded.brand_name,
				route = excluded.route,
				meta_title = excluded.meta_title,
				meta_description = excluded.meta_description,
				body_content = excluded.body_content
		`).run({
			id,
			slug: entry.slug,
			publishedAt,
			revisionId,
			brandName: entry.data.brand_name,
			route: entry.data.route,
			metaTitle: entry.data.meta_title,
			metaDescription: entry.data.meta_description,
			bodyContent: JSON.stringify(entry.data.body_content),
		});
		return;
	}

	db.prepare(`
		INSERT INTO ec_single_page_with_sidebar (
			id, slug, status, created_at, updated_at, published_at, version, live_revision_id, locale,
			page_title, route, meta_title, meta_description, body_content
		)
		VALUES (
			@id, @slug, 'published', datetime('now'), datetime('now'), @publishedAt, 1, @revisionId, 'en',
			@pageTitle, @route, @metaTitle, @metaDescription, @bodyContent
		)
		ON CONFLICT(slug, locale) DO UPDATE SET
			status = 'published',
			updated_at = datetime('now'),
			published_at = COALESCE(ec_single_page_with_sidebar.published_at, excluded.published_at),
			version = ec_single_page_with_sidebar.version + 1,
			live_revision_id = excluded.live_revision_id,
			draft_revision_id = null,
			page_title = excluded.page_title,
			route = excluded.route,
			meta_title = excluded.meta_title,
			meta_description = excluded.meta_description,
			body_content = excluded.body_content
	`).run({
		id,
		slug: entry.slug,
		publishedAt,
		revisionId,
		pageTitle: entry.data.page_title,
		route: entry.data.route,
		metaTitle: entry.data.meta_title,
		metaDescription: entry.data.meta_description,
		bodyContent: JSON.stringify(entry.data.body_content),
	});
}

function deleteEntry(db, collection, slug) {
	const table = `ec_${collection.slug}`;
	const row = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug);
	if (!row) return;
	db.prepare(`DELETE FROM ${table} WHERE slug = ?`).run(slug);
	db.prepare("DELETE FROM revisions WHERE collection = ? AND entry_id = ?").run(collection.slug, row.id);
}

function findLocalD1Database() {
	const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1");
	if (!fs.existsSync(d1Dir)) return null;
	const files = [];
	collectFiles(d1Dir, files);
	return files
		.filter((file) => file.endsWith(".sqlite") && !path.basename(file).startsWith("metadata") && !file.includes(".backup-"))
		.map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
		.sort((a, b) => b.mtime - a.mtime)[0]?.file;
}

function collectFiles(dir, files) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) collectFiles(full, files);
		else files.push(full);
	}
}

function normalizeAssetPath(value) {
	if (!value) return "";
	if (/^(https?:|data:|\/)/.test(value)) return value;
	return `/${value.replace(/^(\.\.\/)+/, "")}`;
}

function normalizeHref(value) {
	if (!value) return "";
	if (/^(https?:|mailto:|tel:|#|\/)/.test(value)) return value;
	return `/${value.replace(/^(\.\.\/)+/, "").replace(/index\.html$/, "")}`;
}

function normalizeTextNode(value) {
	return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function injectBrandImages(blocks, images) {
	if (!images.length) return blocks;
	const output = [];
	let imageIndex = 0;
	let inModels = false;
	for (const block of blocks) {
		output.push(block);
		if (block._type === "block") {
			const text = (block.children ?? []).map((child) => child.text ?? "").join("");
			if (block.style === "h2") inModels = /models we offer/i.test(text);
			else if (inModels && block.style === "h3" && imageIndex < images.length) {
				const image = images[imageIndex];
				imageIndex += 1;
				output.push({
					_type: "image",
					_key: key("brandimg"),
					asset: {
						_type: "reference",
						_ref: image.id ?? image.src,
						url: image.src,
					},
					alt: image.alt,
				});
			} else if (inModels && block.style === "h2") {
				inModels = false;
			}
		}
	}
	return output;
}

function resolveBrandImages() {
	const dbPath = findLocalD1Database();
	const existingByFilename = {};
	if (dbPath) {
		const db = new Database(dbPath);
		try {
			for (const media of db.prepare("SELECT id, filename, storage_key FROM media").all()) {
				existingByFilename[media.filename] = {
					id: media.id,
					src: `/_emdash/api/media/file/${media.storage_key}`,
				};
			}
		} catch {}
		db.close();
	}

	const resolved = {};
	for (const [route, images] of Object.entries(brandProductImages)) {
		resolved[route] = images.map(([url, alt]) => {
			const filename = path.basename(new URL(url).pathname);
			let media = existingByFilename[filename];
			if (!media) {
				media = uploadBrandImage(url, alt, filename);
				if (media?.src) existingByFilename[filename] = media;
			}
			return { id: media?.id, src: media?.src ?? url, alt };
		});
	}
	return resolved;
}

function uploadBrandImage(url, alt, filename) {
	const tempDir = path.join(root, ".tmp-brand-media");
	fs.mkdirSync(tempDir, { recursive: true });
	const target = path.join(tempDir, filename);
	if (!fs.existsSync(target)) {
		const response = execFileSync("powershell", [
			"-NoProfile",
			"-Command",
			`Invoke-WebRequest -Uri ${JSON.stringify(url)} -OutFile ${JSON.stringify(target)}`,
		]);
	}
	try {
		const command = process.platform === "win32" ? "cmd" : "npx";
		const args = process.platform === "win32"
			? ["/c", "npx", "emdash", "media", "upload", target, "--alt", alt, "--json"]
			: ["emdash", "media", "upload", target, "--alt", alt, "--json"];
		const output = execFileSync(
			command,
			args,
			{ cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
		);
		const jsonStart = output.indexOf("{");
		if (jsonStart >= 0) {
			const media = JSON.parse(output.slice(jsonStart));
			return { id: media.id, src: media.url };
		}
	} catch (error) {
		console.warn(`Could not upload ${filename}; falling back to live URL.`);
	}
	return null;
}

function isTag(node) {
	return node && node.type === "tag";
}

function stripTags(value) {
	return value.replace(/<[^>]*>/g, " ");
}

function decodeHtml(value) {
	return value
		.replace(/&nbsp;/g, " ")
		.replace(/&#8217;|&rsquo;/g, "'")
		.replace(/&#8220;|&ldquo;/g, '"')
		.replace(/&#8221;|&rdquo;/g, '"')
		.replace(/&#038;|&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let keyIndex = 0;
function key(prefix) {
	keyIndex += 1;
	return `${prefix}${keyIndex.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function ulid() {
	const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
	let value = "";
	for (let i = 0; i < 26; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
	return value;
}

main();
