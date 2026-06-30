const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const sharp = require("sharp");

const root = process.cwd();
const mediaRoot = path.join(root, "public", "assets", "media");
const r2Dir = path.join(root, ".wrangler", "state", "v3", "r2", "americasbesthearing-media");
const r2BlobsDir = path.join(r2Dir, "blobs");
const r2DbDir = path.join(root, ".wrangler", "state", "v3", "r2", "miniflare-R2BucketObject");
const r2DbPath = fs.existsSync(r2DbDir)
	? fs.readdirSync(r2DbDir).filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite").map((file) => path.join(r2DbDir, file))[0]
	: null;

const replacements = {
	"anoka-mn": "americas-best-hearing-anoka-mn-01-768x512-1e0b560d6b.webp",
	"eden-prairie-mn": "americas-best-hearing-eden-prairie-mn-01-768x512-0d93949632.webp",
	"edina-mn": "americas-best-hearing-edina-mn-01-768x512-3ff6053c7b.webp",
	"maple-grove-mn": "americas-best-hearing-maple-grove-mn-01-768x512-eaaefc6d96.webp",
	"mendota-heights-mn": "americas-best-hearing-mendota-heights-mn-01-768x512-072a7361d5.webp",
	"new-ulm-mn": "americas-best-hearing-new-ulm-mn-01-768x512-1d44c337b5.webp",
};

function ulidLike() {
	const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
	let n = Date.now();
	let time = "";
	for (let i = 0; i < 10; i += 1) {
		time = alphabet[n % 32] + time;
		n = Math.floor(n / 32);
	}
	let random = "";
	const bytes = crypto.randomBytes(10);
	for (let i = 0; i < 16; i += 1) random += alphabet[bytes[i % bytes.length] % 32];
	return `${time}${random}`;
}

function dbPaths() {
	const paths = [path.join(root, "data.db")];
	const d1 = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
	if (fs.existsSync(d1)) {
		for (const file of fs.readdirSync(d1)) {
			if (file.endsWith(".sqlite") && file !== "metadata.sqlite") paths.push(path.join(d1, file));
		}
	}
	return paths.filter(fs.existsSync);
}

function tableExists(db, table) {
	return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
}

function mimeFromExt(file) {
	const ext = path.extname(file).toLowerCase();
	if (ext === ".png") return "image/png";
	if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
	if (ext === ".webp") return "image/webp";
	return "application/octet-stream";
}

async function metadataFor(filePath) {
	try {
		const meta = await sharp(filePath).metadata();
		return { width: meta.width || null, height: meta.height || null };
	} catch {
		return { width: null, height: null };
	}
}

function getAuthorId(db) {
	try {
		const row = db.prepare("SELECT id FROM users ORDER BY created_at LIMIT 1").get();
		if (row?.id) return row.id;
	} catch {}
	return null;
}

function writeR2Object(storageKey, buffer, mimeType) {
	if (!r2DbPath || !fs.existsSync(r2DbPath)) return;
	fs.mkdirSync(r2BlobsDir, { recursive: true });
	const db = new Database(r2DbPath);
	try {
		if (db.prepare("SELECT key FROM _mf_objects WHERE key=?").get(storageKey)) return;
		const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
		const blobId = `${sha256}${crypto.randomBytes(8).toString("hex")}`;
		const etag = crypto.createHash("md5").update(buffer).digest("hex");
		fs.writeFileSync(path.join(r2BlobsDir, blobId), buffer);
		db.prepare("INSERT INTO _mf_objects (key, blob_id, version, size, etag, uploaded, checksums, http_metadata, custom_metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
			storageKey,
			blobId,
			crypto.randomBytes(16).toString("hex"),
			buffer.length,
			etag,
			Date.now(),
			"{}",
			JSON.stringify({ contentType: mimeType }),
			"{}",
		);
	} finally {
		db.close();
	}
}

async function ensureMedia(filename, dbs) {
	const filePath = path.join(mediaRoot, filename);
	if (!fs.existsSync(filePath)) throw new Error(`Missing media file: ${filePath}`);
	const buffer = fs.readFileSync(filePath);
	const mimeType = mimeFromExt(filename);
	const contentHash = `sha1:${crypto.createHash("sha1").update(buffer).digest("hex")}`;
	const dims = await metadataFor(filePath);
	let media = null;
	for (const db of dbs) {
		if (!tableExists(db, "media")) continue;
		media = db.prepare("SELECT * FROM media WHERE content_hash = ? OR filename = ? LIMIT 1").get(contentHash, filename);
		if (media) break;
	}
	if (!media) {
		const id = ulidLike();
		const storageKey = `${ulidLike()}${path.extname(filename).toLowerCase() || ".webp"}`;
		writeR2Object(storageKey, buffer, mimeType);
		for (const db of dbs) {
			if (!tableExists(db, "media")) continue;
			db.prepare("INSERT OR IGNORE INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'ready', NULL, NULL)").run(
				id,
				filename,
				mimeType,
				buffer.length,
				dims.width,
				dims.height,
				"America's Best Hearing office location",
				storageKey,
				contentHash,
				new Date().toISOString(),
				getAuthorId(db),
			);
		}
		media = { id, filename, mime_type: mimeType, width: dims.width, height: dims.height, storage_key: storageKey, alt: "America's Best Hearing office location" };
	} else {
		writeR2Object(media.storage_key, buffer, media.mime_type || mimeType);
	}
	return {
		provider: "local",
		id: media.id,
		src: `/_emdash/api/media/file/${media.storage_key}`,
		alt: media.alt || "America's Best Hearing office location",
		width: media.width || undefined,
		height: media.height || undefined,
		mimeType: media.mime_type || mimeType,
		filename: media.filename || filename,
		meta: { storageKey: media.storage_key },
	};
}

(async () => {
	const paths = dbPaths();
	const dbs = paths.map((dbPath) => new Database(dbPath));
	try {
		const mediaBySlug = {};
		for (const [slug, filename] of Object.entries(replacements)) {
			mediaBySlug[slug] = await ensureMedia(filename, dbs);
		}
		for (const db of dbs) {
			const update = db.prepare("UPDATE ec_location_pages SET featured_image = ?, updated_at = ? WHERE location_slug = ? OR slug = ?");
			const now = new Date().toISOString();
			for (const [slug, media] of Object.entries(mediaBySlug)) {
				update.run(JSON.stringify(media), now, slug, slug);
			}
		}
		console.log(`Updated featured gallery image for ${Object.keys(replacements).length} location pages.`);
	} finally {
		dbs.forEach((db) => db.close());
	}
})();
