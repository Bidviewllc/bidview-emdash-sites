"""
Generate a SQL file to seed staging and production D1 databases.
Run once; upload via: wrangler d1 execute <db-name> --file=scripts/seed-remote-d1.sql --remote

Usage:
  python scripts/gen-seed-sql.py
"""
import json, time, random
from pathlib import Path

ROOT = Path(__file__).parent.parent
SEED = json.loads((ROOT / "seed" / "seed.json").read_text(encoding="utf-8-sig"))

CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

def ulid():
    ts = int(time.time() * 1000)
    t = "".join(CROCKFORD[(ts >> (5 * i)) & 0x1F] for i in range(10))[::-1]
    r = "".join(random.choice(CROCKFORD) for _ in range(16))
    return t + r

TYPE_MAP = {"string": "TEXT", "text": "TEXT", "number": "REAL",
            "boolean": "INTEGER", "image": "TEXT", "json": "TEXT"}

def esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"

lines = []

# ── collections + fields + tables ─────────────────────────────────────────────
for coll in SEED.get("collections", []):
    slug = coll["slug"]
    table = f"ec_{slug}"
    coll_id = ulid()

    # Names already in the base table schema — skip to avoid duplicate column error
    BASE_NAMES = {"id", "slug", "status", "author_id", "primary_byline_id",
                  "created_at", "updated_at", "published_at", "scheduled_at",
                  "deleted_at", "version", "live_revision_id", "draft_revision_id",
                  "locale", "translation_group"}

    base_cols = [
        "id TEXT PRIMARY KEY",
        "slug TEXT",
        "status TEXT DEFAULT 'draft'",
        "author_id TEXT",
        "primary_byline_id TEXT",
        "created_at TEXT DEFAULT (datetime('now'))",
        "updated_at TEXT DEFAULT (datetime('now'))",
        "published_at TEXT",
        "scheduled_at TEXT",
        "deleted_at TEXT",
        "version INTEGER DEFAULT 1",
        "live_revision_id TEXT",
        "draft_revision_id TEXT",
        "locale TEXT NOT NULL DEFAULT 'en'",
        "translation_group TEXT",
    ]
    field_cols = [
        f'{f["slug"]} {TYPE_MAP.get(f["type"], "TEXT")}'
        for f in coll["fields"]
        if f["slug"] not in BASE_NAMES
    ]
    # Table constraints must come after ALL column definitions
    all_cols = ", ".join(base_cols + field_cols + ["UNIQUE(slug, locale)"])

    lines.append(f'CREATE TABLE IF NOT EXISTS "{table}" ({all_cols});')
    lines.append(
        f"INSERT OR IGNORE INTO _emdash_collections (id, slug, label, source) "
        f"VALUES ({esc(coll_id)}, {esc(slug)}, {esc(coll['label'])}, 'seed');"
    )

    for i, f in enumerate(coll["fields"]):
        field_id = ulid()
        col_type = TYPE_MAP.get(f["type"], "TEXT")
        lines.append(
            f"INSERT OR IGNORE INTO _emdash_fields "
            f"(id, collection_id, slug, label, type, column_type, sort_order, translatable) "
            f"VALUES ({esc(field_id)}, "
            f"(SELECT id FROM _emdash_collections WHERE slug={esc(slug)}), "
            f"{esc(f['slug'])}, {esc(f['label'])}, {esc(f['type'])}, {esc(col_type)}, {i}, 1);"
        )

# ── entries ────────────────────────────────────────────────────────────────────
for e in SEED.get("entries", []):
    coll = e["collection"]
    table = f"ec_{coll}"
    entry_id = ulid()
    tg = ulid()
    data = e.get("data", {})

    cols = ["id", "slug", "status", "version", "locale", "translation_group"] + list(data.keys())
    vals = [entry_id, e["id"], e.get("status", "published"), 1, "en", tg] + list(data.values())

    col_str = ", ".join(f'"{c}"' for c in cols)
    val_str = ", ".join(esc(v) for v in vals)
    lines.append(f'INSERT OR IGNORE INTO "{table}" ({col_str}) VALUES ({val_str});')

# ── bypass admin wizard ────────────────────────────────────────────────────────
lines.append("INSERT OR REPLACE INTO options (name, value) VALUES ('emdash:setup_complete', 'true');")

out = ROOT / "scripts" / "seed-remote-d1.sql"
out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Written {len(lines)} SQL statements -> {out}")
print()
print("To seed staging D1 (ID: 09862375-89ba-4028-9f0c-555cb0b8d6e8):")
print("  set CLOUDFLARE_API_TOKEN=<token>")
print("  npx wrangler d1 execute wnc-audiology-staging-db --file=scripts/seed-remote-d1.sql --remote")
print()
print("To seed production D1 (ID: 1f257c28-b218-49cb-aed9-b1bd3fde6649):")
print("  npx wrangler d1 execute wnc-audiology-db --file=scripts/seed-remote-d1.sql --remote")
