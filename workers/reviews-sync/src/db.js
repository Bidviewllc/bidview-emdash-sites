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
