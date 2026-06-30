const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const root = process.cwd();
const candidates = [
	path.join(root, "data.db"),
	...fs
		.globSync(path.join(root, ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite").replace(/\\/g, "/"))
		.filter((file) => !file.endsWith("metadata.sqlite")),
].filter((file) => fs.existsSync(file));

for (const dbPath of candidates) {
	const db = new Database(dbPath);
	const hasTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'contact_submissions'").get();
	if (!hasTable) {
		db.close();
		continue;
	}
	const rows = db
		.prepare(
			`SELECT created_at, name, email, phone, clinic, message
			 FROM contact_submissions
			 ORDER BY created_at DESC
			 LIMIT 20`,
		)
		.all();
	console.log(`\n${path.relative(root, dbPath)}`);
	console.table(rows);
	db.close();
}
