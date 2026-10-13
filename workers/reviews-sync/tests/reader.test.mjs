import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fakeD1 } from "./helpers/fake-d1.mjs";
import { ensureSchema, upsertResult } from "../src/db.js";
import { getLocationReviews } from "../reader/reviews-reader.mjs";

const FALLBACK = { placeId: "P0", rating: 4, votesCount: 3, reviews: [{ id: "f1", author: "Old", rating: 4, text: "x" }] };
const row = (id, over = {}) => ({ review_id: id, author: "A", author_url: "u", avatar_url: "av", rating: 5, text: "t", time_ago: "1 week ago", published_at: "2026-08-01T00:00:00.000Z", review_url: "r", local_guide: 1, synced_at: "s", ...over });

test("falls back when there is no database, no data, or the query throws", async () => {
  assert.equal((await getLocationReviews(null, "arvada", FALLBACK)).source, "fallback");
  const empty = fakeD1();
  await ensureSchema(empty);
  assert.equal((await getLocationReviews(empty, "arvada", FALLBACK)).reviews[0].id, "f1");
  const broken = { prepare() { throw new Error("no such table"); } };
  assert.equal((await getLocationReviews(broken, "arvada", FALLBACK)).source, "fallback");
  assert.deepEqual((await getLocationReviews(null, "arvada", undefined)).reviews, []);
});

test("returns D1 data newest first, with Google totals, hiding hidden reviews", async () => {
  const db = fakeD1();
  await ensureSchema(db);
  await upsertResult(db, "arvada", { title: "T", placeId: "P", rating: 4.9, votesCount: 85, reviews: [row("old", { published_at: "2026-01-01T00:00:00.000Z" }), row("new"), row("secret")] }, "t");
  await db.prepare("UPDATE reviews SET hidden = 1 WHERE review_id = 'secret'").run();
  const out = await getLocationReviews(db, "arvada", FALLBACK);
  assert.equal(out.source, "d1");
  assert.deepEqual(out.reviews.map((r) => r.id), ["new", "old"]);
  assert.equal(out.rating, 4.9);
  assert.equal(out.votesCount, 85);
  assert.deepEqual(out.reviews[0], { id: "new", author: "A", authorUrl: "u", avatar: "av", rating: 5, text: "t", timeAgo: "1 week ago", publishedAt: "2026-08-01T00:00:00.000Z", url: "r", localGuide: true });
});

test("a meta row with NULL rating and count uses the fallback's, but keeps the D1 reviews", async () => {
  const db = fakeD1();
  await ensureSchema(db);
  await upsertResult(db, "arvada", { title: "T", placeId: "P", rating: 4.9, votesCount: 85, reviews: [row("a")] }, "t");
  await db.prepare("UPDATE review_meta SET rating = NULL, votes_count = NULL WHERE location = 'arvada'").run();
  const out = await getLocationReviews(db, "arvada", FALLBACK);
  assert.equal(out.source, "d1");
  assert.deepEqual(out.reviews.map((r) => r.id), ["a"]);
  assert.equal(out.rating, 4);
  assert.equal(out.votesCount, 3);
});

test("a rating-only review comes back with empty text", async () => {
  const db = fakeD1();
  await ensureSchema(db);
  await upsertResult(db, "arvada", { title: "T", placeId: "P", rating: 5, votesCount: 1, reviews: [row("n", { text: null })] }, "t");
  assert.equal((await getLocationReviews(db, "arvada", FALLBACK)).reviews[0].text, "");
});

test("every site that has a reader copy has a byte-identical one", () => {
  const canonical = readFileSync(new URL("../reader/reviews-reader.mjs", import.meta.url));
  for (const site of ["new-leaf-hearing-care", "ontario-hearing", "duet-audiology"]) {
    const copy = new URL(`../../../sites/${site}/src/lib/reviews-reader.mjs`, import.meta.url);
    if (!existsSync(copy)) continue;
    assert.ok(readFileSync(copy).equals(canonical), `${site} reader differs from the canonical copy`);
  }
});
