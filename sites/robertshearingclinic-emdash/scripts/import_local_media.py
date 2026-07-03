from __future__ import annotations

import json
import mimetypes
import shutil
import sqlite3
import time
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data.db"
MEDIA_SOURCE = ROOT / "public" / "assets" / "media"
UPLOADS = ROOT / "uploads"


def new_id() -> str:
    return f"{int(time.time() * 1000):x}{uuid.uuid4().hex[:18]}"


def ensure_media_row(
    con: sqlite3.Connection,
    source: Path,
    storage_key: str,
) -> tuple[str, dict[str, object]]:
    row = con.execute(
        "SELECT id, filename, mime_type, size, width, height, alt, storage_key FROM media WHERE storage_key = ? ORDER BY id LIMIT 1",
        (storage_key,),
    ).fetchone()
    mime_type = mimetypes.guess_type(source.name)[0] or "application/octet-stream"
    if row:
        media_id = row[0]
    else:
        media_id = new_id()
        con.execute(
            """
            INSERT INTO media (id, filename, mime_type, size, width, height, alt, caption, storage_key, status)
            VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, ?, 'ready')
            """,
            (
                media_id,
                source.name,
                mime_type,
                source.stat().st_size,
                source.stem.replace("-", " ").replace("_", " "),
                storage_key,
            ),
        )
    media_value = {
        "provider": "local",
        "id": media_id,
        "alt": source.stem.replace("-", " ").replace("_", " "),
        "filename": source.name,
        "mimeType": mime_type,
        "meta": {"storageKey": storage_key},
    }
    return media_id, media_value


def import_media() -> None:
    if not MEDIA_SOURCE.exists():
        raise SystemExit(f"Missing media source: {MEDIA_SOURCE}")
    UPLOADS.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    imported: dict[str, dict[str, object]] = {}

    for source in sorted(MEDIA_SOURCE.iterdir()):
        if not source.is_file():
            continue
        storage_key = f"assets/media/{source.name}"
        target = UPLOADS / storage_key
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or target.stat().st_size != source.stat().st_size:
            shutil.copy2(source, target)
        _, media_value = ensure_media_row(con, source, storage_key)
        imported[source.name] = media_value

    for table in ("ec_pages", "ec_team_members", "ec_posts", "ec_internal_pages"):
        rows = con.execute(
            f"SELECT id, title, featured_image_path FROM {table} WHERE featured_image_path IS NOT NULL AND featured_image_path != ''"
        ).fetchall()
        for row_id, title, path in rows:
            filename = str(path).split("/")[-1]
            media_value = imported.get(filename)
            if not media_value:
                continue
            patched = dict(media_value)
            patched["alt"] = title or media_value.get("alt") or ""
            con.execute(
                f"UPDATE {table} SET featured_image = ? WHERE id = ?",
                (json.dumps(patched, ensure_ascii=False), row_id),
            )

    con.commit()
    count = con.execute("SELECT COUNT(*) FROM media").fetchone()[0]
    con.close()
    print(f"[media] imported_or_reused={len(imported)} media_rows={count}")


if __name__ == "__main__":
    import_media()
