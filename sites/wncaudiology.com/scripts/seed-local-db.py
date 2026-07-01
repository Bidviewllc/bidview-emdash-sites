"""
Seed the local Miniflare D1 SQLite database with emdash collections + entries.
Run AFTER `npm run dev` has created .wrangler/state/v3/d1/ at least once.

Usage:
  python scripts/seed-local-db.py
"""
import sqlite3, json, time, random, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

# ── find Miniflare SQLite file ────────────────────────────────────────────────
d1_dir = ROOT / ".wrangler" / "state" / "v3" / "d1" / "miniflare-D1DatabaseObject"
if not d1_dir.exists():
    print("ERROR: Miniflare D1 directory not found.")
    print("  Run `npm run dev` first to create the local DB, then re-run this script.")
    sys.exit(1)

sqlite_files = sorted(d1_dir.glob("*.sqlite"), key=lambda p: p.stat().st_mtime, reverse=True)
if not sqlite_files:
    print("ERROR: No .sqlite files found in", d1_dir)
    sys.exit(1)

DB_PATH = sqlite_files[0]
print(f"Using DB: {DB_PATH}")

# ── ULID generator (no external deps) ────────────────────────────────────────
CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

def ulid():
    ts = int(time.time() * 1000)
    t = "".join(CROCKFORD[(ts >> (5 * i)) & 0x1F] for i in range(10))[::-1]
    r = "".join(random.choice(CROCKFORD) for _ in range(16))
    return t + r

# ── load seed.json ────────────────────────────────────────────────────────────
SEED = json.loads((ROOT / "seed" / "seed.json").read_text(encoding="utf-8-sig"))

TYPE_MAP = {"string": "TEXT", "text": "TEXT", "number": "REAL", "boolean": "INTEGER", "image": "TEXT", "json": "TEXT"}

db = sqlite3.connect(DB_PATH)
cur = db.cursor()

# Check if emdash core tables exist (set up by /_emdash/admin wizard OR by emdash seed)
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='_emdash_collections'")
if not cur.fetchone():
    print("ERROR: _emdash_collections table not found.")
    print("  The emdash core schema has not been initialised.")
    print("  Visit http://localhost:4321/_emdash/admin and complete the setup wizard first,")
    print("  or run `npx emdash seed` (requires better-sqlite3), then re-run this script.")
    db.close()
    sys.exit(1)

# ── seed collections + fields + tables ───────────────────────────────────────
for coll in SEED.get("collections", []):
    slug  = coll["slug"]
    table = f"ec_{slug}"

    # Skip if already seeded
    cur.execute("SELECT id FROM _emdash_collections WHERE slug = ?", (slug,))
    if cur.fetchone():
        print(f"  collection '{slug}' already exists, skipping schema")
        continue

    print(f"  creating collection '{slug}'")

    # Create the content table
    cur.execute(f'''CREATE TABLE IF NOT EXISTS "{table}" (
        id TEXT PRIMARY KEY,
        slug TEXT,
        status TEXT DEFAULT 'draft',
        author_id TEXT, primary_byline_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        published_at TEXT, scheduled_at TEXT, deleted_at TEXT,
        version INTEGER DEFAULT 1,
        live_revision_id TEXT, draft_revision_id TEXT,
        locale TEXT NOT NULL DEFAULT 'en',
        translation_group TEXT,
        UNIQUE(slug, locale))''')

    # Register in _emdash_collections
    coll_id = ulid()
    cur.execute(
        "INSERT INTO _emdash_collections (id, slug, label, source) VALUES (?,?,?,'seed')",
        (coll_id, slug, coll["label"])
    )

    # Register fields and add columns
    for i, f in enumerate(coll["fields"]):
        field_id = ulid()
        col_type = TYPE_MAP.get(f["type"], "TEXT")
        cur.execute(
            """INSERT INTO _emdash_fields
               (id, collection_id, slug, label, type, column_type, sort_order, translatable)
               VALUES (?,?,?,?,?,?,?,1)""",
            (field_id, coll_id, f["slug"], f["label"], f["type"], col_type, i)
        )
        try:
            cur.execute(f'ALTER TABLE "{table}" ADD COLUMN "{f["slug"]}" {col_type}')
        except sqlite3.OperationalError:
            pass  # column already exists

# ── seed entries ──────────────────────────────────────────────────────────────
for e in SEED.get("entries", []):
    coll  = e["collection"]
    table = f"ec_{coll}"
    slug  = e["id"]

    cur.execute(f'SELECT id FROM "{table}" WHERE slug = ?', (slug,))
    if cur.fetchone():
        print(f"  entry '{slug}' in '{coll}' already exists, skipping")
        continue

    print(f"  inserting {coll}/{slug}")
    data = e.get("data", {})
    cols = ["id", "slug", "status", "version", "locale", "translation_group"] + list(data.keys())
    vals = [ulid(), slug, e.get("status", "published"), 1, "en", ulid()] + list(data.values())
    placeholders = ",".join("?" * len(vals))
    cur.execute(f'INSERT INTO "{table}" ({",".join(cols)}) VALUES ({placeholders})', vals)

# ── bypass admin wizard ───────────────────────────────────────────────────────
cur.execute("INSERT OR REPLACE INTO options (name, value) VALUES ('emdash:setup_complete', 'true')")

db.commit()
db.close()
print("\nDone. Local Miniflare D1 seeded.")
print("Visit http://localhost:4321/_emdash/admin to verify collections.")
