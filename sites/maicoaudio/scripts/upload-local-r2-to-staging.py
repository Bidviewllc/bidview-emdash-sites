import json
import sqlite3
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
R2_DB = ROOT / ".wrangler/state/v3/r2/miniflare-R2BucketObject/b24e386e86f5a02a4f63ddea663875e68b66cbb8c838e86d8894c2d1d6a8a3aa.sqlite"
BLOBS_DIR = ROOT / ".wrangler/state/v3/r2/maico-audiological-services-media/blobs"
BUCKET = "maicoaudio-staging-media"


def content_type(http_metadata: str | None) -> str:
    if not http_metadata:
        return "application/octet-stream"
    try:
        metadata = json.loads(http_metadata)
    except json.JSONDecodeError:
        return "application/octet-stream"
    return metadata.get("contentType") or "application/octet-stream"


def main():
    con = sqlite3.connect(R2_DB)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        "SELECT key, blob_id, http_metadata FROM _mf_objects ORDER BY key"
    ).fetchall()

    uploaded = 0
    missing = []

    for row in rows:
        blob_path = BLOBS_DIR / row["blob_id"]
        if not blob_path.exists():
            missing.append(f"{row['key']} -> {blob_path}")
            continue

        subprocess.run(
            [
                "cmd",
                "/c",
                "npx",
                "wrangler",
                "r2",
                "object",
                "put",
                f"{BUCKET}/{row['key']}",
                "--remote",
                "--file",
                str(blob_path),
                "--content-type",
                content_type(row["http_metadata"]),
            ],
            cwd=ROOT,
            check=True,
        )
        uploaded += 1

    if missing:
        print("Missing local R2 blobs:")
        for item in missing:
            print(f"- {item}")
        raise SystemExit(1)

    print(f"Uploaded {uploaded} objects to {BUCKET}.")


if __name__ == "__main__":
    main()
