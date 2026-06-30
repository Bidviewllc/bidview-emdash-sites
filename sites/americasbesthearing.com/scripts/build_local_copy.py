import os
import re
import json
import hashlib
from urllib.parse import urljoin, urlparse, urldefrag
from collections import deque

import requests
from bs4 import BeautifulSoup

BASE = "https://americasbesthearing.com/"
OUT = os.path.abspath("local-copy")
ASSET_DIR = os.path.join(OUT, "assets")
MEDIA_DIR = os.path.join(ASSET_DIR, "media")
CSS_DIR = os.path.join(ASSET_DIR, "styles")
JS_DIR = os.path.join(ASSET_DIR, "js")
FONT_DIR = os.path.join(ASSET_DIR, "fonts")
OTHER_DIR = os.path.join(ASSET_DIR, "other")

os.makedirs(MEDIA_DIR, exist_ok=True)
os.makedirs(CSS_DIR, exist_ok=True)
os.makedirs(JS_DIR, exist_ok=True)
os.makedirs(FONT_DIR, exist_ok=True)
os.makedirs(OTHER_DIR, exist_ok=True)

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0 (compatible; local-copy-bot/1.0)"})

visited = set()
queue = deque([BASE])
pages = []
asset_map = {}

IGNORE_EXT = {
    ".pdf", ".zip", ".xml", ".json", ".txt", ".mp4", ".mp3", ".wav", ".avi", ".mov", ".webm"
}


def norm_url(url: str) -> str:
    url, _ = urldefrag(url)
    p = urlparse(url)
    scheme = p.scheme or "https"
    netloc = p.netloc.lower()
    path = re.sub(r"/+", "/", p.path or "/")
    if not path.startswith("/"):
        path = "/" + path
    if path != "/" and path.endswith("/"):
        path = path[:-1]
    return f"{scheme}://{netloc}{path}" + (f"?{p.query}" if p.query else "")


def is_internal(url: str) -> bool:
    p = urlparse(url)
    return p.netloc.lower() in {"americasbesthearing.com", "www.americasbesthearing.com"}


def page_output_path(url: str) -> str:
    p = urlparse(url)
    path = p.path or "/"
    if path == "/":
        return os.path.join(OUT, "index.html")
    route = path.strip("/")
    return os.path.join(OUT, route, "index.html")


def ensure_parent(fp: str):
    os.makedirs(os.path.dirname(fp), exist_ok=True)


def hashname(url: str) -> str:
    return hashlib.md5(url.encode("utf-8")).hexdigest()[:10]


def pick_asset_folder(path: str):
    ext = os.path.splitext(path.lower())[1]
    if ext in {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico"}:
        return MEDIA_DIR
    if ext in {".css"}:
        return CSS_DIR
    if ext in {".js", ".mjs"}:
        return JS_DIR
    if ext in {".woff", ".woff2", ".ttf", ".otf", ".eot"}:
        return FONT_DIR
    return OTHER_DIR


def local_asset_path(url: str) -> str:
    if url in asset_map:
        return asset_map[url]
    p = urlparse(url)
    base = os.path.basename(p.path) or "file"
    stem, ext = os.path.splitext(base)
    safe_stem = re.sub(r"[^a-zA-Z0-9._-]", "-", stem) or "file"
    target_dir = pick_asset_folder(p.path)
    fname = f"{safe_stem}-{hashname(url)}{ext}"
    fp = os.path.join(target_dir, fname)
    asset_map[url] = fp
    return fp


def fetch_asset(url: str):
    try:
        r = session.get(url, timeout=30)
        if r.status_code != 200:
            return
        fp = local_asset_path(url)
        if not os.path.exists(fp):
            with open(fp, "wb") as f:
                f.write(r.content)
    except Exception:
        return


def rel_from_page(page_file: str, target_file: str) -> str:
    return os.path.relpath(target_file, os.path.dirname(page_file)).replace("\\", "/")


def maybe_enqueue(link: str, current: str):
    if not link:
        return
    abs_url = urljoin(current, link)
    n = norm_url(abs_url)
    if not is_internal(n):
        return
    p = urlparse(n)
    ext = os.path.splitext(p.path.lower())[1]
    if ext and ext in IGNORE_EXT:
        return
    if ext and ext not in {"", ".html", ".htm", ".php"}:
        return
    if n not in visited:
        queue.append(n)


def rewrite_dom(soup: BeautifulSoup, page_url: str, page_file: str):
    # remove WP runtime scripts
    for s in list(soup.find_all("script")):
        src = s.get("src", "")
        txt = (s.string or "") if s.string else ""
        if any(k in src.lower() for k in ["wp-json", "elementor", "wp-content/plugins", "emoji", "jetpack", "wpcf7"])):
            s.decompose()
            continue
        if "elementor" in txt.lower() or "wp" in txt.lower() and "ajaxurl" in txt.lower():
            s.decompose()

    attr_map = {
        "a": ["href"],
        "img": ["src", "srcset"],
        "source": ["src", "srcset"],
        "link": ["href"],
        "script": ["src"],
        "video": ["src", "poster"],
        "audio": ["src"],
        "iframe": ["src"],
    }

    for tag, attrs in attr_map.items():
        for el in soup.find_all(tag):
            for attr in attrs:
                if not el.has_attr(attr):
                    continue
                val = el.get(attr)
                if not val:
                    continue
                if attr == "srcset":
                    new_parts = []
                    for part in [p.strip() for p in val.split(",") if p.strip()]:
                        bits = part.split()
                        u = bits[0]
                        abs_u = urljoin(page_url, u)
                        n = norm_url(abs_u)
                        if is_internal(n):
                            fetch_asset(n)
                            rel = rel_from_page(page_file, local_asset_path(n))
                            bits[0] = rel
                        new_parts.append(" ".join(bits))
                    el[attr] = ", ".join(new_parts)
                    continue

                abs_u = urljoin(page_url, val)
                n = norm_url(abs_u)
                p = urlparse(n)

                if tag == "a":
                    if is_internal(n):
                        ext = os.path.splitext(p.path.lower())[1]
                        if ext in {"", ".html", ".htm", ".php"}:
                            target = page_output_path(n)
                            rel = rel_from_page(page_file, target)
                            if rel.endswith("index.html"):
                                rel = rel[:-10]
                            if rel == "":
                                rel = "./"
                            if not rel.endswith("/") and os.path.splitext(rel)[1] == "":
                                rel += "/"
                            el[attr] = rel
                            maybe_enqueue(n, page_url)
                        else:
                            fetch_asset(n)
                            el[attr] = rel_from_page(page_file, local_asset_path(n))
                    continue

                if is_internal(n):
                    fetch_asset(n)
                    el[attr] = rel_from_page(page_file, local_asset_path(n))

    # neutralize forms (no submission)
    for form in soup.find_all("form"):
        form["action"] = "javascript:void(0)"
        form["method"] = "get"
        form["onsubmit"] = "return false;"

    # rename wp/elementor classes and ids
    for el in soup.find_all(True):
        if el.has_attr("class"):
            classes = []
            for c in el.get("class", []):
                nc = c
                nc = re.sub(r"^wp-", "astro-", nc)
                nc = nc.replace("wp_", "astro_")
                nc = nc.replace("elementor", "astro")
                classes.append(nc)
            el["class"] = classes
        if el.has_attr("id"):
            i = el.get("id", "")
            i = re.sub(r"^wp-", "astro-", i)
            i = i.replace("wp_", "astro_").replace("elementor", "astro")
            el["id"] = i

        attrs_to_update = {}
        for k, v in list(el.attrs.items()):
            nk = k
            if "elementor" in nk:
                nk = nk.replace("elementor", "astro")
            if nk.startswith("data-wp-"):
                nk = nk.replace("data-wp-", "data-astro-")
            if nk != k:
                attrs_to_update[nk] = v
                del el.attrs[k]
        el.attrs.update(attrs_to_update)


def crawl():
    while queue:
        u = queue.popleft()
        u = norm_url(u)
        if u in visited:
            continue
        visited.add(u)
        try:
            r = session.get(u, timeout=30)
            if r.status_code != 200:
                continue
            ctype = r.headers.get("content-type", "")
            if "text/html" not in ctype:
                continue
            html = r.text
            soup = BeautifulSoup(html, "html.parser")

            for a in soup.find_all("a", href=True):
                maybe_enqueue(a["href"], u)

            out_fp = page_output_path(u)
            ensure_parent(out_fp)
            rewrite_dom(soup, u, out_fp)

            with open(out_fp, "w", encoding="utf-8") as f:
                f.write(str(soup))

            pages.append({"url": u, "file": os.path.relpath(out_fp, OUT).replace("\\", "/")})
            print(f"saved {u}")
        except Exception as e:
            print(f"skip {u}: {e}")

    manifest = {
        "base": BASE,
        "page_count": len(pages),
        "asset_count": len(asset_map),
        "pages": pages,
    }
    with open(os.path.join(OUT, "export-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


if __name__ == "__main__":
    crawl()
