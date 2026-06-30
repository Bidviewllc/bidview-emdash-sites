"""
General D1 updater: update arbitrary pages by slug, resolving each page's
collection (-> ec_<collection> table) from pages.json. Updates body_html,
head_html, seo_head_html, title, meta, robots, canonical, stylesheets.

Usage:  python scripts/update-d1-pages.py <slug> [slug...]
"""
import json
import os
import socket
import sys
import time
import urllib.request
from pathlib import Path

_orig = socket.getaddrinfo
socket.getaddrinfo = lambda host, port, family=0, type=0, proto=0, flags=0: _orig(host, port, socket.AF_INET, type, proto, flags)

ACCOUNT_ID  = "239e9d015c7a3a39cdc2e9400312f553"
DATABASE_ID = "8fc94237-efd7-409c-90e9-e90cb1f82938"
TOKEN_PATH  = Path.home() / ".claude" / "credentials" / "cloudflare-cameron-token.txt"
PAGES_JSON  = Path(__file__).resolve().parents[1] / "src" / "data" / "pages.json"

token = TOKEN_PATH.read_text(encoding="utf-8").strip()
pages = json.loads(PAGES_JSON.read_text(encoding="utf-8"))
by_slug = {p["slug"]: p for p in pages}
NOW = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def d1(sql, params=None, retries=6):
    body = {"sql": sql}
    if params is not None:
        body["params"] = params
    data = json.dumps(body).encode("utf-8")
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DATABASE_ID}/query"
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.loads(resp.read())
            if not payload.get("success"):
                raise RuntimeError(payload.get("errors"))
            return payload["result"]
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(min(20, 2 ** attempt))


def main():
    slugs = sys.argv[1:]
    if not slugs:
        print("Usage: python scripts/update-d1-pages.py <slug> [slug...]")
        sys.exit(1)

    for slug in slugs:
        page = by_slug.get(slug)
        if not page:
            print(f"SKIP {slug} - not in pages.json")
            continue
        table = "ec_" + page["collection"]
        print(f"UPDATE {table} slug={slug} ...", flush=True)
        d1(
            f'''UPDATE "{table}" SET
                body_html=?, head_html=?, seo_head_html=?, title=?, seo_title=?,
                meta_description=?, canonical=?, robots=?, stylesheets=?, updated_at=?
            WHERE slug=?''',
            [
                page.get("bodyHtml", ""), page.get("headHtml", ""), page.get("seoHeadHtml", ""),
                page.get("title", ""), page.get("title", ""), page.get("description", ""),
                page.get("canonical", ""), page.get("robots", "follow, index"),
                json.dumps(page.get("stylesheets", [])), NOW, slug,
            ],
        )
        print(f"  OK body={len(page.get('bodyHtml',''))} styles={page.get('stylesheets')}")

    print("\nDone.")


if __name__ == "__main__":
    main()
