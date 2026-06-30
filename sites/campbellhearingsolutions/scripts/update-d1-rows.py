"""
Targeted D1 update: pushes updated body_html/head_html/seo_head_html for specific rows
and inserts any new pages.json rows that don't yet have a D1 entry.

Rows updated this run:
  ec_hearing_aids   slug=starkey-hearing-aids         (G Series AI content refresh)
  ec_articles       slug=hyperacusis-...              (June 08 content refresh)
  ec_pages          slug=insurance                    (new page — INSERT)
"""

import json
import os
import socket
import time
import urllib.request
from pathlib import Path

# Force IPv4 to avoid Windows IPv6 hang
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_only

ACCOUNT_ID  = "239e9d015c7a3a39cdc2e9400312f553"
DATABASE_ID = "8fc94237-efd7-409c-90e9-e90cb1f82938"
TOKEN_PATH  = Path.home() / ".claude" / "credentials" / "cloudflare-cameron-token.txt"
PAGES_JSON  = Path(__file__).resolve().parents[1] / "src" / "data" / "pages.json"

token = TOKEN_PATH.read_text(encoding="utf-8").strip()
pages = json.loads(PAGES_JSON.read_text(encoding="utf-8"))
by_route = {p["route"]: p for p in pages}

NOW = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def d1(sql, params=None, retries=6):
    body = {"sql": sql}
    if params is not None:
        body["params"] = params
    data = json.dumps(body).encode("utf-8")
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}"
        f"/d1/database/{DATABASE_ID}/query"
    )
    for attempt in range(retries):
        req = urllib.request.Request(
            url, data=data,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.loads(resp.read())
            if not payload.get("success"):
                raise RuntimeError(payload.get("errors"))
            return payload["result"]
        except Exception as e:
            if attempt == retries - 1:
                raise
            wait = min(30, 2 ** attempt)
            print(f"  retry {attempt+1} after {wait}s ({e})")
            time.sleep(wait)


def update_row(table, slug, page):
    print(f"UPDATE {table} slug={slug} ...", flush=True)
    result = d1(f'SELECT id FROM "{table}" WHERE slug = ?', [slug])
    rows = result[0].get("results", []) if result else []
    if not rows:
        print(f"  WARNING: no existing row found in {table} for slug={slug} — skipping update")
        return

    d1(
        f'''UPDATE "{table}" SET
            body_html       = ?,
            head_html       = ?,
            seo_head_html   = ?,
            title           = ?,
            seo_title       = ?,
            meta_description = ?,
            robots          = ?,
            stylesheets     = ?,
            updated_at      = ?
        WHERE slug = ?''',
        [
            page.get("bodyHtml", ""),
            page.get("headHtml", ""),
            page.get("seoHeadHtml", ""),
            page.get("title", ""),
            page.get("title", ""),
            page.get("description", ""),
            page.get("robots", "follow, index"),
            json.dumps(page.get("stylesheets", [])),
            NOW,
            slug,
        ],
    )
    print(f"  OK  body={len(page.get('bodyHtml',''))} chars  styles={page.get('stylesheets')}")


def insert_row(table, page):
    slug = page["slug"]
    print(f"INSERT {table} slug={slug} ...", flush=True)
    result = d1(f'SELECT id FROM "{table}" WHERE slug = ?', [slug])
    rows = result[0].get("results", []) if result else []
    if rows:
        print(f"  already exists — skipping insert, running update instead")
        update_row(table, slug, page)
        return

    d1(
        f'''INSERT INTO "{table}"
            (id, slug, status, created_at, updated_at, published_at,
             title, seo_title, meta_description, canonical, robots, route,
             body_class, seo_head_html, head_html, body_html, content_type, source_file)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        [
            page["id"],
            slug,
            "published",
            NOW, NOW, NOW,
            page.get("title", ""),
            page.get("title", ""),
            page.get("description", ""),
            page.get("canonical", ""),
            page.get("robots", "follow, index"),
            page.get("route", ""),
            page.get("bodyClass", ""),
            page.get("seoHeadHtml", ""),
            page.get("headHtml", ""),
            page.get("bodyHtml", ""),
            page.get("contentType", "page"),
            page.get("sourceFile", ""),
        ],
    )
    print(f"  OK  body={len(page.get('bodyHtml',''))} chars")


# ── run updates ───────────────────────────────────────────────────────────────
starkey = by_route["/starkey-hearing-aids/"]
update_row("ec_hearing_aids", "starkey-hearing-aids", starkey)

hyperacusis = by_route["/hyperacusis-understanding-and-managing-sound-sensitivity/"]
update_row("ec_articles", "hyperacusis-understanding-and-managing-sound-sensitivity", hyperacusis)

insurance = by_route["/insurance/"]
insert_row("ec_pages", insurance)

print("\nD1 update complete.")
