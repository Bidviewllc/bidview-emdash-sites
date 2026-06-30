const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const ROOT = process.cwd();
const SEED_PATH = path.join(ROOT, "seed", "seed.json");
const DB_PATH = findEmDashDatabase();

const STAFF = [
	"dr-danielle-jenkins",
	"dr-katherine-baker",
	"dr-michelle-miller",
	"lisa-rummel",
	"sam-edwards",
];

const TEXTAREA = new Set(["script", "style"]);

function main() {
	const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
	const staffCollection = seed.collections.find((collection) => collection.slug === "staff");
	if (!staffCollection) throw new Error("Missing staff collection in seed");

	ensureSeedField(staffCollection, {
		slug: "meta_title",
		label: "Meta Title",
		type: "text",
	});
	ensureSeedField(staffCollection, {
		slug: "meta_description",
		label: "Meta Description",
		type: "text",
	});
	const bioField = staffCollection.fields.find((field) => field.slug === "bio");
	if (bioField) {
		bioField.label = "Bio";
		bioField.type = "portableText";
		bioField.searchable = true;
	}

	const extracted = new Map();
	for (const slug of STAFF) {
		extracted.set(slug, extractStaffPage(slug));
	}

	for (const entry of seed.content.staff ?? []) {
		const profile = extracted.get(entry.slug);
		if (!profile) continue;
		entry.data.meta_title = profile.metaTitle;
		entry.data.meta_description = profile.metaDescription;
		entry.data.bio = htmlToPortableText(profile.bioHtml);
	}

	fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + "\n");

	if (DB_PATH && fs.existsSync(DB_PATH)) {
		updateDatabase(extracted);
	}
}

function ensureSeedField(collection, field) {
	if (collection.fields.some((existing) => existing.slug === field.slug)) return;
	const bioIndex = collection.fields.findIndex((existing) => existing.slug === "bio");
	const insertAt = bioIndex >= 0 ? bioIndex : collection.fields.length;
	collection.fields.splice(insertAt, 0, field);
}

function extractStaffPage(slug) {
	const filePath = path.join(ROOT, "local-copy", "audiologist", slug, "index.html");
	const html = fs.readFileSync(filePath, "utf8");
	const metaTitle = extractFirst(html, /<title>([\s\S]*?)<\/title>/i);
	const metaDescription = extractFirst(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
	const contentWidget = extractWidgetByType(html, "theme-post-content.default");
	if (!contentWidget) throw new Error(`Missing profile content widget for ${slug}`);
	const bioHtml = extractFirst(contentWidget, /<div class="astro-widget-container">([\s\S]*)<\/div>\s*$/i);
	if (!bioHtml.trim()) throw new Error(`Empty profile content widget for ${slug}`);
	return {
		metaTitle: decodeHtml(metaTitle),
		metaDescription: decodeHtml(metaDescription),
		bioHtml,
	};
}

function extractWidgetByType(html, widgetType) {
	const marker = `data-widget_type="${widgetType}"`;
	const markerIndex = html.indexOf(marker);
	if (markerIndex < 0) return "";
	const start = html.lastIndexOf("<div", markerIndex);
	const end = findClosingDivEnd(html, start);
	return end > start ? html.slice(start, end) : "";
}

function findClosingDivEnd(html, startIndex) {
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

function extractFirst(html, pattern) {
	return html.match(pattern)?.[1] ?? "";
}

function htmlToPortableText(html) {
	const tokens = tokenize(html);
	const blocks = [];
	const stack = [];
	let current = null;
	let listType = null;

	const flush = () => {
		if (!current) return;
		current.children = mergeAdjacentSpans(current.children);
		if (blockText(current).trim() || current._type !== "block") blocks.push(current);
		current = null;
	};

	for (const token of tokens) {
		if (token.type === "text") {
			if (!current) current = block("normal", listType);
			const text = normalizeText(decodeHtml(token.value));
			if (text) current.children.push(span(text, stack));
			continue;
		}

		const tag = token.name;
		if (!tag || TEXTAREA.has(tag)) continue;

		if (!token.closing) {
			if (tag === "p" || isHeading(tag)) {
				flush();
				current = block(isHeading(tag) ? tag : "normal", listType);
				continue;
			}
			if (tag === "ul" || tag === "ol") {
				flush();
				listType = tag === "ol" ? "number" : "bullet";
				continue;
			}
			if (tag === "li") {
				flush();
				current = block("normal", listType ?? "bullet");
				continue;
			}
			if (tag === "br") {
				if (!current) current = block("normal", listType);
				current.children.push(span("\n", stack));
				continue;
			}
			const mark = tagToMark(tag);
			if (mark) stack.push(mark);
			continue;
		}

		if (tag === "p" || tag === "li" || isHeading(tag)) {
			flush();
			continue;
		}
		if (tag === "ul" || tag === "ol") {
			flush();
			listType = null;
			continue;
		}
		const mark = tagToMark(tag);
		if (mark) {
			const index = stack.lastIndexOf(mark);
			if (index >= 0) stack.splice(index, 1);
		}
	}
	flush();
	return blocks;
}

function tokenize(html) {
	const tokens = [];
	const re = /<\/?([a-zA-Z0-9]+)(?:\s[^>]*)?>|([^<]+)/g;
	let match;
	while ((match = re.exec(html))) {
		if (match[2] !== undefined) {
			tokens.push({ type: "text", value: match[2] });
		} else {
			tokens.push({
				type: "tag",
				name: match[1].toLowerCase(),
				closing: match[0].startsWith("</"),
			});
		}
	}
	return tokens;
}

function block(style, listItem) {
	const item = {
		_type: "block",
		_key: key(),
		style,
		markDefs: [],
		children: [],
	};
	if (listItem) item.listItem = listItem;
	return item;
}

function span(text, marks) {
	return {
		_type: "span",
		_key: key(),
		text,
		marks: [...marks],
	};
}

function mergeAdjacentSpans(children) {
	const merged = [];
	for (const child of children) {
		const previous = merged[merged.length - 1];
		if (previous && JSON.stringify(previous.marks) === JSON.stringify(child.marks)) {
			previous.text += child.text;
		} else {
			merged.push(child);
		}
	}
	return merged.map((child) => ({ ...child, text: child.text.replace(/\n{3,}/g, "\n\n") }));
}

function blockText(block) {
	return block.children?.map((child) => child.text ?? "").join("") ?? "";
}

function isHeading(tag) {
	return /^h[2-6]$/.test(tag);
}

function tagToMark(tag) {
	if (tag === "strong" || tag === "b") return "strong";
	if (tag === "em" || tag === "i") return "em";
	if (tag === "code") return "code";
	return "";
}

function normalizeText(value) {
	return value
		.replace(/\r/g, "")
		.replace(/\t/g, " ")
		.replace(/ +/g, " ")
		.replace(/\n[ \n]+/g, "\n")
		.replace(/^\n+|\n+$/g, "");
}

function decodeHtml(value) {
	return value
		.replace(/&nbsp;/g, " ")
		.replace(/&#038;/g, "&")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&rsquo;|&#8217;/g, "'")
		.replace(/&lsquo;|&#8216;/g, "'")
		.replace(/&ldquo;|&#8220;/g, '"')
		.replace(/&rdquo;|&#8221;/g, '"')
		.replace(/&ndash;|&#8211;/g, "-")
		.replace(/&mdash;|&#8212;/g, "-")
		.replace(/â€™/g, "'")
		.replace(/Â©/g, "©");
}

function key() {
	return Math.random().toString(36).slice(2, 12);
}

function updateDatabase(extracted) {
	const backupPath = DB_PATH.replace(/\.sqlite$|\.db$/, "") + `.backup-before-staff-pages-${Date.now()}.sqlite`;
	fs.copyFileSync(DB_PATH, backupPath);
	const db = new Database(DB_PATH);
	const collection = db.prepare("SELECT id FROM _emdash_collections WHERE slug = ?").get("staff");
	if (!collection) throw new Error("Missing staff collection in database");

	ensureDbField(db, collection.id, "meta_title", "Meta Title", "text", "text", 3);
	ensureDbField(db, collection.id, "meta_description", "Meta Description", "text", "text", 4);
	ensureDbColumn(db, "ec_staff", "meta_title", "TEXT");
	ensureDbColumn(db, "ec_staff", "meta_description", "TEXT");
	ensureDbColumn(db, "ec_staff", "bio", "TEXT");

	const rows = db.prepare("SELECT id, slug, version FROM ec_staff").all();
	const update = db.prepare(`
		UPDATE ec_staff
		SET meta_title = ?, meta_description = ?, bio = ?, version = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	const tx = db.transaction(() => {
		for (const row of rows) {
			const profile = extracted.get(row.slug);
			if (!profile) continue;
			update.run(
				profile.metaTitle,
				profile.metaDescription,
				JSON.stringify(htmlToPortableText(profile.bioHtml)),
				Number(row.version ?? 1) + 1,
				row.id,
			);
		}
	});
	tx();
	db.close();
	console.log(`Updated local EmDash database: ${DB_PATH}`);
	console.log(`Backup created: ${backupPath}`);
}

function ensureDbField(db, collectionId, slug, label, type, columnType, sortOrder) {
	const existing = db.prepare("SELECT id FROM _emdash_fields WHERE collection_id = ? AND slug = ?").get(collectionId, slug);
	if (existing) {
		db.prepare(`
			UPDATE _emdash_fields
			SET label = ?, type = ?, column_type = ?
			WHERE collection_id = ? AND slug = ?
		`).run(label, type, columnType, collectionId, slug);
		return;
	}
	db.prepare(`
		INSERT INTO _emdash_fields
			(id, collection_id, slug, label, type, column_type, required, sort_order, created_at, searchable, translatable)
		VALUES
			(?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, 0, 1)
	`).run(`field_staff_${slug}`, collectionId, slug, label, type, columnType, sortOrder);
}

function ensureDbColumn(db, table, column, type) {
	const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((info) => info.name === column);
	if (exists) return;
	db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
}

function findEmDashDatabase() {
	const candidates = [
		path.join(ROOT, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject"),
		ROOT,
	];
	for (const directory of candidates) {
		if (!fs.existsSync(directory)) continue;
		const files = fs
			.readdirSync(directory)
			.filter((file) => /\.(sqlite|db)$/.test(file) && !file.includes("backup") && file !== "metadata.sqlite")
			.map((file) => path.join(directory, file))
			.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
		for (const file of files) {
			try {
				const db = new Database(file, { readonly: true });
				const hasStaff = db
					.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ec_staff'")
					.get();
				const hasCollections = db
					.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_emdash_collections'")
					.get();
				db.close();
				if (hasStaff && hasCollections) return file;
			} catch {
				// Keep looking.
			}
		}
	}
	return "";
}

main();
