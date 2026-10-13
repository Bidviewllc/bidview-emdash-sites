import test from "node:test";
import assert from "node:assert/strict";
import { fakeD1 } from "./helpers/fake-d1.mjs";
import { ensureSchema, getJob, getMeta, upsertResult, setJob } from "../src/db.js";
import { runPost, runCollect, runCatchUp, validate } from "../src/sync.js";

const LOC = { key: "arvada", label: "Arvada", placeId: "ChIJx", depth: 50, expectedTitleIncludes: ["New Leaf"] };
const SITES = [{ site: "s", dbBinding: "DB", locations: [LOC] }];
const NOW = new Date("2026-10-18T13:00:00.000Z");
const item = (id) => ({ review_id: id, profile_name: "A", rating: { value: 5 }, review_text: "ok", timestamp: "2026-10-10 10:00:00 +00:00" });
const ready = (over = {}) => ({ tasks: [{ status_code: 20000, result: [{ title: "New Leaf Hearing Care", place_id: "ChIJx", rating: { value: 4.9, votes_count: 85 }, items: [item("a"), item("b")], ...over }] }] });

async function setup() {
  const db = fakeD1();
  await ensureSchema(db);
  const alerts = [];
  const env = { DB: db, DATAFORSEO_LOGIN: "l", DATAFORSEO_PASSWORD: "p", SLACK_ALERTS_WEBHOOK: "https://hook.invalid" };
  const calls = [];
  const dfsBody = { current: { tasks: [{ id: "T1", status_code: 20100 }] } };
  const fetchFn = async (url, init) => {
    if (url === env.SLACK_ALERTS_WEBHOOK) { alerts.push(JSON.parse(init.body).text); return {}; }
    calls.push(url);
    return { json: async () => dfsBody.current };
  };
  return { db, env, fetchFn, alerts, calls, dfsBody };
}

test("validate accepts a good result and rejects wrong place, wrong title and empty pulls", () => {
  const good = { title: "New Leaf Hearing Care", placeId: "ChIJx", rating: 4.9, votesCount: 85, reviews: [{}] };
  assert.equal(validate(LOC, good), null);
  assert.match(validate(LOC, { ...good, placeId: "ChIJother" }), /place_id mismatch/);
  assert.match(validate(LOC, { ...good, title: "Some Other Clinic" }), /title mismatch/);
  assert.match(validate(LOC, { ...good, reviews: [] }), /no reviews/);
  assert.equal(validate(LOC, { ...good, placeId: "" }), null);
  assert.match(validate(LOC, { ...good, rating: null }), /no rating totals/);
  assert.match(validate(LOC, { ...good, votesCount: null }), /no rating totals/);
});

test("runPost posts once, records a pending job, and does not double-post", async () => {
  const { db, env, fetchFn, calls } = await setup();
  const first = await runPost(env, { now: NOW, fetchFn, sites: SITES });
  assert.equal(first[0].status, "posted");
  assert.equal((await getJob(db, "arvada")).status, "pending");
  const second = await runPost(env, { now: NOW, fetchFn, sites: SITES });
  assert.equal(second[0].status, "skipped-pending");
  assert.equal(calls.filter((u) => u.endsWith("task_post")).length, 1);
});

test("runPost skips a location synced within 6 days but re-posts after 7", async () => {
  const { db, env, fetchFn } = await setup();
  await upsertResult(db, "arvada", { title: "t", placeId: "p", rating: 5, votesCount: 1, reviews: [] }, "2026-10-14T00:00:00.000Z");
  assert.equal((await runPost(env, { now: NOW, fetchFn, sites: SITES }))[0].status, "skipped-recent");
  await upsertResult(db, "arvada", { title: "t", placeId: "p", rating: 5, votesCount: 1, reviews: [] }, "2026-10-10T00:00:00.000Z");
  assert.equal((await runPost(env, { now: NOW, fetchFn, sites: SITES }))[0].status, "posted");
});

test("a pending job older than 48 hours does not block the next post", async () => {
  const { db, env, fetchFn } = await setup();
  await setJob(db, { location: "arvada", taskId: "OLD", status: "pending", postedAt: "2026-10-10T00:00:00.000Z" });
  const r = await runPost(env, { now: NOW, fetchFn, sites: SITES });
  assert.equal(r[0].status, "posted");
  assert.equal((await getJob(db, "arvada")).task_id, "T1");
});

test("dry run posts nothing", async () => {
  const { db, env, fetchFn, calls } = await setup();
  const r = await runPost(env, { now: NOW, fetchFn, sites: SITES, dry: true });
  assert.equal(r[0].status, "would-post");
  assert.equal(calls.length, 0);
  assert.equal(await getJob(db, "arvada"), null);
});

test("a DataForSEO failure while posting is reported, not thrown", async () => {
  const { env, fetchFn, alerts, dfsBody } = await setup();
  dfsBody.current = { tasks: [{ status_code: 40501, status_message: "bad key" }] };
  const r = await runPost(env, { now: NOW, fetchFn, sites: SITES });
  assert.equal(r[0].status, "error");
  assert.match(alerts[0], /bad key/);
});

test("runCollect writes a ready result and marks the job done", async () => {
  const { db, env, fetchFn, dfsBody } = await setup();
  await setJob(db, { location: "arvada", taskId: "T1", status: "pending", postedAt: NOW.toISOString() });
  dfsBody.current = ready();
  const r = await runCollect(env, { now: NOW, fetchFn, sites: SITES });
  assert.equal(r[0].status, "written");
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM reviews").first()).n, 2);
  assert.equal((await getMeta(db, "arvada")).votes_count, 85);
  assert.equal((await getJob(db, "arvada")).status, "done");
});

test("runCollect leaves a queued task pending and writes nothing", async () => {
  const { db, env, fetchFn, dfsBody } = await setup();
  await setJob(db, { location: "arvada", taskId: "T1", status: "pending", postedAt: NOW.toISOString() });
  dfsBody.current = { tasks: [{ status_code: 40602 }] };
  assert.equal((await runCollect(env, { now: NOW, fetchFn, sites: SITES }))[0].status, "still-pending");
  assert.equal((await getJob(db, "arvada")).status, "pending");
});

test("a result for the wrong business is rejected, alerted, and writes nothing", async () => {
  const { db, env, fetchFn, alerts, dfsBody } = await setup();
  await setJob(db, { location: "arvada", taskId: "T1", status: "pending", postedAt: NOW.toISOString() });
  dfsBody.current = ready({ title: "Another Clinic" });
  const r = await runCollect(env, { now: NOW, fetchFn, sites: SITES });
  assert.equal(r[0].status, "rejected");
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM reviews").first()).n, 0);
  assert.equal((await getJob(db, "arvada")).status, "rejected");
  assert.match(alerts[0], /title mismatch/);
});

test("an empty pull never overwrites existing reviews", async () => {
  const { db, env, fetchFn, dfsBody } = await setup();
  await upsertResult(db, "arvada", { title: "New Leaf Hearing Care", placeId: "ChIJx", rating: 5, votesCount: 1, reviews: [{ review_id: "keep", author: "A", author_url: "", avatar_url: "", rating: 5, text: "x", time_ago: "", published_at: null, review_url: "", local_guide: 0, synced_at: "t" }] }, "t");
  await setJob(db, { location: "arvada", taskId: "T1", status: "pending", postedAt: NOW.toISOString() });
  dfsBody.current = ready({ items: [] });
  assert.equal((await runCollect(env, { now: NOW, fetchFn, sites: SITES }))[0].status, "rejected");
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM reviews").first()).n, 1);
});

test("runCatchUp marks a still-pending job stale and alerts", async () => {
  const { db, env, fetchFn, alerts, dfsBody } = await setup();
  await setJob(db, { location: "arvada", taskId: "T1", status: "pending", postedAt: "2026-10-18T13:00:00.000Z" });
  dfsBody.current = { tasks: [{ status_code: 40602 }] };
  const r = await runCatchUp(env, { now: new Date("2026-10-19T13:00:00.000Z"), fetchFn, sites: SITES });
  assert.equal(r[0].status, "stale");
  assert.equal((await getJob(db, "arvada")).status, "stale");
  assert.match(alerts.join(" "), /still pending/);
});

test("a rejected or failed job does not block the next Sunday post", async () => {
  for (const status of ["rejected", "failed"]) {
    const { db, env, fetchFn } = await setup();
    await upsertResult(db, "arvada", { title: "t", placeId: "p", rating: 5, votesCount: 1, reviews: [] }, "2026-10-10T00:00:00.000Z");
    await setJob(db, { location: "arvada", taskId: "X", status, postedAt: "2026-10-11T00:00:00.000Z" });
    assert.equal((await runPost(env, { now: NOW, fetchFn, sites: SITES }))[0].status, "posted");
  }
});

test("a schema failure on one site is reported and later sites still run", async () => {
  const { env, fetchFn, alerts } = await setup();
  const bad = { prepare() { throw new Error("d1 down"); }, exec() { throw new Error("d1 down"); }, batch() { throw new Error("d1 down"); } };
  env.BAD = bad;
  const sites = [{ site: "bad", dbBinding: "BAD", locations: [LOC] }, ...SITES];
  const r = await runPost(env, { now: NOW, fetchFn, sites });
  assert.equal(r[0].status, "error");
  assert.equal(r[1].status, "posted");
  assert.match(alerts[0], /d1 down/);
});

for (const [name, body, expected] of [
  ["good result", ready(), "would-write"],
  ["mismatched result", ready({ title: "Another Clinic" }), "would-reject"],
  ["DataForSEO error", { tasks: [{ status_code: 40501, status_message: "bad key" }] }, "would-fail"],
]) {
  test(`dry runCollect and runCatchUp change nothing: ${name}`, async () => {
    for (const fn of [runCollect, runCatchUp]) {
      const { db, env, fetchFn, alerts, dfsBody } = await setup();
      await setJob(db, { location: "arvada", taskId: "T1", status: "pending", postedAt: NOW.toISOString() });
      dfsBody.current = body;
      const before = await getJob(db, "arvada");
      const r = await fn(env, { now: NOW, fetchFn, sites: SITES, dry: true });
      assert.equal(fn === runCollect ? r[0].status : r[0].status === "ok" || r[0].status === "ok-alerted", fn === runCollect ? expected : true);
      assert.deepEqual(await getJob(db, "arvada"), before);
      assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM reviews").first()).n, 0);
      assert.deepEqual(alerts, []);
    }
  });
}

test("dry runCatchUp reports would-stale and changes nothing", async () => {
  const { db, env, fetchFn, alerts, dfsBody } = await setup();
  await setJob(db, { location: "arvada", taskId: "T1", status: "pending", postedAt: "2026-10-18T13:00:00.000Z" });
  dfsBody.current = { tasks: [{ status_code: 40602 }] };
  const before = await getJob(db, "arvada");
  const r = await runCatchUp(env, { now: new Date("2026-10-19T13:00:00.000Z"), fetchFn, sites: SITES, dry: true });
  assert.equal(r[0].status, "would-stale");
  assert.deepEqual(await getJob(db, "arvada"), before);
  assert.deepEqual(alerts, []);
});

test("runCatchUp does not double-alert a rejected location", async () => {
  const { db, env, fetchFn, alerts, dfsBody } = await setup();
  await setJob(db, { location: "arvada", taskId: "T1", status: "pending", postedAt: NOW.toISOString() });
  dfsBody.current = ready({ title: "Another Clinic" });
  const r = await runCatchUp(env, { now: NOW, fetchFn, sites: SITES });
  assert.equal(r[0].status, "ok-alerted");
  assert.equal(alerts.length, 1);
});
