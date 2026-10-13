# Reviews Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Cloudflare Worker, on a weekly cron, keeps Google reviews current in each site's D1 database for New Leaf, Ontario and Duet, and the sites read them at render time.

**Architecture:** A new Worker `workers/reviews-sync` holds a D1 binding per site and a config of locations. Sunday it posts one DataForSEO reviews task per location, then polls until the task is ready, validates the result, and upserts it. Each site gets a small identical reader that returns D1 data, or its committed JSON if D1 is empty or unreadable.

**Tech Stack:** Cloudflare Workers (cron triggers, D1), plain ES modules, `node:test` with `node:sqlite` as a fake D1, Astro 6 SSR pages, DataForSEO Business Data Google Reviews API.

**Spec:** `docs/specs/2026-10-13-reviews-sync-design.md`

## Global Constraints

- Node 24 (uses `node:sqlite` and `node:test`). The Worker has no runtime npm dependencies. `wrangler ^4.79.0` is a dev dependency.
- Cloudflare account `239e9d015c7a3a39cdc2e9400312f553`. D1 ids: New Leaf `6228c322-f3ea-4a88-9994-c32e2f3be379`, Ontario `3e408b59-75b2-4b13-aa9e-a41e17ff678c`, Duet `8cb09fcd-352f-4bdc-8190-cd9363341326`.
- Schedule: post Sunday `0 13 * * SUN`; collect `*/20 13-16 * * SUN`; catch-up Monday `0 13 * * MON`. Nothing runs outside those.
- A location is posted at most once per 6 days, and never while a job from the last 48 hours is pending.
- Weekly pull depth is **50 newest reviews** per location (`depth` in config). Cost scales with depth, and seeds already hold the history. Google totals come from `review_meta`.
- Never write an empty, failed or mismatched pull. Never overwrite the `hidden` column.
- Secrets are Worker secrets only: `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `SLACK_ALERTS_WEBHOOK`, `RUN_TOKEN`. No secret value appears in the repo, a log or a commit.
- Do not call the practice by any marketing-agency name in code or docs.
- Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Push recipe (the `vinceleyson-eng` account has no write access to this repo):
  `T=$(gh auth token --user vince112385); git -c credential.helper= -c "http.extraheader=Authorization: Basic $(printf 'x-access-token:%s' "$T" | base64 -w0)" push -u origin feat/reviews-sync`
- Run all commands from `C:\Clients\Bidview Marketing\github-organization\bidview-emdash-sites`.

## Review Focus

- A reviewer with no text (rating only): stored with null text and rendered without crashing.
- DataForSEO returns the same `review_id` twice in one pull: stored once.
- The listing was renamed or the Place ID now points at another business: rejected and alerted, nothing written. (Duet's listing is still titled "Lake Forest Hearing Professionals".)
- A brand-new or older D1 (no `hidden`, no `author_url`, no `review_jobs`): schema is created or migrated, and the reader falls back to JSON until data exists.
- A pending task that never completes, or a DataForSEO error mid-week: the job cannot block next week's post, and Slack is told.

## File Structure

New, in `workers/reviews-sync/`:
- `package.json`, `wrangler.jsonc`: package and Worker config.
- `src/config.js`: sites, D1 binding names, locations.
- `src/normalize.js`: DataForSEO result to rows.
- `src/db.js`: schema, migration, upserts, job and meta access.
- `src/dfs.js`: DataForSEO `task_post` and `task_get`.
- `src/alert.js`: Slack alert.
- `src/sync.js`: `runPost`, `runCollect`, `runCatchUp`, `validate`.
- `src/index.js`: cron dispatch and the token-gated `/run` endpoint.
- `reader/reviews-reader.mjs`: canonical site reader (copied into each site).
- `scripts/seed-sql.mjs`: builds seed SQL from a site's existing JSON.
- `tests/helpers/fake-d1.mjs` and `tests/*.test.mjs`.

Modified: each site gets `src/lib/reviews-reader.mjs` (copy) and a changed reviews page. Ontario's `src/worker.ts` skips the worker cache for review pages.

---

### Task 0: Verify the open items (read-only, no code)

**Files:** none changed. Record answers in `docs/specs/2026-10-13-reviews-sync-design.md` under "Open items" (replace each item with its verified answer).

- [ ] **Step 1: Branch.** `git fetch origin && git checkout -b feat/reviews-sync origin/docs/reviews-sync-spec`
- [ ] **Step 2: DataForSEO pricing.** Open https://dataforseo.com/apis/business-data-api/google-reviews-api and the pricing page. Record: price of `task_post` per 10 reviews of depth, and whether `task_get` / `tasks_ready` is billed. If `task_get` is billed, change the collect cron to a single extra check (see Task 5) before building further.
- [ ] **Step 3: D1 write access.** Run:
  `T=$(cat C:/Users/acer/.claude/credentials/cloudflare-cameron-token.txt); curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/239e9d015c7a3a39cdc2e9400312f553/d1/database/3e408b59-75b2-4b13-aa9e-a41e17ff678c/query" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d '{"sql":"SELECT 1 AS ok"}'`
  Expected: `"success":true`. Repeat for Duet (`8cb09fcd-352f-4bdc-8190-cd9363341326`). If either fails, stop and ask Vince for a token with D1 edit.
- [ ] **Step 4: Commit the answers.**
  `git add docs/specs && git commit -m "Record verified open items for reviews-sync" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

---

### Task 1: Worker package, config and fake D1

**Files:**
- Create: `workers/reviews-sync/package.json`, `workers/reviews-sync/src/config.js`, `workers/reviews-sync/tests/helpers/fake-d1.mjs`, `workers/reviews-sync/tests/fake-d1.test.mjs`

**Interfaces:**
- Produces: `SITES` (array of `{site, dbBinding, locations:[{key, placeId, label, depth, expectedTitleIncludes}]}`); `fakeD1()` returning an object with D1's `prepare(sql).bind(...).run()/all()/first()`, `batch(stmts)` and `exec(sql)`.

- [ ] **Step 1: Write `package.json`.**

```json
{
  "name": "reviews-sync",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "dev": "wrangler dev --test-scheduled",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^4.79.0"
  }
}
```

- [ ] **Step 2: Write `src/config.js`.**

```js
// One entry per site. Adding a client or a template site is a new entry here
// plus a D1 binding in wrangler.jsonc. Nothing else in the Worker is site-specific.
export const SITES = [
  {
    site: "new-leaf",
    dbBinding: "DB_NEW_LEAF",
    locations: [
      { key: "arvada", label: "Arvada", placeId: "ChIJB_NQqgeJa4cRS2-mBlxuxKE", depth: 50, expectedTitleIncludes: ["New Leaf"] },
      { key: "littleton", label: "Littleton", placeId: "ChIJf-CBToGBbIcRScDxPPAH700", depth: 50, expectedTitleIncludes: ["New Leaf"] },
    ],
  },
  {
    site: "ontario",
    dbBinding: "DB_ONTARIO",
    locations: [
      { key: "brighton", label: "Brighton", placeId: "ChIJq-Dls6fK1okRjkByx9QR3n8", depth: 50, expectedTitleIncludes: ["Ontario Hearing"] },
    ],
  },
  {
    site: "duet",
    dbBinding: "DB_DUET",
    locations: [
      // The Google listing still carries the pre-rebrand name "Lake Forest Hearing Professionals".
      { key: "lake-forest", label: "Lake Forest", placeId: "ChIJ1foTYNnqD4gRYzWwaQPCG_Q", depth: 50, expectedTitleIncludes: ["Duet", "Lake Forest Hearing"] },
    ],
  },
];
```

- [ ] **Step 3: Write the fake D1 test helper `tests/helpers/fake-d1.mjs`.**

```js
import { DatabaseSync } from "node:sqlite";

// In-memory stand-in for a Cloudflare D1 binding, backed by node:sqlite.
// Only the methods the Worker and the reader use are implemented.
export function fakeD1() {
  const sqlite = new DatabaseSync(":memory:");
  const clean = (params) => params.map((p) => (p === undefined ? null : p));
  const make = (sql, params = []) => ({
    bind: (...p) => make(sql, clean(p)),
    run: async () => {
      const r = sqlite.prepare(sql).run(...params);
      return { success: true, meta: { changes: Number(r.changes) } };
    },
    all: async () => ({ results: sqlite.prepare(sql).all(...params).map((r) => ({ ...r })) }),
    first: async () => {
      const r = sqlite.prepare(sql).get(...params);
      return r ? { ...r } : null;
    },
  });
  return {
    prepare: (sql) => make(sql),
    batch: async (stmts) => {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    exec: async (sql) => sqlite.exec(sql),
  };
}
```

- [ ] **Step 4: Write the test `tests/fake-d1.test.mjs`.**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { fakeD1 } from "./helpers/fake-d1.mjs";
import { SITES } from "../src/config.js";

test("fake D1 round-trips rows with bind, run, all and first", async () => {
  const db = fakeD1();
  await db.prepare("CREATE TABLE t (a TEXT, b INTEGER)").run();
  await db.prepare("INSERT INTO t (a,b) VALUES (?,?)").bind("x", 1).run();
  const all = await db.prepare("SELECT * FROM t").all();
  assert.deepEqual(all.results, [{ a: "x", b: 1 }]);
  assert.deepEqual(await db.prepare("SELECT * FROM t WHERE a=?").bind("x").first(), { a: "x", b: 1 });
  assert.equal(await db.prepare("SELECT * FROM t WHERE a=?").bind("nope").first(), null);
});

test("config has a unique binding per site and a Place ID per location", () => {
  const bindings = SITES.map((s) => s.dbBinding);
  assert.equal(new Set(bindings).size, bindings.length);
  for (const s of SITES) for (const l of s.locations) assert.match(l.placeId, /^ChIJ/);
});
```

- [ ] **Step 5: Run.** `cd workers/reviews-sync && npm install && npm test`
  Expected: 2 tests pass.
- [ ] **Step 6: Commit.**
  `git add workers/reviews-sync && git commit -m "reviews-sync: package, config and fake D1" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`
  (Add `workers/reviews-sync/node_modules/` to `.gitignore` first if the repo ignore does not already cover it. Check with `git status`.)

---

### Task 2: Normalize DataForSEO results

**Files:**
- Create: `workers/reviews-sync/src/normalize.js`, `workers/reviews-sync/tests/normalize.test.mjs`

**Interfaces:**
- Produces: `toIso(ts) -> string|null`; `normalizeItem(item, nowIso) -> row|null`; `normalizeResult(result, nowIso) -> {title, placeId, rating, votesCount, reviews[]}`. Row keys: `review_id, author, author_url, avatar_url, rating, text, time_ago, published_at, review_url, local_guide, synced_at`.

- [ ] **Step 1: Write the failing test.**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { toIso, normalizeItem, normalizeResult } from "../src/normalize.js";

test("toIso reads DataForSEO, date-only and ISO timestamps", () => {
  assert.equal(toIso("2026-08-11 17:31:56 +00:00"), "2026-08-11T17:31:56.000Z");
  assert.equal(toIso("2026-05-25"), "2026-05-25T00:00:00.000Z");
  assert.equal(toIso("2026-05-25T01:02:03.000Z"), "2026-05-25T01:02:03.000Z");
  assert.equal(toIso(""), null);
  assert.equal(toIso("garbage"), null);
});

test("a rating-only review keeps null text", () => {
  const row = normalizeItem({ review_id: "a1", profile_name: "Sam", rating: { value: 5 }, review_text: null }, "now");
  assert.equal(row.text, null);
  assert.equal(row.rating, 5);
  assert.equal(row.local_guide, 0);
});

test("items without a review_id are dropped", () => {
  assert.equal(normalizeItem({ profile_name: "x" }, "now"), null);
});

test("duplicate review_ids in one pull are stored once", () => {
  const result = {
    title: "T", place_id: "P", rating: { value: 4.9, votes_count: 85 },
    items: [{ review_id: "a", rating: { value: 5 } }, { review_id: "a", rating: { value: 1 } }, { review_id: "b", rating: { value: 4 } }],
  };
  const n = normalizeResult(result, "now");
  assert.equal(n.reviews.length, 2);
  assert.equal(n.reviews[0].rating, 5);
  assert.equal(n.votesCount, 85);
  assert.equal(n.placeId, "P");
});
```

- [ ] **Step 2: Run it.** `cd workers/reviews-sync && node --test tests/normalize.test.mjs`
  Expected: FAIL, cannot find `../src/normalize.js`.
- [ ] **Step 3: Write `src/normalize.js`.**

```js
// "2026-08-03 23:50:09 +00:00" -> ISO. Date-only and ISO inputs pass through.
export function toIso(ts) {
  if (!ts) return null;
  const d = new Date(String(ts).replace(" +00:00", "Z").replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizeItem(item, nowIso) {
  const id = item?.review_id;
  if (!id) return null;
  return {
    review_id: String(id),
    author: item.profile_name || "",
    author_url: item.profile_url || "",
    avatar_url: item.profile_image_url || "",
    rating: item.rating?.value ?? null,
    text: item.review_text || null,
    time_ago: item.time_ago || "",
    published_at: toIso(item.timestamp),
    review_url: item.review_url || "",
    local_guide: item.local_guide ? 1 : 0,
    synced_at: nowIso,
  };
}

export function normalizeResult(result, nowIso) {
  const rows = (result?.items || []).map((i) => normalizeItem(i, nowIso)).filter(Boolean);
  const seen = new Set();
  const reviews = rows.filter((r) => !seen.has(r.review_id) && seen.add(r.review_id));
  return {
    title: result?.title || "",
    placeId: result?.place_id || "",
    rating: result?.rating?.value ?? null,
    votesCount: result?.rating?.votes_count ?? null,
    reviews,
  };
}
```

- [ ] **Step 4: Run it.** Expected: 4 tests pass.
- [ ] **Step 5: Commit.** `git add workers/reviews-sync && git commit -m "reviews-sync: normalize DataForSEO results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

---

### Task 3: Database layer

**Files:**
- Create: `workers/reviews-sync/src/db.js`, `workers/reviews-sync/tests/db.test.mjs`

**Interfaces:**
- Consumes: row keys from Task 2.
- Produces: `SCHEMA_SQL` (string[]); `ensureSchema(db)`; `upsertResult(db, location, norm, nowIso)`; `getMeta(db, location)`; `getJob(db, location)`; `setJob(db, {location, taskId, status, postedAt})`. `review_jobs` columns: `location, task_id, status, posted_at`. Job statuses: `pending`, `done`, `failed`, `rejected`, `stale`.

- [ ] **Step 1: Write the failing test.**

```js
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
```

- [ ] **Step 2: Run it.** `node --test tests/db.test.mjs`. Expected: FAIL, cannot find `../src/db.js`.
- [ ] **Step 3: Write `src/db.js`.**

```js
export const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS reviews (
  review_id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  author TEXT,
  author_url TEXT,
  avatar_url TEXT,
  rating INTEGER,
  text TEXT,
  time_ago TEXT,
  published_at TEXT,
  review_url TEXT,
  local_guide INTEGER DEFAULT 0,
  synced_at TEXT,
  hidden INTEGER DEFAULT 0
)`,
  `CREATE INDEX IF NOT EXISTS reviews_location_idx ON reviews(location, published_at DESC)`,
  `CREATE TABLE IF NOT EXISTS review_meta (
  location TEXT PRIMARY KEY,
  title TEXT,
  place_id TEXT,
  rating REAL,
  votes_count INTEGER,
  synced_at TEXT
)`,
  `CREATE TABLE IF NOT EXISTS review_jobs (
  location TEXT PRIMARY KEY,
  task_id TEXT,
  status TEXT,
  posted_at TEXT
)`,
];

export async function ensureSchema(db) {
  for (const sql of SCHEMA_SQL) await db.prepare(sql).run();
  const info = await db.prepare("PRAGMA table_info(reviews)").all();
  const cols = new Set((info.results || []).map((c) => c.name));
  if (!cols.has("hidden")) await db.prepare("ALTER TABLE reviews ADD COLUMN hidden INTEGER DEFAULT 0").run();
  if (!cols.has("author_url")) await db.prepare("ALTER TABLE reviews ADD COLUMN author_url TEXT").run();
}

// The conflict update deliberately leaves `hidden` alone, so a hidden review stays hidden.
const UPSERT_REVIEW = `INSERT INTO reviews
  (review_id,location,author,author_url,avatar_url,rating,text,time_ago,published_at,review_url,local_guide,synced_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(review_id) DO UPDATE SET
    location=excluded.location, author=excluded.author, author_url=excluded.author_url,
    avatar_url=excluded.avatar_url, rating=excluded.rating, text=excluded.text,
    time_ago=excluded.time_ago, published_at=excluded.published_at, review_url=excluded.review_url,
    local_guide=excluded.local_guide, synced_at=excluded.synced_at`;

const UPSERT_META = `INSERT INTO review_meta (location,title,place_id,rating,votes_count,synced_at)
  VALUES (?,?,?,?,?,?)
  ON CONFLICT(location) DO UPDATE SET
    title=excluded.title, place_id=excluded.place_id, rating=excluded.rating,
    votes_count=excluded.votes_count, synced_at=excluded.synced_at`;

export async function upsertResult(db, location, norm, nowIso) {
  const stmts = norm.reviews.map((r) =>
    db.prepare(UPSERT_REVIEW).bind(
      r.review_id, location, r.author, r.author_url, r.avatar_url, r.rating, r.text,
      r.time_ago, r.published_at, r.review_url, r.local_guide, r.synced_at
    )
  );
  for (let i = 0; i < stmts.length; i += 40) await db.batch(stmts.slice(i, i + 40));
  await db.prepare(UPSERT_META).bind(location, norm.title, norm.placeId, norm.rating, norm.votesCount, nowIso).run();
}

export const getMeta = (db, location) =>
  db.prepare("SELECT location,title,place_id,rating,votes_count,synced_at FROM review_meta WHERE location = ?").bind(location).first();

export const getJob = (db, location) =>
  db.prepare("SELECT location,task_id,status,posted_at FROM review_jobs WHERE location = ?").bind(location).first();

export const setJob = (db, { location, taskId, status, postedAt }) =>
  db.prepare("INSERT OR REPLACE INTO review_jobs (location,task_id,status,posted_at) VALUES (?,?,?,?)")
    .bind(location, taskId, status, postedAt).run();
```

- [ ] **Step 4: Run it.** Expected: 5 tests pass.
- [ ] **Step 5: Commit.** `git add workers/reviews-sync && git commit -m "reviews-sync: D1 schema, migration and upserts" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

---

### Task 4: DataForSEO client and Slack alert

**Files:**
- Create: `workers/reviews-sync/src/dfs.js`, `workers/reviews-sync/src/alert.js`, `workers/reviews-sync/tests/dfs.test.mjs`

**Interfaces:**
- Produces: `postTask(env, loc, fetchFn?) -> taskId`; `getTask(env, taskId, fetchFn?) -> {state:"ready", result}|{state:"pending"}|{state:"error", message}`; `alert(env, text, fetchFn?) -> Promise<void>`.

- [ ] **Step 1: Write the failing test.**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { postTask, getTask } from "../src/dfs.js";
import { alert } from "../src/alert.js";

const env = { DATAFORSEO_LOGIN: "l", DATAFORSEO_PASSWORD: "p" };
const reply = (body) => async () => ({ json: async () => body });

test("postTask sends depth, sort and place_id and returns the task id", async () => {
  let sent;
  const fetchFn = async (url, init) => { sent = { url, init }; return { json: async () => ({ tasks: [{ id: "T1", status_code: 20100 }] }) }; };
  const id = await postTask(env, { key: "arvada", placeId: "ChIJx", depth: 50 }, fetchFn);
  assert.equal(id, "T1");
  const body = JSON.parse(sent.init.body)[0];
  assert.equal(body.place_id, "ChIJx");
  assert.equal(body.depth, 50);
  assert.equal(body.sort_by, "newest");
  assert.match(sent.init.headers.Authorization, /^Basic /);
});

test("postTask throws on a rejected task", async () => {
  await assert.rejects(postTask(env, { key: "k", placeId: "p" }, reply({ tasks: [{ status_code: 40501, status_message: "bad" }] })), /task_post failed/);
});

test("getTask maps ready, queued and error states", async () => {
  assert.equal((await getTask(env, "T", reply({ tasks: [{ status_code: 20000, result: [{ title: "x" }] }] }))).state, "ready");
  assert.equal((await getTask(env, "T", reply({ tasks: [{ status_code: 40602, status_message: "in queue" }] }))).state, "pending");
  assert.equal((await getTask(env, "T", reply({ tasks: [{ status_code: 40601 }] }))).state, "pending");
  assert.equal((await getTask(env, "T", reply({ tasks: [{ status_code: 20100 }] }))).state, "pending");
  const err = await getTask(env, "T", reply({ tasks: [{ status_code: 50000, status_message: "boom" }] }));
  assert.equal(err.state, "error");
  assert.match(err.message, /boom/);
});

test("alert posts to Slack when a webhook is set and is silent otherwise", async () => {
  let called = 0;
  const fetchFn = async () => { called++; return {}; };
  await alert({}, "no webhook", fetchFn);
  assert.equal(called, 0);
  await alert({ SLACK_ALERTS_WEBHOOK: "https://example.invalid/h" }, "hello", fetchFn);
  assert.equal(called, 1);
  await alert({ SLACK_ALERTS_WEBHOOK: "https://example.invalid/h" }, "x", async () => { throw new Error("net"); });
});
```

- [ ] **Step 2: Run it.** `node --test tests/dfs.test.mjs`. Expected: FAIL, modules not found.
- [ ] **Step 3: Write `src/dfs.js`.**

```js
const BASE = "https://api.dataforseo.com/v3/business_data/google/reviews";

const headers = (env) => ({
  Authorization: "Basic " + btoa(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`),
  "Content-Type": "application/json",
});

export async function postTask(env, loc, fetchFn = fetch) {
  const res = await fetchFn(`${BASE}/task_post`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify([{
      place_id: loc.placeId,
      language_name: "English",
      location_name: "United States",
      depth: loc.depth ?? 50,
      sort_by: "newest",
      tag: loc.key,
    }]),
    signal: AbortSignal.timeout(30000),
  });
  const task = (await res.json())?.tasks?.[0];
  if (!task?.id || (task.status_code && task.status_code >= 40000)) {
    throw new Error(`task_post failed: ${task?.status_code} ${task?.status_message}`);
  }
  return task.id;
}

// 20000 with a result is ready. 40601 (handed) and 40602 (in queue) mean still working.
// Any other 4xxxx or 5xxxx is an error.
export async function getTask(env, taskId, fetchFn = fetch) {
  const res = await fetchFn(`${BASE}/task_get/${encodeURIComponent(taskId)}`, {
    headers: headers(env),
    signal: AbortSignal.timeout(30000),
  });
  const task = (await res.json())?.tasks?.[0];
  if (task?.status_code === 20000 && task.result?.[0]) return { state: "ready", result: task.result[0] };
  const code = task?.status_code;
  if (code >= 40000 && code !== 40601 && code !== 40602) {
    return { state: "error", message: `${code} ${task?.status_message}` };
  }
  return { state: "pending" };
}
```

- [ ] **Step 4: Write `src/alert.js`.**

```js
export async function alert(env, text, fetchFn = fetch) {
  console.error("[reviews-sync]", text);
  if (!env.SLACK_ALERTS_WEBHOOK) return;
  try {
    await fetchFn(env.SLACK_ALERTS_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `:rotating_light: ${text}` }),
    });
  } catch {
    // An alert failure must never break the sync.
  }
}
```

- [ ] **Step 5: Run it.** Expected: 4 tests pass.
- [ ] **Step 6: Commit.** `git add workers/reviews-sync && git commit -m "reviews-sync: DataForSEO client and Slack alert" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

---

### Task 5: Sync logic

**Files:**
- Create: `workers/reviews-sync/src/sync.js`, `workers/reviews-sync/tests/sync.test.mjs`

**Interfaces:**
- Consumes: Tasks 1 to 4.
- Produces: `validate(loc, norm) -> string|null`; `runPost(env, opts)`, `runCollect(env, opts)`, `runCatchUp(env, opts)`, each returning an array of `{site, location, status, ...}`. `opts` = `{now?: Date, fetchFn?, sites?, dry?: boolean}`. Result statuses: `posted`, `skipped-pending`, `skipped-recent`, `would-post`, `error`, `idle`, `still-pending`, `written`, `would-write`, `rejected`, `failed`, `stale`.

- [ ] **Step 1: Write the failing test.**

```js
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
  const good = { title: "New Leaf Hearing Care", placeId: "ChIJx", reviews: [{}] };
  assert.equal(validate(LOC, good), null);
  assert.match(validate(LOC, { ...good, placeId: "ChIJother" }), /place_id mismatch/);
  assert.match(validate(LOC, { ...good, title: "Some Other Clinic" }), /title mismatch/);
  assert.match(validate(LOC, { ...good, reviews: [] }), /no reviews/);
  assert.equal(validate(LOC, { ...good, placeId: "" }), null);
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
```

- [ ] **Step 2: Run it.** `node --test tests/sync.test.mjs`. Expected: FAIL, cannot find `../src/sync.js`.
- [ ] **Step 3: Write `src/sync.js`.**

```js
import { SITES } from "./config.js";
import { ensureSchema, getJob, getMeta, setJob, upsertResult } from "./db.js";
import { getTask, postTask } from "./dfs.js";
import { normalizeResult } from "./normalize.js";
import { alert } from "./alert.js";

const HOUR = 3600000;
const DAY = 24 * HOUR;
export const MIN_RESYNC_DAYS = 6;
export const PENDING_EXPIRES_HOURS = 48;
export const STALE_SYNC_DAYS = 10;

export function validate(loc, norm) {
  if (norm.placeId && norm.placeId !== loc.placeId) {
    return `place_id mismatch: got ${norm.placeId}, expected ${loc.placeId}`;
  }
  const want = loc.expectedTitleIncludes || [];
  if (want.length && !want.some((w) => norm.title.toLowerCase().includes(w.toLowerCase()))) {
    return `title mismatch: got "${norm.title}"`;
  }
  if (norm.reviews.length === 0) return "pull returned no reviews";
  return null;
}

async function eachLocation(env, sites, fn) {
  const out = [];
  for (const site of sites) {
    const db = env[site.dbBinding];
    if (!db) {
      out.push({ site: site.site, status: "no-db" });
      await alert(env, `reviews-sync: no D1 binding ${site.dbBinding} for ${site.site}`);
      continue;
    }
    await ensureSchema(db);
    for (const loc of site.locations) {
      const r = { site: site.site, location: loc.key };
      try {
        await fn({ db, site, loc, r });
      } catch (e) {
        r.status = "error";
        r.error = String(e?.message || e);
        await alert(env, `reviews-sync error for ${site.site}/${loc.key}: ${r.error}`);
      }
      out.push(r);
    }
  }
  return out;
}

export async function runPost(env, { now = new Date(), fetchFn = fetch, sites = SITES, dry = false } = {}) {
  return eachLocation(env, sites, async ({ db, loc, r }) => {
    const job = await getJob(db, loc.key);
    const meta = await getMeta(db, loc.key);
    if (job?.status === "pending" && now - Date.parse(job.posted_at) < PENDING_EXPIRES_HOURS * HOUR) {
      r.status = "skipped-pending";
    } else if (meta?.synced_at && now - Date.parse(meta.synced_at) < MIN_RESYNC_DAYS * DAY) {
      r.status = "skipped-recent";
    } else if (dry) {
      r.status = "would-post";
    } else {
      const taskId = await postTask(env, loc, fetchFn);
      await setJob(db, { location: loc.key, taskId, status: "pending", postedAt: now.toISOString() });
      r.status = "posted";
      r.taskId = taskId;
    }
  });
}

export async function runCollect(env, { now = new Date(), fetchFn = fetch, sites = SITES, dry = false } = {}) {
  return eachLocation(env, sites, async ({ db, site, loc, r }) => {
    const job = await getJob(db, loc.key);
    if (job?.status !== "pending") { r.status = "idle"; return; }
    const keep = { location: loc.key, taskId: job.task_id, postedAt: job.posted_at };
    const t = await getTask(env, job.task_id, fetchFn);
    if (t.state === "pending") { r.status = "still-pending"; return; }
    if (t.state === "error") {
      await setJob(db, { ...keep, status: "failed" });
      r.status = "failed";
      r.error = t.message;
      await alert(env, `reviews-sync: DataForSEO task failed for ${site.site}/${loc.key}: ${t.message}`, fetchFn);
      return;
    }
    const norm = normalizeResult(t.result, now.toISOString());
    const problem = validate(loc, norm);
    if (problem) {
      await setJob(db, { ...keep, status: "rejected" });
      r.status = "rejected";
      r.reason = problem;
      await alert(env, `reviews-sync: rejected ${site.site}/${loc.key}: ${problem}. Nothing was written.`, fetchFn);
      return;
    }
    if (dry) { r.status = "would-write"; r.count = norm.reviews.length; return; }
    await upsertResult(db, loc.key, norm, now.toISOString());
    await setJob(db, { ...keep, status: "done" });
    r.status = "written";
    r.count = norm.reviews.length;
  });
}

export async function runCatchUp(env, opts = {}) {
  const { now = new Date(), fetchFn = fetch, sites = SITES } = opts;
  await runCollect(env, opts);
  return eachLocation(env, sites, async ({ db, site, loc, r }) => {
    const job = await getJob(db, loc.key);
    const meta = await getMeta(db, loc.key);
    if (job?.status === "pending") {
      await setJob(db, { location: loc.key, taskId: job.task_id, status: "stale", postedAt: job.posted_at });
      r.status = "stale";
      await alert(env, `reviews-sync: ${site.site}/${loc.key} task ${job.task_id} is still pending after the weekend. It will be re-posted next Sunday.`, fetchFn);
    } else if (!meta?.synced_at || now - Date.parse(meta.synced_at) > STALE_SYNC_DAYS * DAY) {
      r.status = "stale-data";
      await alert(env, `reviews-sync: ${site.site}/${loc.key} has not synced in over ${STALE_SYNC_DAYS} days.`, fetchFn);
    } else {
      r.status = "ok";
    }
  });
}
```

- [ ] **Step 4: Run it.** Expected: 11 tests pass. If `runCatchUp` double-alerts in any test, the alert array assertion uses `join`, so duplicates do not fail it.
- [ ] **Step 5: Commit.** `git add workers/reviews-sync && git commit -m "reviews-sync: weekly post, collect and catch-up logic" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

---

### Task 6: Worker entry, wrangler config and cron drift test

**Files:**
- Create: `workers/reviews-sync/src/index.js`, `workers/reviews-sync/wrangler.jsonc`, `workers/reviews-sync/tests/index.test.mjs`

**Interfaces:**
- Consumes: Task 5 functions.
- Produces: `CRONS = {post, collect, catchup}`; `dispatch(cron, env, opts)`; default export `{scheduled, fetch}`. `POST /run?mode=post|collect|catchup[&site=<site>][&dry=1]` with header `x-run-token` equal to `RUN_TOKEN`. `GET /health` returns `ok`.

- [ ] **Step 1: Write the failing test.**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker, { CRONS, dispatch } from "../src/index.js";

test("wrangler.jsonc lists exactly the cron schedules the code dispatches on", () => {
  const cfg = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.deepEqual([...cfg.triggers.crons].sort(), Object.values(CRONS).sort());
});

test("wrangler.jsonc binds a D1 database for every configured site", async () => {
  const cfg = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  const { SITES } = await import("../src/config.js");
  const bound = new Set(cfg.d1_databases.map((d) => d.binding));
  for (const s of SITES) assert.ok(bound.has(s.dbBinding), s.dbBinding);
});

test("an unknown cron does nothing", async () => {
  assert.deepEqual(await dispatch("1 2 3 4 5", {}), [{ status: "unknown-cron", cron: "1 2 3 4 5" }]);
});

test("/run rejects a missing or wrong token and /health is open", async () => {
  const env = { RUN_TOKEN: "secret" };
  const bad = await worker.fetch(new Request("https://x/run?mode=post", { method: "POST" }), env);
  assert.equal(bad.status, 403);
  const wrong = await worker.fetch(new Request("https://x/run?mode=post", { method: "POST", headers: { "x-run-token": "nope" } }), env);
  assert.equal(wrong.status, 403);
  assert.equal(await (await worker.fetch(new Request("https://x/health"), env)).text(), "ok");
  const noSecret = await worker.fetch(new Request("https://x/run?mode=post", { method: "POST", headers: { "x-run-token": "" } }), {});
  assert.equal(noSecret.status, 403);
});

test("/run with a good token and a bad mode returns 400", async () => {
  const r = await worker.fetch(new Request("https://x/run?mode=bogus", { method: "POST", headers: { "x-run-token": "secret" } }), { RUN_TOKEN: "secret" });
  assert.equal(r.status, 400);
});
```

- [ ] **Step 2: Run it.** `node --test tests/index.test.mjs`. Expected: FAIL, modules not found.
- [ ] **Step 3: Write `wrangler.jsonc` (plain JSON, no comments, so the test can parse it).**

```json
{
  "name": "reviews-sync",
  "main": "src/index.js",
  "account_id": "239e9d015c7a3a39cdc2e9400312f553",
  "compatibility_date": "2026-03-29",
  "triggers": { "crons": ["0 13 * * SUN", "*/20 13-16 * * SUN", "0 13 * * MON"] },
  "d1_databases": [
    { "binding": "DB_NEW_LEAF", "database_name": "new-leaf-hearing-care-db", "database_id": "6228c322-f3ea-4a88-9994-c32e2f3be379" },
    { "binding": "DB_ONTARIO", "database_name": "ontario-hearing-db", "database_id": "3e408b59-75b2-4b13-aa9e-a41e17ff678c" },
    { "binding": "DB_DUET", "database_name": "duet-audiology-db", "database_id": "8cb09fcd-352f-4bdc-8190-cd9363341326" }
  ],
  "observability": { "enabled": true }
}
```

- [ ] **Step 4: Write `src/index.js`.**

```js
import { SITES } from "./config.js";
import { runCatchUp, runCollect, runPost } from "./sync.js";

// These strings must match wrangler.jsonc. tests/index.test.mjs fails if they drift.
export const CRONS = {
  post: "0 13 * * SUN",
  collect: "*/20 13-16 * * SUN",
  catchup: "0 13 * * MON",
};

export async function dispatch(cron, env, opts = {}) {
  if (cron === CRONS.post) return runPost(env, opts);
  if (cron === CRONS.collect) return runCollect(env, opts);
  if (cron === CRONS.catchup) return runCatchUp(env, opts);
  return [{ status: "unknown-cron", cron }];
}

async function tokenOk(got, want) {
  if (!got || !want) return false;
  const enc = new TextEncoder();
  const a = enc.encode(got);
  const b = enc.encode(want);
  if (a.length !== b.length) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(dispatch(event.cron, env, { dry: env.DRY_RUN === "1" }));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("ok");
    if (url.pathname === "/run" && request.method === "POST") {
      if (!(await tokenOk(request.headers.get("x-run-token"), env.RUN_TOKEN))) {
        return new Response("forbidden", { status: 403 });
      }
      const cron = CRONS[url.searchParams.get("mode")];
      if (!cron) return new Response("mode must be post, collect or catchup", { status: 400 });
      const only = url.searchParams.get("site");
      const sites = only ? SITES.filter((s) => s.site === only) : SITES;
      const dry = url.searchParams.get("dry") === "1" || env.DRY_RUN === "1";
      return Response.json(await dispatch(cron, env, { dry, sites }));
    }
    return new Response("not found", { status: 404 });
  },
};
```

- [ ] **Step 5: Run the whole suite.** `npm test`. Expected: all tests across the five files pass (about 28).
- [ ] **Step 6: Commit.** `git add workers/reviews-sync && git commit -m "reviews-sync: cron dispatch, manual run endpoint and wrangler config" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

---

### Task 7: Shared site reader and drift test

**Files:**
- Create: `workers/reviews-sync/reader/reviews-reader.mjs`, `workers/reviews-sync/tests/reader.test.mjs`

**Interfaces:**
- Produces: `getLocationReviews(db, location, fallback) -> {label?, placeId, rating, votesCount, syncedAt?, source:"d1"|"fallback", reviews:[{id, author, authorUrl, avatar, rating, text, timeAgo, publishedAt, url, localGuide}]}`. `fallback` is the same shape and may be undefined (then an empty result is returned). New Leaf's existing JSON already has this shape.

- [ ] **Step 1: Write the failing test.**

```js
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
```

- [ ] **Step 2: Run it.** `node --test tests/reader.test.mjs`. Expected: FAIL, reader not found.
- [ ] **Step 3: Write `reader/reviews-reader.mjs`.**

```js
// Canonical reader. Each site keeps an identical copy at src/lib/reviews-reader.mjs
// (tests/reader.test.mjs fails if a copy drifts). Edit this file, then copy it.

/**
 * @param {{prepare: Function} | null | undefined} db  a D1 binding
 * @param {string} location  location key, e.g. "arvada"
 * @param {object | undefined} fallback  same shape as the return value, used when D1 has nothing
 */
export async function getLocationReviews(db, location, fallback) {
  const fb = { reviews: [], ...(fallback || {}), source: "fallback" };
  if (!db) return fb;
  try {
    const meta = await db
      .prepare("SELECT title, place_id, rating, votes_count, synced_at FROM review_meta WHERE location = ?")
      .bind(location)
      .first();
    const rows = await db
      .prepare(
        `SELECT review_id, author, author_url, avatar_url, rating, text, time_ago, published_at, review_url, local_guide
         FROM reviews WHERE location = ? AND (hidden IS NULL OR hidden = 0)
         ORDER BY published_at DESC`
      )
      .bind(location)
      .all();
    const list = rows?.results ?? [];
    if (!meta || list.length === 0) return fb;
    return {
      label: fallback?.label,
      placeId: meta.place_id,
      rating: meta.rating,
      votesCount: meta.votes_count,
      syncedAt: meta.synced_at,
      source: "d1",
      reviews: list.map((r) => ({
        id: r.review_id,
        author: r.author || "",
        authorUrl: r.author_url || "",
        avatar: r.avatar_url || "",
        rating: r.rating,
        text: r.text || "",
        timeAgo: r.time_ago || "",
        publishedAt: r.published_at || "",
        url: r.review_url || "",
        localGuide: !!r.local_guide,
      })),
    };
  } catch {
    return fb;
  }
}
```

- [ ] **Step 4: Run it.** Expected: 4 tests pass.
- [ ] **Step 5: Commit.** `git add workers/reviews-sync && git commit -m "reviews-sync: shared site reader with fallback" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

---

### Task 8: Seed script for Ontario and Duet

**Files:**
- Create: `workers/reviews-sync/scripts/seed-sql.mjs`, `workers/reviews-sync/tests/seed.test.mjs`

**Interfaces:**
- Consumes: `SCHEMA_SQL` (Task 3), `toIso` (Task 2).
- Produces: `buildSeedSql(site, repoRoot) -> string` and a CLI: `node scripts/seed-sql.mjs <ontario|duet> > file.sql`. Uses `INSERT OR IGNORE`, so re-running never touches a hidden review.

- [ ] **Step 1: Write the failing test.**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { buildSeedSql } from "../scripts/seed-sql.mjs";

const ROOT = resolve(import.meta.dirname, "../../..");

for (const [site, location, minReviews] of [["ontario", "brighton", 60], ["duet", "lake-forest", 50]]) {
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
}
```

- [ ] **Step 2: Run it.** `node --test tests/seed.test.mjs`. Expected: FAIL, script not found.
- [ ] **Step 3: Write `scripts/seed-sql.mjs`.**

```js
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";
import { toIso } from "../src/normalize.js";

const q = (v) => (v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const read = (root, rel) => JSON.parse(readFileSync(resolve(root, rel), "utf8"));

const LOADERS = {
  ontario(root) {
    const j = read(root, "sites/ontario-hearing/src/data/reviews.json");
    return {
      location: "brighton", title: j.business, placeId: "ChIJq-Dls6fK1okRjkByx9QR3n8",
      rating: j.rating, votes: j.review_count,
      reviews: j.reviews.map((r) => ({
        id: r.review_id, author: r.name, authorUrl: "", avatar: "", rating: r.rating, text: r.text,
        timeAgo: "", publishedAt: toIso(r.date), url: "", localGuide: r.local_guide ? 1 : 0,
      })),
    };
  },
  duet(root) {
    const j = read(root, "sites/duet-audiology/src/data/google-reviews.json");
    return {
      location: "lake-forest", title: j.sourceProfileName || j.businessName, placeId: j.placeId,
      rating: j.googleRating, votes: j.googleReviewCount,
      reviews: j.reviews.map((r) => ({
        id: r.id, author: r.authorName, authorUrl: r.authorUrl, avatar: r.profileImageUrl, rating: r.rating,
        text: r.text || null, timeAgo: r.relativeTime, publishedAt: toIso(r.timestamp), url: r.reviewUrl, localGuide: 0,
      })),
    };
  },
};

export function buildSeedSql(site, root) {
  const load = LOADERS[site];
  if (!load) throw new Error(`unknown site "${site}" (use ontario or duet)`);
  const d = load(root);
  const now = new Date().toISOString();
  const lines = SCHEMA_SQL.map((s) => s + ";");
  for (const r of d.reviews) {
    lines.push(
      `INSERT OR IGNORE INTO reviews (review_id,location,author,author_url,avatar_url,rating,text,time_ago,published_at,review_url,local_guide,synced_at) VALUES (${[
        q(r.id), q(d.location), q(r.author), q(r.authorUrl), q(r.avatar), q(r.rating), q(r.text),
        q(r.timeAgo), q(r.publishedAt), q(r.url), q(r.localGuide), q(now),
      ].join(",")});`
    );
  }
  // Seeded, not synced: an old synced_at makes the first Sunday run pull fresh data.
  lines.push(
    `INSERT OR IGNORE INTO review_meta (location,title,place_id,rating,votes_count,synced_at) VALUES (${[
      q(d.location), q(d.title), q(d.placeId), q(d.rating), q(d.votes), q("2000-01-01T00:00:00.000Z"),
    ].join(",")});`
  );
  return lines.join("\n");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  const site = process.argv[2];
  const root = resolve(import.meta.dirname, "../../..");
  process.stdout.write(buildSeedSql(site, root) + "\n");
}
```

- [ ] **Step 4: Run it.** Expected: 2 tests pass. If Ontario's count is below 60, print `j.reviews.length` and fix the threshold to the real number minus nothing; do not weaken the idempotency assertion.
- [ ] **Step 5: Commit.** `git add workers/reviews-sync && git commit -m "reviews-sync: seed SQL for Ontario and Duet" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

---

### Task 9: Deploy the Worker and run it dry

**Files:** none in git. Secrets and deployment only.

- [ ] **Step 1: Push the branch.** Use the push recipe in Global Constraints.
- [ ] **Step 2: Set secrets.** From `workers/reviews-sync`, with `CLOUDFLARE_API_TOKEN` set from `C:/Users/acer/.claude/credentials/cloudflare-cameron-token.txt` for the shell session only:
  `npx wrangler secret put DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` (values from the DataForSEO section of `C:/Users/acer/.claude/credentials/apis.md`), `SLACK_ALERTS_WEBHOOK` (the `#bidview-alerts` webhook; if it is not on disk, ask Vince, do not guess), and `RUN_TOKEN` (generate with `openssl rand -hex 24`, save it to `C:/Users/acer/.claude/credentials/reviews-sync.md`, and never print it).
  Also set `DRY_RUN` to `1`: `npx wrangler secret put DRY_RUN` and enter `1`, so the first live cron cannot spend money before you check it.
- [ ] **Step 3: Seed Ontario and Duet.** The seed is for fresh databases only (INSERT OR IGNORE, CREATE TABLE IF NOT EXISTS): do not run it on New Leaf, and abort if the generated SQL is empty. For each site, from `workers/reviews-sync`:
  `node scripts/seed-sql.mjs ontario > ../../seed-ontario.sql` then `npx wrangler d1 execute ontario-hearing-db --remote --file ../../seed-ontario.sql`; same with `duet` and `duet-audiology-db`. Delete the two `.sql` files afterwards (do not commit them). Expected: `"success": true`.
- [ ] **Step 4: Deploy.** `npm run deploy`. Expected: a `reviews-sync.<subdomain>.workers.dev` URL and three cron triggers listed.
- [ ] **Step 5: Health and dry run.**
  `curl https://<url>/health` → `ok`.
  `curl -X POST "https://<url>/run?mode=post&dry=1" -H "x-run-token: <RUN_TOKEN>"` → every location `would-post` (Ontario and Duet were seeded with an old `synced_at`; New Leaf's last sync was 2026-08-07, so it also qualifies).
  A dry run spends no DataForSEO money and writes no reviews or job rows, but it does create or migrate the schema (additive: `hidden`, `author_url`, `review_jobs`).
- [ ] **Step 6: One real pull for ONE site, with `live=1` for this call only.** Use `live=1` on the /run call so DRY_RUN can stay set until all three sites have written once: `curl -X POST "https://<url>/run?mode=post&site=duet&live=1" -H "x-run-token: <RUN_TOKEN>"` → `posted`. Wait 5 minutes, then `curl -X POST "https://<url>/run?mode=collect&site=duet&live=1" ...` → `written`, then again after another run it should say `idle`. If it says `rejected`, read the reason: a title or Place ID mismatch is the guard working, so fix `expectedTitleIncludes` in `src/config.js`, redeploy and retry.
- [ ] **Step 7: Verify the data.** `npx wrangler d1 execute duet-audiology-db --remote --command "SELECT COUNT(*) n, MAX(published_at) newest FROM reviews WHERE location='lake-forest'"`. Compare the count and newest date with the Google listing in a browser. Then do the same single-site post and collect for `ontario` and `new-leaf`.
- [ ] **Step 8: Leave production armed.** After all three sites show `written`, delete DRY_RUN (`npx wrangler secret delete DRY_RUN`), on a weekday (never Sunday 13:00-17:00 UTC). Nothing else is needed: the crons now run weekly. Record the Worker URL and the date in `docs/specs/2026-10-13-reviews-sync-design.md` ("Deployed 2026-10-xx at ...") and commit.

---

### Task 10: Duet reads D1

**Files:**
- Create: `sites/duet-audiology/src/lib/reviews-reader.mjs` (copy of the canonical reader)
- Modify: `sites/duet-audiology/src/pages/reviews.astro:2-5` (the import and `const reviews` lines)

- [ ] **Step 1: Copy the reader.** `mkdir -p sites/duet-audiology/src/lib && cp workers/reviews-sync/reader/reviews-reader.mjs sites/duet-audiology/src/lib/reviews-reader.mjs`
- [ ] **Step 2: Edit the page frontmatter.** Replace these two lines:

```astro
import reviewData from '../data/google-reviews.json';

const reviews = reviewData.reviews;
```

with:

```astro
import fallbackData from '../data/google-reviews.json';
import { env } from 'cloudflare:workers';
import { getLocationReviews } from '../lib/reviews-reader.mjs';

// Reviews come from D1 (kept current by the reviews-sync Worker). The committed JSON is the
// fallback if D1 is empty or unreadable, so a page can never go blank.
const live = await getLocationReviews(env.DB, 'lake-forest', {
  placeId: fallbackData.placeId,
  rating: fallbackData.googleRating,
  votesCount: fallbackData.googleReviewCount,
  reviews: fallbackData.reviews.map((r) => ({
    id: r.id, author: r.authorName, authorUrl: r.authorUrl, avatar: r.profileImageUrl, rating: r.rating,
    text: r.text, timeAgo: r.relativeTime, publishedAt: r.timestamp, url: r.reviewUrl, localGuide: false,
  })),
});
const reviewData = {
  placeId: live.placeId || fallbackData.placeId,
  googleRating: live.rating ?? fallbackData.googleRating,
  googleReviewCount: live.votesCount ?? fallbackData.googleReviewCount,
};
const reviews = live.reviews.map((r) => ({
  id: r.id, authorName: r.author, authorUrl: r.authorUrl, profileImageUrl: r.avatar, rating: r.rating,
  text: r.text, timestamp: r.publishedAt, relativeTime: r.timeAgo, language: '', reviewUrl: r.url,
}));
```

The template below the frontmatter keeps using `reviews`, `reviewData.placeId`, `reviewData.googleRating` and `reviewData.googleReviewCount` unchanged.
- [ ] **Step 3: Build.** `cd sites/duet-audiology && npm run build`. Expected: success.
- [ ] **Step 4: Preview and check.** `npx wrangler versions upload` (a non-live version, as the dev-agent does) and open the preview URL `/reviews/`. Check: the same reviews appear, the rating line reads like `4.6 out of 5`, and a review added by the Worker shows. Take a desktop and a mobile screenshot and look at them.
- [ ] **Step 5: Run the drift test.** `cd ../../workers/reviews-sync && npm test`. Expected: pass.
- [ ] **Step 6: Commit.** `git add sites/duet-audiology && git commit -m "duet: read reviews from D1 with JSON fallback" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`
- [ ] **Step 7: Go live only after Vince approves the preview.** `cd sites/duet-audiology && npx wrangler deploy`, then `curl -s https://duethearing.com/reviews/ | grep -c "review-card"` and compare with the preview.

---

### Task 11: Ontario reads D1 and skips the worker cache on review pages

**Files:**
- Create: `sites/ontario-hearing/src/lib/reviews-reader.mjs` (copy)
- Modify: `sites/ontario-hearing/src/components/ReviewsPage.astro:4,18-19,37-38` (verify the exact lines first with `grep -n "reviewsData" sites/ontario-hearing/src/components/ReviewsPage.astro`)
- Modify: `sites/ontario-hearing/src/worker.ts:5,8`

- [ ] **Step 1: Copy the reader** to `sites/ontario-hearing/src/lib/reviews-reader.mjs`.
- [ ] **Step 2: Edit `ReviewsPage.astro`.** Replace `import reviewsData from "../data/reviews.json";` with:

```astro
import fallbackData from "../data/reviews.json";
import { env } from "cloudflare:workers";
import { getLocationReviews } from "../lib/reviews-reader.mjs";
```

Replace the line `const ALL = reviewsData.reviews as Array<{ name: string; rating: number; date: string; text: string; local_guide: boolean; review_id: string }>;` with:

```astro
// Reviews come from D1 (kept current by the reviews-sync Worker); the committed JSON is the fallback.
const live = await getLocationReviews(env.DB, "brighton", {
  rating: fallbackData.rating,
  votesCount: fallbackData.review_count,
  reviews: fallbackData.reviews.map((r: any) => ({
    id: r.review_id, author: r.name, rating: r.rating, text: r.text, publishedAt: r.date, localGuide: r.local_guide,
  })),
});
const reviewsData = { rating: live.rating, review_count: live.votesCount };
const ALL = live.reviews.map((r: any) => ({
  name: r.author, rating: r.rating, date: typeof r.publishedAt === "string" ? r.publishedAt.slice(0, 10) : "",
  text: r.text, local_guide: r.localGuide, review_id: r.id,
})) as Array<{ name: string; rating: number; date: string; text: string; local_guide: boolean; review_id: string }>;
```

The later lines `const rating = reviewsData.rating;` and `const total = reviewsData.review_count;` keep working.
- [ ] **Step 3: Edit `src/worker.ts`.** Bump the version on line 5 (`v99` to `v100`). Leave `SKIP_CACHE_PATHS` unchanged: Ontario keeps its existing one-hour worker cache, so review pages refresh within an hour of a sync.

```ts
const SKIP_CACHE_PATHS = ["/_emdash", "/api"]; // unchanged
```
- [ ] **Step 4: Build.** `cd sites/ontario-hearing && npm run build`. Expected: success.
- [ ] **Step 5: Preview and check.** Upload a non-live version, open `/brighton-reviews/`, `/fairport-reviews/`, `/greece-reviews/` and `/pittsford-reviews/`. Check each page shows a distinct slice of reviews (the city split must still put every review on exactly one page), the rating reads 5, and the count matches Google. Take desktop and mobile screenshots and look at them. Confirm `X-Cache-Status` is present on a second request to each page (MISS then HIT), i.e. the one-hour worker cache still applies.
- [ ] **Step 6: Drift test and commit.** `cd ../../workers/reviews-sync && npm test`, then `git add sites/ontario-hearing && git commit -m "ontario: read reviews from D1, skip worker cache on review pages" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`
- [ ] **Step 7: Go live only after Vince approves the preview.** `npx wrangler deploy`, then fetch each of the four pages and confirm 200 and review markup.

---

### Task 12: New Leaf reads D1

**Files:**
- Create: `sites/new-leaf-hearing-care/src/lib/reviews-reader.mjs` (copy)
- Modify: `sites/new-leaf-hearing-care/src/components/ReviewsPage.astro:10,14`

- [ ] **Step 1: Copy the reader** to `sites/new-leaf-hearing-care/src/lib/reviews-reader.mjs`.
- [ ] **Step 1b: Freshness label.** The reader passes the stored `time_ago` through, and it freezes on reviews that fall out of the weekly newest-50 window. In ReviewsPage.astro derive the label from `publishedAt` (for example 'N weeks ago' computed at render) instead of using `timeAgo`.
- [ ] **Step 2: Read the dynamic-import pattern.** Open `sites/new-leaf-hearing-care/src/pages/api/pricing-lead.ts` lines 120-135 and mirror its `await import('cloudflare:workers')` in try/catch exactly. A static import breaks the non-Cloudflare Node build.
- [ ] **Step 3: Edit `ReviewsPage.astro`.** After `import reviewsData from "../reviews/reviews.json";` add:

```astro
import { getLocationReviews } from "../lib/reviews-reader.mjs";
```

Replace `const data = reviewsData[location];` with:

```astro
// Reviews come from D1 (kept current by the reviews-sync Worker); the committed JSON is the fallback.
let db: any = null;
try {
  db = ((await import("cloudflare:workers")) as { env?: { DB?: unknown } }).env?.DB ?? null;
} catch {
  db = null;
}
const data = await getLocationReviews(db, location, (reviewsData as Record<string, any>)[location]);
```

The rest of the page already reads `data?.reviews`, `data.rating` and `data.votesCount`, which the reader returns in the same shape.
- [ ] **Step 4: Build the Cloudflare way.** `cd sites/new-leaf-hearing-care && npm run build:cloudflare`. Confirm `dist/server/wrangler.json` has database `6228c322-f3ea-4a88-9994-c32e2f3be379`. Plain `npm run build` fails and ships a stale `dist/`.
- [ ] **Step 5: Preview and check** `/arvada-reviews/` and `/littleton-reviews/` on a non-live version: the cross-links to the other location still work, the rating and vote count are right, and the review count matches D1. Take desktop and mobile screenshots and look at them.
- [ ] **Step 6: Drift test and commit.** `cd ../../workers/reviews-sync && npm test`, then `git add sites/new-leaf-hearing-care && git commit -m "new-leaf: read reviews from D1 with JSON fallback" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`
- [ ] **Step 7: Go live only after Vince approves the preview.** `CF_DEPLOY=1 npx wrangler deploy` (or `npm run deploy:production`), then grep the dist output for the new code before declaring it live.

---

### Task 13: First automatic Sunday, then final checks

**Files:** none.

- [ ] **Step 1: Confirm DRY_RUN is unset** (`npx wrangler secret list` shows no `DRY_RUN`).
- [ ] **Step 2: After the next Sunday 17:00 UTC**, check the logs: `npx wrangler tail reviews-sync` is live-only, so read the dashboard logs or query D1: `SELECT location,status,posted_at FROM review_jobs` on each database. Expected: every location `done`, with `posted_at` on that Sunday and `review_meta.synced_at` the same day.
- [ ] **Step 3: Confirm no Slack alert fired** in `#bidview-alerts`, or read the alert and act on it.
- [ ] **Step 4: Hide-review test.** In one database set `hidden = 1` on one review, run `mode=post` and `mode=collect` for that site with the run token after waiting 6 days, or simulate by lowering `synced_at`, and confirm the review is still hidden afterwards and gone from the live page.
- [ ] **Step 5: Open the PR to `main` only when Vince asks.** The branch is `feat/reviews-sync`.

---

## Self-Review

- **Spec coverage:** one Worker with three D1 bindings (Tasks 1, 6); secrets only as Worker secrets (Task 9); weekly post, Sunday collect, Monday catch-up (Tasks 5, 6); `review_jobs`, 6-day guard, 48-hour expiry (Tasks 3, 5); safe writes, hidden preserved, empty and mismatch rejected (Tasks 3, 5); sites read D1 with JSON fallback and a seeded database (Tasks 7, 8, 10 to 12); short cache on review pages (Task 11 skips the Ontario worker cache; New Leaf and Duet have no worker cache, which Task 10 and 12 previews confirm); template reuse is a config entry (Task 1) and the byte-identical reader (Task 7); open items (Task 0).
- **Known gaps, stated on purpose:** weekly depth is 50 newest, so a review Google deletes stays in D1 until someone hides it; Ontario's seed holds 69 of its 102 reviews; the existing Ontario and New Leaf review pages emit AggregateRating schema for the practice's own reviews, which the spec says to avoid. This plan does not change it, and it should be decided separately.
- **Type consistency:** row keys in Tasks 2, 3, 5 and 8 match; reader output keys in Task 7 match the edits in Tasks 10 to 12; job statuses match between Tasks 3 and 5; cron strings match between Tasks 6 and `wrangler.jsonc`.
