const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { load } = require("cheerio");
const Database = require("better-sqlite3");

const root = process.cwd();
const rawRoot = path.join(root, "src", "components", "raw-pages");
const mediaRoot = path.join(root, "public", "assets", "media");
const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const d1Path = fs
	.readdirSync(d1Dir)
	.filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite")
	.map((file) => path.join(d1Dir, file))[0];

if (!d1Path) throw new Error("Could not find local D1 database.");

function randomId() {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase();
}

function filenameFromPath(value) {
	return path.basename(String(value || "").replace(/^(\.\.\/|\/)?assets\/media\//, ""));
}

function mimeType(filename) {
	const ext = path.extname(filename).toLowerCase();
	if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
	if (ext === ".png") return "image/png";
	return "image/webp";
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

function locationEntries() {
	return fs
		.readdirSync(rawRoot)
		.filter((file) => file.startsWith("audiologist-hearing-aids-") && file.endsWith(".html"))
		.map((file) => {
			const slug = file.replace("audiologist-hearing-aids-", "").replace(".html", "");
			const $ = load(fs.readFileSync(path.join(rawRoot, file), "utf8"));
			const featured = $(".astro-widget-theme-post-featured-image img, .astro-widget-image img").first();
			const gallery = $(".astro-widget-gallery .e-gallery-image");
			return {
				slug,
				featured: {
					filename: filenameFromPath(featured.attr("src")),
					alt: featured.attr("alt") || "",
				},
				gallery1: {
					filename: filenameFromPath(gallery.eq(0).attr("data-thumbnail")),
					alt: gallery.eq(0).attr("aria-label") || featured.attr("alt") || "",
				},
				gallery2: {
					filename: filenameFromPath(gallery.eq(1).attr("data-thumbnail")),
					alt: gallery.eq(1).attr("aria-label") || featured.attr("alt") || "",
				},
			};
		});
}

const entries = locationEntries();
const neededFiles = new Map();
for (const entry of entries) {
	for (const image of [entry.featured, entry.gallery1, entry.gallery2]) {
		if (image.filename) neededFiles.set(image.filename, image);
	}
}

function uploadToD1Media() {
	const db = new Database(d1Path);
	for (const [filename, image] of neededFiles.entries()) {
		const filePath = path.join(mediaRoot, filename);
		if (!fs.existsSync(filePath)) throw new Error(`Missing media file: ${filePath}`);
		let media = mediaByFilename(db, filename);
		if (!media) {
			try {
				execFileSync(
					process.execPath,
					[path.join(root, "node_modules", "emdash", "dist", "cli", "index.mjs"), "media", "upload", filePath, "--url", "http://localhost:4321", "--json"],
					{ cwd: root, stdio: "pipe" },
				);
				media = mediaByFilename(db, filename);
			} catch {
				const id = randomId();
				const storageKey = `${id}${path.extname(filename) || ".webp"}`;
				const stat = fs.statSync(filePath);
				db.prepare(`
					INSERT INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color)
					VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, ?, NULL, datetime('now'), NULL, 'ready', NULL, NULL)
				`).run(id, filename, mimeType(filename), stat.size, image.alt || "", storageKey);
				media = mediaByFilename(db, filename);
			}
		}
		if (media && image.alt && media.alt !== image.alt) {
			db.prepare("UPDATE media SET alt = ? WHERE id = ?").run(image.alt, media.id);
		}
	}
	db.close();
}

function syncMediaRows(targetDbPath, sourceRowsByFilename) {
	const target = new Database(targetDbPath);
	const tx = target.transaction(() => {
		const insert = target.prepare(`
			INSERT OR REPLACE INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color)
			VALUES (@id, @filename, @mime_type, @size, @width, @height, @alt, @caption, @storage_key, @content_hash, @created_at, @author_id, @status, @blurhash, @dominant_color)
		`);
		for (const row of sourceRowsByFilename.values()) insert.run(row);
	});
	tx();
	target.close();
}

function assignLocationPageImages(dbPath, mediaRowsByFilename) {
	const db = new Database(dbPath);
	const now = new Date().toISOString();
	const update = db.prepare(`
		UPDATE ec_location_pages
		SET updated_at = ?, featured_image = ?, gallery_image_1 = ?, gallery_image_2 = ?
		WHERE slug = ? OR location_slug = ?
	`);
	const tx = db.transaction(() => {
		for (const entry of entries) {
			const featured = mediaRowsByFilename.get(entry.featured.filename);
			const gallery1 = mediaRowsByFilename.get(entry.gallery1.filename);
			const gallery2 = mediaRowsByFilename.get(entry.gallery2.filename);
			if (!featured || !gallery1 || !gallery2) throw new Error(`Missing media rows for ${entry.slug}`);
			update.run(
				now,
				JSON.stringify(mediaValue(featured, entry.featured.alt)),
				JSON.stringify(mediaValue(gallery1, entry.gallery1.alt)),
				JSON.stringify(mediaValue(gallery2, entry.gallery2.alt)),
				entry.slug,
				entry.slug,
			);
		}
	});
	tx();
	db.close();
}

uploadToD1Media();

const d1Read = new Database(d1Path, { readonly: true });
const mediaRowsByFilename = new Map([...neededFiles.keys()].map((filename) => [filename, mediaByFilename(d1Read, filename)]));
d1Read.close();

for (const [filename, row] of mediaRowsByFilename.entries()) {
	if (!row) throw new Error(`Missing uploaded media in D1 for ${filename}`);
}

const dbPaths = [path.join(root, "data.db"), d1Path];
for (const dbPath of dbPaths) {
	syncMediaRows(dbPath, mediaRowsByFilename);
	assignLocationPageImages(dbPath, mediaRowsByFilename);
}

console.log(`Location page media assigned for ${entries.length} location pages using ${neededFiles.size} media files.`);
