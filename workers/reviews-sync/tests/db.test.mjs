import test from "node:test";
import assert from "node:assert/strict";
import { fakeD1 } from "./helpers/fake-d1.mjs";
import { ensureSchema, upsertResult, getMeta, getJob, setJob } from "../src/db.js";

const norm = (rows, extra = {}) => ({ title: "New Leaf Hearing Care", placeId: "P", rating: 4.9, votesCount: 85, reviews: rows, ...extra });
const row = (id, over = {}) => ({ review_id: id, author: "A", author_url: "", avatar_url: "", rating: 5, text: "hi", time_ago: "", published_at: "2026-08-01T00:00:00.000Z", review_url: "", local_guide: 0, synced_at: "t", ...over });

test("ensureSchema creates all tables on a fresh database and is repeatable", async () => {
  const db = fakeD1();
  await ensureSchema(db);
  await ensureSchema(db);
  const t = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  assert.deepEqual(t.results.map((r) => r.name), ["review_jobs", "review_meta", "reviews"]);
});

test("ensureSchema adds hidden and author_url to an older reviews table", async () => {
  const db = fakeD1();
  await db.prepare("CREATE TABLE reviews (review_id TEXT PRIMARY KEY, location TEXT NOT NULL, author TEXT, avatar_url TEXT, rating INTEGER, text TEXT, time_ago TEXT, published_at TEXT, review_url TEXT, local_guide INTEGER DEFAULT 0, synced_at TEXT)").run();
  await db.prepare("INSERT INTO reviews (review_id, location) VALUES ('old','arvada')").run();
  await ensureSchema(db);
  const cols = (await db.prepare("PRAGMA table_info(reviews)").all()).results.map((c) => c.name);
  assert.ok(cols.includes("hidden") && cols.includes("author_url"));
  assert.equal((await db.prepare("SELECT hidden FROM reviews WHERE review_id='old'").first()).hidden, 0);
});

test("a re-sync updates text but never un-hides a hidden review", async () => {
  const db = fakeD1();
  await ensureSchema(db);
  await upsertResult(db, "arvada", norm([row("a", { text: "first" })]), "t1");
  await db.prepare("UPDATE reviews SET hidden = 1 WHERE review_id = 'a'").run();
  await upsertResult(db, "arvada", norm([row("a", { text: "edited" })]), "t2");
  const r = await db.prepare("SELECT text, hidden FROM reviews WHERE review_id='a'").first();
  assert.deepEqual(r, { text: "edited", hidden: 1 });
});

test("upsertResult writes review_meta totals and handles more than one batch", async () => {
  const db = fakeD1();
  await ensureSchema(db);
  const many = Array.from({ length: 95 }, (_, i) => row("id" + i));
  await upsertResult(db, "arvada", norm(many), "t");
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM reviews").first()).n, 95);
  assert.deepEqual(await getMeta(db, "arvada"), { location: "arvada", title: "New Leaf Hearing Care", place_id: "P", rating: 4.9, votes_count: 85, synced_at: "t" });
});

test("setJob replaces the single job row per location", async () => {
  const db = fakeD1();
  await ensureSchema(db);
  await setJob(db, { location: "arvada", taskId: "T1", status: "pending", postedAt: "p1" });
  await setJob(db, { location: "arvada", taskId: "T2", status: "done", postedAt: "p2" });
  assert.deepEqual(await getJob(db, "arvada"), { location: "arvada", task_id: "T2", status: "done", posted_at: "p2" });
  assert.equal(await getJob(db, "nowhere"), null);
});
