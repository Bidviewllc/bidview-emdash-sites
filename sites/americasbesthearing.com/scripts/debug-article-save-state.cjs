const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const root = process.cwd();
const dbPaths = [path.join(root, "data.db")];
const d1Dir = path.join(root, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");

if (fs.existsSync(d1Dir)) {
	for (const file of fs.readdirSync(d1Dir)) {
		if (file.endsWith(".sqlite") && file !== "metadata.sqlite") {
			dbPaths.push(path.join(d1Dir, file));
		}
	}
}

for (const dbPath of dbPaths) {
	if (!fs.existsSync(dbPath)) continue;
	const db = new Database(dbPath, { readonly: true });
	console.log(`\nDB: ${dbPath}`);

	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'ec_%' ORDER BY name")
		.all()
		.map((row) => row.name);

	const articleTables = tables.filter((table) => /article|post|news/i.test(table));
	if (articleTables.length === 0) {
		console.log("No article/post/news tables found.");
		db.close();
		continue;
	}

	for (const table of articleTables) {
		console.log(`\nTable: ${table}`);
		const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
		const wantedColumns = ["id", "slug", "status", "title", "created_at", "updated_at"].filter((column) =>
			columns.includes(column),
		);
		const rows = db
			.prepare(`SELECT ${wantedColumns.join(", ")} FROM ${table} ORDER BY updated_at DESC LIMIT 10`)
			.all();
		console.table(rows);
	}

	db.close();
}
