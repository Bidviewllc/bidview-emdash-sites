import json
import os
import sqlite3
import sys
import time
import urllib.request
from pathlib import Path

ACCOUNT_ID = "239e9d015c7a3a39cdc2e9400312f553"
DATABASE_ID = "8fc94237-efd7-409c-90e9-e90cb1f82938"
TOKEN_PATH = Path.home() / ".claude" / "credentials" / "cloudflare-cameron-token.txt"
LOCAL_DB = Path(__file__).resolve().parents[1] / "data.db"
TABLES = [
    "ec_pages",
    "ec_services",
    "ec_hearing_aids",
    "ec_articles",
    "ec_audiologists",
    "ec_testimonials",
    "ec_utility_pages",
    "ec_archives",
]


def d1(sql, params=None, retries=8):
    token = os.environ.get("CLOUDFLARE_API_TOKEN") or TOKEN_PATH.read_text(encoding="utf-8").strip()
    body = {"sql": sql}
    if params is not None:
        body["params"] = params

    req_body = json.dumps(body).encode("utf-8")
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DATABASE_ID}/query"
    for attempt in range(retries):
        req = urllib.request.Request(
            url,
            data=req_body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                payload = json.loads(response.read())
            if not payload.get("success"):
                raise RuntimeError(payload.get("errors"))
            return payload["result"]
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(min(30, 2**attempt))


def main():
    db = sqlite3.connect(LOCAL_DB)
    db.row_factory = sqlite3.Row
    totals = {}

    tables = [table for table in sys.argv[1:] if table in TABLES] or TABLES

    for table in tables:
        rows = [dict(row) for row in db.execute(f'SELECT * FROM "{table}" ORDER BY slug')]
        d1(f'DELETE FROM "{table}"')
        if not rows:
            totals[table] = 0
            continue

        columns = list(rows[0].keys())
        column_sql = ", ".join(f'"{column}"' for column in columns)
        placeholders = ", ".join("?" for _ in columns)
        sql = f'INSERT INTO "{table}" ({column_sql}) VALUES ({placeholders})'

        for index, row in enumerate(rows, start=1):
            print(f"{table}: inserting {index}/{len(rows)} {row.get('slug', row.get('id'))}", flush=True)
            params = [row[column] for column in columns]
            d1(sql, params)
            time.sleep(0.4)

        totals[table] = len(rows)

    print(json.dumps(totals, indent=2))


if __name__ == "__main__":
    main()
