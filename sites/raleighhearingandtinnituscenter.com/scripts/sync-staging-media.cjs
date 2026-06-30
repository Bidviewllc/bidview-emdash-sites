#!/usr/bin/env node

const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const seedPath = path.join(root, "seed", "seed.json");
const mediaDir = path.join(root, "local-copy", "assets", "media");
const bucket = process.env.EMDASH_STAGING_R2_BUCKET ?? "raleighhearingandtinnituscenter-staging-media";
const database = process.env.EMDASH_STAGING_D1_DB ?? "raleighhearingandtinnituscenter-staging-db";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const childOptions = { cwd: root, stdio: "inherit" };

const legacyMediaFiles = {
	"01KT4TJMZSMQ56E4VR61S31RDW.webp": "2-7788883e8e.webp",
	"01KT4TK4NEGPD0JX36G1W8SAAA.webp": "1-b51f3fa3d9.webp",
	"01KT4TK4PBJ5CXTGGPEPME6S5Q.webp": "5-ab14738aeb.webp",
	"01KT4TK4Q0JP28JMMY8R9H363T.webp": "6-4fc49ff9d3.webp",
	"01KT4TK4RH34RSGQ01B60ZEHG9.webp": "3-17c0ba8fe5.webp",
	"01KT4XXN519495RSKC9BN919TH.jpg": "DSC00134-917ba74cd1.jpg",
	"01KT4YCK75R4X2CTG1DMTDZ44G.jpg": "Dr.-Miller-Showing-Hearing-Aid-Colors-DSC06279-updated-scaled-c3246a10eb.jpg",
	"01KT4XXN31G67EKMMZFEHE6E1J.webp": "66bd41cf6cf824e903ead09a60e05bf74a180dfa-1024x683-1-282227a1d9.webp",
};

const brandMediaFiles = {
	"01KT5E534KGWNPPPNXJXYWPCBX.webp": "Oticon-Zeal-300x300-48aa848197.webp",
	"01KT5E5ZSBX1GWYF89XF7FZHSZ.webp": "Oticon-Intent-trimmed-2-300x154-d3bbfca9c3.webp",
	"01KT5E61JBVW50FSZCYF74X5ZQ.webp": "Oticon-Jet-PX-2-300x300-1552ceb674.webp",
	"01KT5E63B8PVG0PB08XNQ1KK4H.webp": "Oticon-Real-300x300-abc5000d95.webp",
	"01KT5E655DE2E95NCNPGH7NYY0.webp": "Oticon-Own-300x300-2f7851679a.webp",
	"01KT5DSDHTW9SJ587X0VGMV0TH.webp": "Phonak-Infinio-Ultra-300x300-b65dc09f10.webp",
	"01KT5E5RJD5FZ2NFF1T6KZ5WD1.webp": "Phonak-Audeo-Sphere-300x300-ac7c7b10ac.webp",
	"01KT5E5TC4TTK9FHCWJJDSKPCR.webp": "Phonak-Cros-Infinio-300x300-a1d16c3dcd.webp",
	"01KT5E5W64GNQBMK4JKJER78V3.webp": "Phonak-Virto-Infinio-300x300-0315b8feaa.webp",
	"01KT5E5Y03GC93N7CCPTVHGAPJ.webp": "phonak-audeo-lumity-300x300-dc60b4c26f.webp",
	"01KT5E66Y2SPZXKEYPNFD5D6X4.webp": "ReSound-Enzo-IA-300x300-660a65b8fc.webp",
	"01KT5E68PVDBR3KE4MBSFME1D9.webp": "Resound-Nexia-CBG-300x300-c2d1ec636d.webp",
	"01KT5E6AETC59JGNEJF7TN43B9.webp": "Resound-Vivia-1-300x300-3fec4b115e.webp",
	"01KT5E6C85YQ16BQ4NC95Y7FK1.webp": "Resound-Savi-300x300-878cae59af.webp",
	"01KT5E6E08VS5BMSEQHQ9ZV4ST.png": "Resound-Mini-RIE-CBG-300x300-91291969d8.png",
	"01KT5E6FYBCPHFYXJW9YE5RHBC.webp": "Signia-Pure-ChargeGo-BCT-IX-300x300-7a00ba6900.webp",
	"01KT5E6HP833RG27VCNPYYBC7V.webp": "Signia_Pure-Charge-Go-AX-1-300x195-154f969c96.webp",
	"01KT5E6KEH3E579HJ1WXTX8YPY.jpg": "Pure-Charge-Go-IX-300x300-c74c14eb8d.jpg",
	"01KT5E6NB8M46GFBA3ERXQSPD5.webp": "Signia-Silk-ChargeGo-300x300-bcd911702a.webp",
	"01KT5E6Q6DJ9NCZD1XQMVM7BPY.webp": "Signia_Insio-IX-300x300-4704e02200.webp",
	"01KT5E6RZHZ4Z5P9RASF6BCJ7T.jpg": "Starkey-Omega-AI-1024x611-1-300x179-ccaa58469d.jpg",
	"01KT5E6TSVJ7BP3WZ9JMPQ75B6.webp": "Starkey-Edge-AI-TBG-300x300-886f052e2e.webp",
	"01KT5E6WJA376ME90F93PYFE1S.png": "Starkey_Genesis_AI_wGlow-transparent-768x768-1-300x300-3bd6849350.png",
	"01KT5E6YBFVQSKDTXWM5FYRTK4.png": "signature-series-cic-r-nw-wbst2790-300x270-7953e7ad22.png",
	"01KT5E703V44TYM8Q2D32QK7A5.jpg": "Evolve-AI-bte-r-product-989x1024-1-290x300-9abd8ffce4.jpg",
	"01KT5E71WJHJCGR60D8GT0DH4N.webp": "Widex-Allure-300x300-a19065d302.webp",
	"01KT5E73MS4MGSFJR4A4PWP3EA.webp": "Widex-SmartRIC-300x300-5e194a58d8.webp",
	"01KT5E75D73WRKA8VHFCSJ195Z.webp": "Widex-Moment-Sheer_RIC-300x300-28314f4da7.webp",
	"01KT5E7759FA41DGJ1TSJP9HWQ.webp": "Widex-Moment-RIC-300x300-301fa772d5.webp",
	"01KT5E78X99JQWMZKTK4MXDCYB.png": "Moment_BTE-300x300-2ced081297.png",
};

const mimeTypes = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
};

function main() {
	const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
	const media = collectMedia(seed);
	if (!media.length) {
		console.log("No seed media references found.");
		return;
	}

	const missing = media.filter((item) => !fs.existsSync(item.filePath));
	if (missing.length) {
		for (const item of missing) console.error(`Missing file for ${item.storageKey}: ${item.filename}`);
		process.exit(1);
	}

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

	const sqlPath = "tmp-staging-media-sync.sql";
	fs.writeFileSync(path.join(root, sqlPath), buildSql(media));
	run([
		"wrangler",
		"d1",
		"execute",
		database,
		"--remote",
		"--file",
		sqlPath,
	]);

	console.log(`Synced ${media.length} media records to ${database} and ${bucket}.`);
}

function collectMedia(seed) {
	const byKey = new Map();

	function add(item) {
		const filename = item.filename || legacyMediaFiles[item.storageKey] || brandMediaFiles[item.storageKey];
		if (!filename || byKey.has(item.storageKey)) return;
		const filePath = path.join(mediaDir, filename);
		const ext = path.extname(filename).toLowerCase();
		const bytes = fs.existsSync(filePath) ? fs.readFileSync(filePath) : Buffer.alloc(0);
		byKey.set(item.storageKey, {
			id: item.id || item.assetId || item.storageKey.replace(/\.[^.]+$/, ""),
			filename,
			mimeType: item.mimeType || mimeTypes[ext] || "application/octet-stream",
			size: bytes.length || null,
			alt: item.alt || "",
			storageKey: item.storageKey,
			contentHash: bytes.length ? crypto.createHash("sha256").update(bytes).digest("hex") : null,
			filePath: path.relative(root, filePath),
		});
	}

	function walk(value) {
		if (!value || typeof value !== "object") return;
		if (Array.isArray(value)) {
			for (const item of value) walk(item);
			return;
		}

		const src = value.src || value.url || value.asset?.url;
		const match = typeof src === "string" ? src.match(/\/_emdash\/api\/media\/file\/([^")\s]+)/) : null;
		const storageKey = value.meta?.storageKey || match?.[1];
		if (storageKey) {
			add({
				storageKey,
				id: value.id,
				assetId: value.asset?._ref,
				filename: value.filename,
				mimeType: value.mimeType,
				alt: value.alt,
			});
		}

		for (const child of Object.values(value)) walk(child);
	}

	walk(seed);
	return [...byKey.values()].sort((a, b) => a.storageKey.localeCompare(b.storageKey));
}

function buildSql(media) {
	const rows = media.map((item) => {
		const values = [
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
			new Date().toISOString(),
			null,
			"ready",
			null,
			null,
		].map(sqlValue);
		return `(${values.join(", ")})`;
	});

	return [
		...media.map((item) => `DELETE FROM media WHERE id = ${sqlValue(item.id)} OR storage_key = ${sqlValue(item.storageKey)};`),
		"INSERT INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color) VALUES",
		`${rows.join(",\n")};`,
		"",
	].join("\n");
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
