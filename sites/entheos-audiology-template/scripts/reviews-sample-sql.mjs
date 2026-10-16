// Writes SQL that loads the sample (Lakeview) reviews into a site's review
// tables, the same tables the weekly reviews sync fills, so a demo site can
// show and hide reviews before any real sync. Real practices never need this.
//
//   node scripts/reviews-sample-sql.mjs > reviews-sample.sql
//   npx wrangler d1 execute DB --remote --file reviews-sample.sql   (or --local)
import { readFileSync } from "node:fs";

const revs = JSON.parse(readFileSync(new URL("../src/data/content/revs.json", import.meta.url), "utf8"));
const q = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const now = new Date().toISOString();
// Same tables as workers/reviews-sync/src/db.js (SCHEMA_SQL) on main.
const out = [
	`CREATE TABLE IF NOT EXISTS reviews (review_id TEXT PRIMARY KEY, location TEXT NOT NULL, author TEXT, author_url TEXT, avatar_url TEXT, rating INTEGER, text TEXT, time_ago TEXT, published_at TEXT, review_url TEXT, local_guide INTEGER DEFAULT 0, synced_at TEXT, hidden INTEGER DEFAULT 0);`,
	`CREATE INDEX IF NOT EXISTS reviews_location_idx ON reviews(location, published_at DESC);`,
	`CREATE TABLE IF NOT EXISTS review_meta (location TEXT PRIMARY KEY, title TEXT, place_id TEXT, rating REAL, votes_count INTEGER, synced_at TEXT);`,
	`CREATE TABLE IF NOT EXISTS review_jobs (location TEXT PRIMARY KEY, task_id TEXT, status TEXT, posted_at TEXT);`,
];
revs.forEach((r, i) => {
	const loc = r.loc.toLowerCase();
	// "September 2026" -> a date in that month, spread so the order is stable
	const d = new Date(`${r.date} ${28 - (i % 20)} 12:00 UTC`);
	out.push(
		`INSERT OR IGNORE INTO reviews (review_id, location, author, rating, text, time_ago, published_at, review_url, local_guide, synced_at, hidden) VALUES (${q(`sample-${i + 1}`)}, ${q(loc)}, ${q(r.name)}, ${r.four ? 4 : 5}, ${q(r.text)}, '', ${q(d.toISOString())}, '', 0, ${q(now)}, 0);`,
	);
});
out.push(`INSERT OR REPLACE INTO review_meta (location, title, place_id, rating, votes_count, synced_at) VALUES ('riverside', 'Lakeview Hearing Center (sample)', '', 4.9, 150, ${q(now)});`);
out.push(`INSERT OR REPLACE INTO review_meta (location, title, place_id, rating, votes_count, synced_at) VALUES ('northfield', 'Lakeview Hearing Center Northfield (sample)', '', 4.8, 60, ${q(now)});`);
console.log(out.join("\n"));
