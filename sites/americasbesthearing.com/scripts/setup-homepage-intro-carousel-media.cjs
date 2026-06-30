const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const Database = require("better-sqlite3");

const root = process.cwd();
const mediaRoot = path.join(root, "public", "assets", "media");
const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const d1Path = fs
	.readdirSync(d1Dir)
	.filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite")
	.map((file) => path.join(d1Dir, file))[0];

if (!d1Path) throw new Error("Could not find local D1 database.");

const entries = [
	{
		slug: "intro-carousel-lake-wales-sebring-team",
		title: "Lake Wales and Sebring Team",
		filename: "americas-best-hearing-lake-wales-sebring-fl-team-b97ca1cf94.webp",
		alt: "Three women in black scrubs smiling in office waiting area",
		sort_order: 1,
	},
	{
		slug: "intro-carousel-lansing-team",
		title: "Lansing Team",
		filename: "americas-best-hearing-lansing-mi-team-a7db79b29a.webp",
		alt: "Man and woman team members outside Americas Best Hearing storefront",
		sort_order: 2,
	},
	{
		slug: "intro-carousel-office-background",
		title: "America's Best Hearing Office",
		filename: "americas-best-hearing-background-image-01-22b529a78a.webp",
		alt: "America's Best Hearing office background",
		sort_order: 3,
	},
];

function randomId() {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase();
}

function mediaByFilename(db, filename) {
	return db.prepare("SELECT * FROM media WHERE filename = ? AND status = 'ready' ORDER BY created_at DESC LIMIT 1").get(filename);
}

function mediaValue(row, alt) {
	return {
		provider: "local",
		id: row.id,
		src: `/_emdash/api/media/file/${row.storage_key}`,
		alt: alt || row.alt || undefined,
		width: row.width || undefined,
		height: row.height || undefined,
		mimeType: row.mime_type,
		filename: row.filename,
		meta: { storageKey: row.storage_key },
	};
}

function uploadToD1Media() {
	const db = new Database(d1Path);
	for (const entry of entries) {
		const filePath = path.join(mediaRoot, entry.filename);
		if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);

		let media = mediaByFilename(db, entry.filename);
		if (!media) {
			execFileSync(
				process.execPath,
				[path.join(root, "node_modules", "emdash", "dist", "cli", "index.mjs"), "media", "upload", filePath, "--url", "http://localhost:4321", "--json"],
				{ cwd: root, stdio: "pipe" },
			);
			media = mediaByFilename(db, entry.filename);
		}
		if (!media) throw new Error(`Media upload failed for ${entry.filename}`);
		if (entry.alt && media.alt !== entry.alt) {
			db.prepare("UPDATE media SET alt = ? WHERE id = ?").run(entry.alt, media.id);
		}
	}
	db.close();
}

function syncMediaRows(targetDbPath, sourceRowsByFilename) {
	const target = new Database(targetDbPath);
	const tx = target.transaction(() => {
		const existing = new Set(target.prepare("SELECT id FROM media").all().map((row) => row.id));
		const insert = target.prepare(`
			INSERT INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color)
			VALUES (@id, @filename, @mime_type, @size, @width, @height, @alt, @caption, @storage_key, @content_hash, @created_at, @author_id, @status, @blurhash, @dominant_color)
		`);
		for (const row of sourceRowsByFilename.values()) {
			if (!existing.has(row.id)) insert.run(row);
		}
	});
	tx();
	target.close();
}

function upsertHomepageImages(dbPath, mediaRowsByFilename) {
	const db = new Database(dbPath);
	const now = new Date().toISOString();
	const collection = db.prepare("SELECT id FROM _emdash_collections WHERE slug = 'homepage_images'").get();
	if (!collection) throw new Error(`Missing collection 'homepage_images' in ${dbPath}`);

	const tx = db.transaction(() => {
		const findBySlug = db.prepare("SELECT id FROM ec_homepage_images WHERE slug = ?");
		const updateEntry = db.prepare(`
			UPDATE ec_homepage_images
			SET status = 'published', updated_at = ?, published_at = ?, title = ?, image = ?, sort_order = ?, live_revision_id = ?
			WHERE id = ?
		`);
		const insertEntry = db.prepare(`
			INSERT INTO ec_homepage_images
			(id, slug, status, created_at, updated_at, published_at, version, live_revision_id, locale, title, image, sort_order)
			VALUES (?, ?, 'published', ?, ?, ?, 1, ?, 'en', ?, ?, ?)
		`);
		const insertRevision = db.prepare(`
			INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
			VALUES (?, 'homepage_images', ?, ?, NULL, ?)
		`);

		for (const entry of entries) {
			const mediaRow = mediaRowsByFilename.get(entry.filename);
			if (!mediaRow) throw new Error(`Missing media row for ${entry.filename}`);
			const image = mediaValue(mediaRow, entry.alt);
			const revisionId = randomId();
			const data = JSON.stringify({
				title: entry.title,
				image,
				sort_order: entry.sort_order,
			});

			const existing = findBySlug.get(entry.slug);
			if (existing?.id) {
				insertRevision.run(revisionId, existing.id, data, now);
				updateEntry.run(now, now, entry.title, JSON.stringify(image), entry.sort_order, revisionId, existing.id);
			} else {
				const id = randomId();
				insertRevision.run(revisionId, id, data, now);
				insertEntry.run(id, entry.slug, now, now, now, revisionId, entry.title, JSON.stringify(image), entry.sort_order);
			}
		}
	});

	tx();
	const count = db.prepare("SELECT COUNT(*) AS count FROM ec_homepage_images").get().count;
	db.close();
	return count;
}

uploadToD1Media();

const d1Read = new Database(d1Path, { readonly: true });
const mediaRowsByFilename = new Map(entries.map((entry) => [entry.filename, mediaByFilename(d1Read, entry.filename)]));
d1Read.close();

for (const [filename, row] of mediaRowsByFilename.entries()) {
	if (!row) throw new Error(`Missing uploaded media in D1 for ${filename}`);
}

syncMediaRows(path.join(root, "data.db"), mediaRowsByFilename);
const localCount = upsertHomepageImages(path.join(root, "data.db"), mediaRowsByFilename);
const d1Count = upsertHomepageImages(d1Path, mediaRowsByFilename);

console.log(`Homepage intro carousel media ready. homepage_images count: data.db=${localCount}, d1=${d1Count}`);
