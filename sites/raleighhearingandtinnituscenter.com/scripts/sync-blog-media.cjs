#!/usr/bin/env node

const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const root = path.resolve(__dirname, "..");
const seedPath = path.join(root, "seed", "seed.json");
const localDbPath = path.join(root, "data.db");
const mediaDir = path.join(root, "public", "assets", "media");
const bucket = process.env.EMDASH_STAGING_R2_BUCKET ?? "raleighhearingandtinnituscenter-staging-media";
const database = process.env.EMDASH_STAGING_D1_DB ?? "raleighhearingandtinnituscenter-staging-db";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const childOptions = { cwd: root, stdio: "inherit" };

const blogImages = [
	{
		slug: "ear-candles-are-they-safe-and-effective",
		id: "01KT6BLOGEARCANDLES000001",
		storageKey: "01KT6BLOGEARCANDLES000001.jpg",
		filename: "Ear-Candles-What-They-Are-What-They-Claim-and-What-You-Should-Know-5f5833268a.jpg",
		alt: "Person lying on a treatment table while a practitioner performs ear candling",
	},
	{
		slug: "hearing-aids-for-tinnitus",
		id: "01KT6BLOGTINNITUS0000002",
		storageKey: "01KT6BLOGTINNITUS0000002.jpg",
		filename: "Hearing-Aids-for-Tinnitus-How-the-Right-Care-Can-Bring-Relief-1-39dad4dc74.jpg",
		alt: "Person wearing glasses gently touching their ear, representing tinnitus symptoms and the use of hearing aids for relief",
	},
	{
		slug: "lenire-side-effects-insurance-and-how-it-compares-with-hearing-aids",
		id: "01KT6BLOGLENIRE000000003",
		storageKey: "01KT6BLOGLENIRE000000003.jpg",
		filename: "featured_featured-4926fca9d4.jpg",
		alt: "Woman holding her ear in discomfort, representing ear pain or hearing concerns",
	},
	{
		slug: "swimmers-ear-signs-causes-when-to-see-an-audiologist",
		id: "01KT6BLOGSWIMMERS0000004",
		storageKey: "01KT6BLOGSWIMMERS0000004.jpg",
		filename: "Swimmers-Ear-Signs-Causes-and-When-to-See-a-Doctor-38ae7f0645.jpg",
		alt: "Swimmer wearing goggles and a swim cap performing a butterfly stroke in a pool, illustrating water exposure linked to swimmer's ear",
	},
];

function main() {
	const media = blogImages.map(prepareMedia);

	updateSeed(media);
	updateLocalDatabase(media);

	if (process.env.SKIP_R2_UPLOAD !== "1") {
		for (const item of media) {
			run([
				"wrangler",
				"r2",
				"object",
				"put",
				`${bucket}/${item.storageKey}`,
				"--remote",
				"--file",
				item.filePath,
				"--content-type",
				item.mimeType,
			]);
		}
	}

	const sqlPath = path.join(root, "tmp-blog-media-sync.sql");
	fs.writeFileSync(sqlPath, buildRemoteSql(media));
	run(["wrangler", "d1", "execute", database, "--remote", "--file", path.basename(sqlPath)]);
	fs.unlinkSync(sqlPath);

	console.log(`Synced ${media.length} blog featured images to local data, seed, ${database}, and ${bucket}.`);
}

function prepareMedia(item) {
	const filePath = path.join(mediaDir, item.filename);
	if (!fs.existsSync(filePath)) {
		throw new Error(`Missing blog image file: ${item.filename}`);
	}
	const bytes = fs.readFileSync(filePath);
	return {
		...item,
		filePath: path.relative(root, filePath),
		mimeType: "image/jpeg",
		size: bytes.length,
		contentHash: crypto.createHash("sha256").update(bytes).digest("hex"),
		imageValue: imageValue(item),
	};
}

function imageValue(item) {
	return {
		id: item.id,
		provider: "local",
		filename: item.filename,
		mimeType: "image/jpeg",
		width: null,
		height: null,
		alt: item.alt,
		meta: {
			storageKey: item.storageKey,
		},
		src: `/_emdash/api/media/file/${item.storageKey}`,
	};
}

function updateSeed(media) {
	const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
	const entries = seed.content?.blogs ?? [];
	for (const item of media) {
		const entry = entries.find((blog) => blog.slug === item.slug || blog.id === item.slug);
		if (!entry) throw new Error(`Missing seed blog entry: ${item.slug}`);
		entry.data.featured_image = item.imageValue;
	}
	fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);
}

function updateLocalDatabase(media) {
	if (!fs.existsSync(localDbPath)) return;
	const db = new Database(localDbPath);
	const insertMedia = db.prepare(`
		INSERT INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color)
		VALUES (@id, @filename, @mimeType, @size, NULL, NULL, @alt, NULL, @storageKey, @contentHash, @createdAt, NULL, 'ready', NULL, NULL)
		ON CONFLICT(id) DO UPDATE SET
			filename = excluded.filename,
			mime_type = excluded.mime_type,
			size = excluded.size,
			alt = excluded.alt,
			storage_key = excluded.storage_key,
			content_hash = excluded.content_hash,
			status = 'ready'
	`);
	const updateBlog = db.prepare(`
		UPDATE ec_blogs
		SET featured_image = @featuredImage,
			updated_at = @updatedAt,
			version = COALESCE(version, 1) + 1
		WHERE slug = @slug
	`);

	const now = new Date().toISOString();
	const transaction = db.transaction(() => {
		for (const item of media) {
			db.prepare("DELETE FROM media WHERE storage_key = ? AND id <> ?").run(item.storageKey, item.id);
			insertMedia.run({ ...item, createdAt: now });
			updateBlog.run({
				slug: item.slug,
				featuredImage: JSON.stringify(item.imageValue),
				updatedAt: now,
			});
		}
	});
	transaction();
	db.close();
}

function buildRemoteSql(media) {
	const now = new Date().toISOString();
	const statements = [];

	for (const item of media) {
		statements.push(`DELETE FROM media WHERE storage_key = ${sqlValue(item.storageKey)} AND id <> ${sqlValue(item.id)};`);
		statements.push(`
			INSERT INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color)
			VALUES (${[
				item.id,
				item.filename,
				item.mimeType,
				item.size,
				null,
				null,
				item.alt,
				null,
				item.storageKey,
				item.contentHash,
				now,
				null,
				"ready",
				null,
				null,
			].map(sqlValue).join(", ")})
			ON CONFLICT(id) DO UPDATE SET
				filename = excluded.filename,
				mime_type = excluded.mime_type,
				size = excluded.size,
				alt = excluded.alt,
				storage_key = excluded.storage_key,
				content_hash = excluded.content_hash,
				status = 'ready';
		`);
		statements.push(`
			UPDATE ec_blogs
			SET featured_image = ${sqlValue(JSON.stringify(item.imageValue))},
				updated_at = ${sqlValue(now)},
				version = COALESCE(version, 1) + 1
			WHERE slug = ${sqlValue(item.slug)};
		`);
	}

	return `${statements.join("\n")}\n`;
}

function sqlValue(value) {
	if (value === null || value === undefined) return "NULL";
	if (typeof value === "number") return String(value);
	return `'${String(value).replace(/'/g, "''")}'`;
}

function run(args) {
	if (process.platform !== "win32") {
		execFileSync(npx, args, childOptions);
		return;
	}

	const command = [npx, ...args].map(cmdQuote).join(" ");
	execFileSync("cmd.exe", ["/d", "/s", "/c", command], childOptions);
}

function cmdQuote(value) {
	const text = String(value);
	if (!/[ \t&()^%!"<>|]/.test(text)) return text;
	return `"${text.replace(/"/g, '\\"')}"`;
}

main();
