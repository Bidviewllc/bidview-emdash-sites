const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const root = path.resolve(__dirname, "..");
const db = new Database(path.join(root, "data.db"), { readonly: true });

const tables = [
	"media",
	"revisions",
	"ec_audiology_services_sections",
	"ec_blogs",
	"ec_contact_pages",
	"ec_global_sections",
	"ec_hearing_aid_brands",
	"ec_hearing_aid_services_sections",
	"ec_hearing_aids_sections",
	"ec_homepage",
	"ec_office_info_map_ctas",
	"ec_single_page_with_sidebar",
	"ec_sitemap_pages",
	"ec_staff",
	"ec_tinnitus_ctas",
	"ec_utility_pages",
];

function quoteIdentifier(value) {
	return `"${String(value).replace(/"/g, '""')}"`;
}

function sqlValue(value) {
	if (value === null || value === undefined) return "NULL";
	if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
	return `'${String(value).replace(/'/g, "''")}'`;
}

function tableColumns(table) {
	return db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map((column) => column.name);
}

let output = "";

for (const table of tables) {
	const exists = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
	if (!exists) continue;
	const columns = tableColumns(table);
	const rows = db.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all();
	output += `DELETE FROM ${quoteIdentifier(table)};\n`;
	for (const row of rows) {
		const columnSql = columns.map(quoteIdentifier).join(", ");
		const valueSql = columns.map((column) => sqlValue(row[column])).join(", ");
		output += `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${valueSql});\n`;
	}
}

const outPath = path.join(root, "tmp-staging-content-sync.sql");
fs.writeFileSync(outPath, output, "utf8");
console.log(outPath);
