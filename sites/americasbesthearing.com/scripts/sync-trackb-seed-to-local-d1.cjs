require("./require-content-overwrite.cjs");

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const root = process.cwd();
const sourcePath = path.join(root, "data.db");
const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const d1Path = fs
	.readdirSync(d1Dir)
	.filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite")
	.map((file) => path.join(d1Dir, file))[0];

if (!d1Path) throw new Error("Could not find local Wrangler D1 sqlite database.");

const source = new Database(sourcePath, { readonly: true });
const target = new Database(d1Path);

const slugs = [
	"homepages",
	"homepage_images",
	"staff",
	"locations",
	"audiology_services",
	"hearing_aid_services",
	"faqs",
	"testimonials",
];
const contentTables = slugs.map((slug) => `ec_${slug}`);

function tableExists(db, name) {
	return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);
}

function createTableLikeSource(table) {
	if (tableExists(target, table)) return;
	const row = source.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?").get(table);
	if (!row?.sql) throw new Error(`Source table missing: ${table}`);
	target.exec(row.sql);
}

function copyRows(table, where = "", params = []) {
	const rows = source.prepare(`SELECT * FROM ${table}${where}`).all(...params);
	if (!rows.length) return 0;
	const cols = Object.keys(rows[0]);
	const quotedCols = cols.map((col) => `"${col.replace(/"/g, '""')}"`);
	const placeholders = cols.map(() => "?").join(", ");
	const insert = target.prepare(`INSERT OR REPLACE INTO ${table} (${quotedCols.join(", ")}) VALUES (${placeholders})`);
	for (const row of rows) insert.run(cols.map((col) => row[col]));
	return rows.length;
}

const sync = target.transaction(() => {
	const collectionRows = source
		.prepare(`SELECT * FROM _emdash_collections WHERE slug IN (${slugs.map(() => "?").join(",")})`)
		.all(...slugs);

	const collectionIds = collectionRows.map((row) => row.id);
	const idPlaceholders = collectionIds.map(() => "?").join(",");

	copyRows("_emdash_collections", ` WHERE slug IN (${slugs.map(() => "?").join(",")})`, slugs);
	if (collectionIds.length) copyRows("_emdash_fields", ` WHERE collection_id IN (${idPlaceholders})`, collectionIds);

	copyRows("revisions", ` WHERE collection IN (${slugs.map(() => "?").join(",")})`, slugs);

	for (const table of contentTables) {
		createTableLikeSource(table);
		copyRows(table);
	}
});

sync();
console.log(`Synced Track B seed collections into ${d1Path}`);
