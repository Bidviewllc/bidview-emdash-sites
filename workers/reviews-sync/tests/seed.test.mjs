import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSeedSql } from "../scripts/seed-sql.mjs";

const ROOT = resolve(import.meta.dirname, "../../..");

const SOURCES = {
  ontario: { location: "brighton", minReviews: 60, file: "sites/ontario-hearing/src/data/reviews.json", list: (j) => j.reviews },
  duet: { location: "lake-forest", minReviews: 50, file: "sites/duet-audiology/src/data/google-reviews.json", list: (j) => j.reviews },
};

for (const [site, { location, minReviews }] of Object.entries(SOURCES)) {
  test(`${site} seed SQL builds a database the reader can use`, () => {
    const db = new DatabaseSync(":memory:");
    db.exec(buildSeedSql(site, ROOT));
    const n = db.prepare("SELECT COUNT(*) AS n FROM reviews WHERE location = ?").get(location).n;
    assert.ok(n >= minReviews, `${site}: only ${n} reviews`);
    const meta = db.prepare("SELECT rating, votes_count FROM review_meta WHERE location = ?").get(location);
    assert.ok(meta.rating > 0 && meta.votes_count >= n);
    db.exec(buildSeedSql(site, ROOT));
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM reviews WHERE location = ?").get(location).n, n);
  });

  test(`${site} seed keeps every source review (no quoting loss)`, () => {
    const src = SOURCES[site];
    const json = JSON.parse(readFileSync(resolve(ROOT, src.file), "utf8"));
    const withId = src.list(json).filter((r) => (r.review_id || r.id)).length;
    const db = new DatabaseSync(":memory:");
    db.exec(buildSeedSql(site, ROOT));
    const n = db.prepare("SELECT COUNT(*) AS n FROM reviews WHERE location = ?").get(location).n;
    assert.equal(n, withId, `${site}: ${withId} source reviews with an id, ${n} rows in D1`);
  });
}
