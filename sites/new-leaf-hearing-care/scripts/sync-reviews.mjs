/**
 * Sync Google reviews (via DataForSEO) into D1.
 *
 *   node scripts/sync-reviews.mjs            # live pull from DataForSEO (task queue, ~5-15 min)
 *   node scripts/sync-reviews.mjs --cache DIR  # seed from previously saved task_get JSON
 *
 * Reviews are stored in D1 and rendered server-side, so review text is in the
 * HTML for search engines and AI assistants. Nothing is fetched at page load.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const CACHE_FLAG = process.argv.indexOf("--cache");
const CACHE_DIR = CACHE_FLAG > -1 ? process.argv[CACHE_FLAG + 1] : null;

const LOCATIONS = [
  { key: "arvada", placeId: "ChIJB_NQqgeJa4cRS2-mBlxuxKE", label: "Arvada" },
  { key: "littleton", placeId: "ChIJf-CBToGBbIcRScDxPPAH700", label: "Littleton" },
];

// ── Cloudflare D1 ────────────────────────────────────────────────────────────
const CF_TOKEN = readFileSync("C:/Users/acer/.claude/credentials/cloudflare-cameron-token.txt", "utf8").trim();
const CF_ACCOUNT = "239e9d015c7a3a39cdc2e9400312f553";
const CF_DB = "6228c322-f3ea-4a88-9994-c32e2f3be379";

async function d1(sql, params) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify(params ? { sql, params } : { sql }),
          signal: AbortSignal.timeout(60000),
        }
      );
      const j = await r.json();
      if (!j.success) throw new Error(JSON.stringify(j.errors));
      return j.result[0];
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// ── DataForSEO ───────────────────────────────────────────────────────────────
function dfsAuth() {
  const md = readFileSync("C:/Users/acer/.claude/credentials/apis.md", "utf8");
  const block = md.split("## DataForSEO")[1].split("##")[0];
  const login = block.match(/\*\*Login:\*\*\s*(\S+)/)[1];
  const password = block.match(/\*\*Password:\*\*\s*(\S+)/)[1];
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function dfs(url, body, auth) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const r = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(90000),
      });
      return await r.json();
    } catch {
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
  throw new Error("DataForSEO unreachable");
}

async function pullLive(loc, auth) {
  const B = "https://api.dataforseo.com/v3/business_data/google/reviews";
  const post = await dfs(`${B}/task_post`, [
    { place_id: loc.placeId, language_name: "English", location_name: "United States", depth: 400, sort_by: "newest", tag: loc.key },
  ], auth);
  const id = post.tasks?.[0]?.id;
  if (!id) throw new Error(`task_post failed for ${loc.key}: ${JSON.stringify(post).slice(0, 200)}`);
  console.log(`  ${loc.key}: task ${id} queued`);
  for (let i = 0; i < 60; i++) {
    const g = await dfs(`${B}/task_get/${id}`, null, auth);
    const t = g.tasks?.[0];
    if (t?.status_code === 20000 && t.result?.[0]) return t.result[0];
    if (t?.status_code >= 40000 && t.status_code !== 40602) throw new Error(`${t.status_code} ${t.status_message}`);
    await new Promise((r) => setTimeout(r, 20000));
  }
  throw new Error(`${loc.key}: task never completed`);
}

function fromCache(loc) {
  const f = path.join(CACHE_DIR, `dfs-${loc.key}.json`);
  if (!existsSync(f)) throw new Error(`no cache file ${f}`);
  return JSON.parse(readFileSync(f, "utf8")).tasks[0].result[0];
}

// "2026-08-03 23:50:09 +00:00" -> ISO
const toIso = (ts) => {
  if (!ts) return null;
  const d = new Date(ts.replace(" +00:00", "Z").replace(" ", "T"));
  return isNaN(d) ? null : d.toISOString();
};

// ── main ─────────────────────────────────────────────────────────────────────
await d1(`CREATE TABLE IF NOT EXISTS reviews (
  review_id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  author TEXT,
  avatar_url TEXT,
  rating INTEGER,
  text TEXT,
  time_ago TEXT,
  published_at TEXT,
  review_url TEXT,
  local_guide INTEGER DEFAULT 0,
  synced_at TEXT
)`);
await d1(`CREATE INDEX IF NOT EXISTS reviews_location_idx ON reviews(location, published_at DESC)`);
await d1(`CREATE TABLE IF NOT EXISTS review_meta (
  location TEXT PRIMARY KEY,
  title TEXT,
  place_id TEXT,
  rating REAL,
  votes_count INTEGER,
  synced_at TEXT
)`);

const auth = CACHE_DIR ? null : dfsAuth();
const now = new Date().toISOString();

for (const loc of LOCATIONS) {
  console.log(`\n=== ${loc.label} ===`);
  const result = CACHE_DIR ? fromCache(loc) : await pullLive(loc, auth);
  const items = result.items || [];
  console.log(`  pulled ${items.length} reviews | rating ${result.rating?.value} (${result.rating?.votes_count} votes)`);

  await d1(
    `INSERT INTO review_meta (location,title,place_id,rating,votes_count,synced_at)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(location) DO UPDATE SET
       title=excluded.title, place_id=excluded.place_id, rating=excluded.rating,
       votes_count=excluded.votes_count, synced_at=excluded.synced_at`,
    [loc.key, result.title || "", result.place_id || loc.placeId, result.rating?.value ?? null, result.rating?.votes_count ?? null, now]
  );

  let written = 0;
  for (const it of items) {
    const id = it.review_id;
    if (!id) continue;
    await d1(
      `INSERT INTO reviews (review_id,location,author,avatar_url,rating,text,time_ago,published_at,review_url,local_guide,synced_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(review_id) DO UPDATE SET
         author=excluded.author, avatar_url=excluded.avatar_url, rating=excluded.rating,
         text=excluded.text, time_ago=excluded.time_ago, published_at=excluded.published_at,
         review_url=excluded.review_url, local_guide=excluded.local_guide, synced_at=excluded.synced_at`,
      [
        id, loc.key, it.profile_name || "", it.profile_image_url || "",
        it.rating?.value ?? null, it.review_text || null, it.time_ago || "",
        toIso(it.timestamp), it.review_url || "", it.local_guide ? 1 : 0, now,
      ]
    );
    written++;
  }
  console.log(`  upserted ${written}`);
}

const tally = await d1(`SELECT location, COUNT(*) n, SUM(CASE WHEN text IS NOT NULL AND text <> '' THEN 1 ELSE 0 END) with_text FROM reviews GROUP BY location`);
console.log("\n=== D1 now ===");
for (const r of tally.results) console.log(`  ${r.location}: ${r.n} reviews (${r.with_text} with text)`);

// Export a build-time snapshot. The pages render from this file so review text
// is baked into the HTML (readable by search engines and AI assistants) with no
// runtime D1 binding. src/data/ is gitignored, so this lives in src/reviews/.
const OUT_DIR = path.join(process.cwd(), "src", "reviews");
const { mkdirSync, writeFileSync } = await import("node:fs");
mkdirSync(OUT_DIR, { recursive: true });

const snapshot = {};
for (const loc of LOCATIONS) {
  const meta = await d1(`SELECT * FROM review_meta WHERE location = ?`, [loc.key]);
  const rows = await d1(
    `SELECT review_id, author, avatar_url, rating, text, time_ago, published_at, review_url, local_guide
     FROM reviews WHERE location = ? ORDER BY published_at DESC`,
    [loc.key]
  );
  snapshot[loc.key] = {
    label: loc.label,
    placeId: loc.placeId,
    rating: meta.results[0]?.rating ?? null,
    votesCount: meta.results[0]?.votes_count ?? null,
    syncedAt: now,
    reviews: rows.results.map((r) => ({
      id: r.review_id,
      author: r.author,
      avatar: r.avatar_url,
      rating: r.rating,
      text: r.text || "",
      timeAgo: r.time_ago,
      publishedAt: r.published_at,
      url: r.review_url,
      localGuide: !!r.local_guide,
    })),
  };
}
writeFileSync(path.join(OUT_DIR, "reviews.json"), JSON.stringify(snapshot, null, 1));
console.log(`\nwrote src/reviews/reviews.json (${Object.values(snapshot).reduce((a, s) => a + s.reviews.length, 0)} reviews)`);
