from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "robertshearingclinic"
LIVE_SITEMAPS = ROOT.parent / "live-sitemaps"
SHELL_DIR = ROOT / "src" / "shells"
DATA_DIR = ROOT / "src" / "data"
MIGRATION_CACHE_DIR = ROOT / "migration-cache"
PUBLIC_DIR = ROOT / "public"
SEED_PATH = ROOT / "seed" / "seed.json"
LIVE_META_CACHE = MIGRATION_CACHE_DIR / "live-meta-cache.json"

LIVE_HOST = "https://www.robertshearingclinic.com"

PRIMARY_PAGE_ROUTES = {
    "/",
    "/about-us/",
    "/contact-us/",
    "/sitemap/",
    "/doctors/",
    "/insurance/",
    "/request-an-appointment/",
}

TEAM_ROUTES = {
    "/audiologist/katie-pierce-m-c-d/",
    "/audiologist/julie-tucker/",
    "/audiologist/quinn-felton/",
}

COLLECTIONS = ("pages", "team_members", "posts", "internal_pages")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8", newline="\n")


def normalize_route(value: str) -> str:
    parsed = urlparse(value)
    path = parsed.path if parsed.scheme else value
    if not path.startswith("/"):
        path = f"/{path}"
    if path != "/" and not path.endswith("/"):
        path += "/"
    return path


def route_to_slug(route: str) -> str:
    if route == "/":
        return "home"
    slug = route.strip("/").replace("/", "-")
    return re.sub(r"[^a-z0-9-]+", "-", slug.lower()).strip("-")


def route_to_shell_key(route: str) -> str:
    return f"{route_to_slug(route)}.html"


def extract_direct_sitemap_urls(path: Path) -> list[dict[str, str]]:
    soup = BeautifulSoup(read_text(path), "xml")
    rows: list[dict[str, str]] = []
    for url in soup.find_all("url"):
        loc = url.find("loc", recursive=False)
        if not loc:
            continue
        lastmod = url.find("lastmod", recursive=False)
        rows.append(
            {
                "loc": loc.get_text(strip=True),
                "route": normalize_route(loc.get_text(strip=True)),
                "lastmod": lastmod.get_text(strip=True) if lastmod else "",
            }
        )
    return rows


def load_sitemap_groups() -> dict[str, list[dict[str, str]]]:
    return {
        "post": extract_direct_sitemap_urls(LIVE_SITEMAPS / "post-sitemap.xml"),
        "page": extract_direct_sitemap_urls(LIVE_SITEMAPS / "page-sitemap.xml"),
        "audiologist": extract_direct_sitemap_urls(LIVE_SITEMAPS / "audiologist-sitemap.xml"),
        "location": extract_direct_sitemap_urls(LIVE_SITEMAPS / "location-sitemap.xml"),
        "local": extract_direct_sitemap_urls(LIVE_SITEMAPS / "local-sitemap.xml"),
    }


def load_live_meta_cache() -> dict[str, dict[str, str]]:
    if LIVE_META_CACHE.exists():
        return json.loads(read_text(LIVE_META_CACHE))
    return {}


def fetch_live_meta(url: str) -> dict[str, str]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 Roberts Hearing Emdash migration",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urllib.request.urlopen(req, timeout=25) as response:
        html = response.read().decode("utf-8", errors="ignore")
    soup = BeautifulSoup(html, "lxml")
    title = soup.title.get_text(strip=True) if soup.title else ""
    desc_tag = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
    og_title = soup.find("meta", attrs={"property": "og:title"})
    og_desc = soup.find("meta", attrs={"property": "og:description"})
    return {
        "title": title,
        "description": desc_tag.get("content", "").strip() if desc_tag else "",
        "og_title": og_title.get("content", "").strip() if og_title else "",
        "og_description": og_desc.get("content", "").strip() if og_desc else "",
    }


def get_live_meta(url: str, cache: dict[str, dict[str, str]]) -> dict[str, str]:
    if url in cache:
        return cache[url]
    try:
        cache[url] = fetch_live_meta(url)
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        print(f"[meta] fallback for {url}: {error}")
        cache[url] = {"title": "", "description": "", "og_title": "", "og_description": ""}
    return cache[url]


def meta_content(soup: BeautifulSoup, *, name: str | None = None, prop: str | None = None) -> str:
    attrs: dict[str, Any]
    if name:
        attrs = {"name": re.compile(f"^{re.escape(name)}$", re.I)}
    else:
        attrs = {"property": prop}
    tag = soup.find("meta", attrs=attrs)
    return tag.get("content", "").strip() if tag else ""


def first_json_ld(soup: BeautifulSoup) -> str:
    tag = soup.find("script", class_=re.compile("rank-math-schema-pro"))
    if not tag:
        tag = soup.find("script", attrs={"type": "application/ld+json"})
    return tag.string.strip() if tag and tag.string else ""


def split_shell_and_content(html: str) -> tuple[str, str]:
    header = re.search(r"</header\s*>", html, re.I)
    footer = re.search(r"<footer\b", html, re.I)
    if header and footer and header.end() < footer.start():
        content = html[header.end() : footer.start()]
        shell = html[: header.end()] + "\n<!--EMDASH_CONTENT-->\n" + html[footer.start() :]
        return shell, content

    body_open = re.search(r"<body\b[^>]*>", html, re.I)
    body_close = re.search(r"</body\s*>", html, re.I)
    if body_open and body_close and body_open.end() < body_close.start():
        content = html[body_open.end() : body_close.start()]
        shell = html[: body_open.end()] + "\n<!--EMDASH_CONTENT-->\n" + html[body_close.start() :]
        return shell, content

    return "<!doctype html><html><body><!--EMDASH_CONTENT--></body></html>", html


def clean_text(value: str) -> str:
    value = unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def portable_text_from_html(fragment_html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(fragment_html, "lxml")
    blocks: list[dict[str, Any]] = []
    key = 0
    seen: set[str] = set()
    for node in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li"]):
        text = clean_text(node.get_text(" ", strip=True))
        if not text:
            continue
        signature = f"{node.name}:{text}"
        if signature in seen:
            continue
        seen.add(signature)
        style = node.name if node.name and node.name.startswith("h") else "normal"
        block: dict[str, Any] = {
            "_type": "block",
            "_key": f"b{key}",
            "style": style,
            "children": [{"_type": "span", "_key": f"s{key}", "text": text, "marks": []}],
        }
        if node.name == "li":
            block["style"] = "normal"
            block["listItem"] = "bullet"
            block["level"] = 1
        blocks.append(block)
        key += 1
        if key >= 80:
            break
    if not blocks:
        blocks.append(
            {
                "_type": "block",
                "_key": "b0",
                "style": "normal",
                "children": [{"_type": "span", "_key": "s0", "text": "", "marks": []}],
            }
        )
    return blocks


def find_h1(soup: BeautifulSoup) -> str:
    h1 = soup.find("h1")
    return clean_text(h1.get_text(" ", strip=True)) if h1 else ""


def strip_site_suffix(title: str) -> str:
    return re.sub(r"\s+[\-|]\s+Roberts Hearing Clinic\s*$", "", title).strip()


def article_section(schema_json: str) -> str:
    if not schema_json:
        return ""
    try:
        data = json.loads(schema_json)
    except json.JSONDecodeError:
        return ""
    nodes = data.get("@graph", []) if isinstance(data, dict) else []
    for node in nodes:
        if isinstance(node, dict) and node.get("articleSection"):
            return str(node.get("articleSection"))
    return ""


def slugify(value: str) -> str:
    value = clean_text(value).lower()
    value = value.replace("&", "and")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def classify_route(route: str, sitemap_group: str | None, post_routes: set[str]) -> str:
    if route in PRIMARY_PAGE_ROUTES:
        return "pages"
    if route in TEAM_ROUTES:
        return "team_members"
    if route in post_routes:
        return "posts"
    return "internal_pages"


def common_fields() -> list[dict[str, Any]]:
    return [
        {"slug": "title", "label": "Title", "type": "string", "required": True, "searchable": True},
        {"slug": "route", "label": "Route Path", "type": "string", "required": True, "unique": True},
        {"slug": "meta_title", "label": "Meta Title", "type": "string"},
        {"slug": "meta_description", "label": "Meta Description", "type": "text"},
        {"slug": "content", "label": "Body Content (Rich Editor)", "type": "portableText", "searchable": True},
        {
            "slug": "body_html",
            "label": "Advanced Body HTML (preserves converted layout)",
            "type": "text",
            "searchable": True,
            "widget": "textarea",
            "options": {"rows": 18},
        },
        {"slug": "excerpt", "label": "Excerpt", "type": "text"},
        {"slug": "featured_image", "label": "Featured Image", "type": "image"},
        {"slug": "featured_image_path", "label": "Current Static Featured Image Path", "type": "string"},
        {"slug": "template_family", "label": "Template Family", "type": "string"},
        {"slug": "shell_key", "label": "Shell File", "type": "string"},
        {"slug": "schema_json", "label": "JSON-LD Schema", "type": "text"},
        {"slug": "sitemap_group", "label": "Sitemap Group", "type": "string"},
        {"slug": "sitemap_lastmod", "label": "Sitemap Last Modified", "type": "datetime"},
        {"slug": "include_in_sitemap", "label": "Include in XML Sitemap", "type": "boolean"},
        {"slug": "sort_order", "label": "Sort Order", "type": "integer"},
    ]


def build_seed(entries: dict[str, list[dict[str, Any]]], category_terms: dict[str, str]) -> dict[str, Any]:
    collections = [
        {
            "slug": "pages",
            "label": "Pages",
            "labelSingular": "Page",
            "urlPattern": "{route}",
            "supports": ["drafts", "revisions", "search", "seo"],
            "fields": common_fields(),
        },
        {
            "slug": "team_members",
            "label": "Team Members",
            "labelSingular": "Team Member",
            "urlPattern": "{route}",
            "supports": ["drafts", "revisions", "search", "seo"],
            "fields": common_fields()
            + [
                {"slug": "credentials", "label": "Credentials", "type": "string"},
                {"slug": "job_title", "label": "Job Title", "type": "string"},
            ],
        },
        {
            "slug": "posts",
            "label": "Posts",
            "labelSingular": "Post",
            "urlPattern": "{route}",
            "supports": ["drafts", "revisions", "search", "seo", "scheduling"],
            "fields": common_fields()
            + [
                {"slug": "author_name", "label": "Author Name", "type": "string"},
                {"slug": "published_label", "label": "Displayed Publish Date", "type": "string"},
            ],
        },
        {
            "slug": "internal_pages",
            "label": "Internal Pages",
            "labelSingular": "Internal Page",
            "urlPattern": "{route}",
            "supports": ["drafts", "revisions", "search", "seo"],
            "fields": common_fields(),
        },
    ]

    menu_items = [
        {
            "type": "custom",
            "label": "About Us",
            "url": "/about-us/",
            "children": [
                {
                    "type": "custom",
                    "label": "Our Team",
                    "url": "/doctors/",
                    "children": [
                        {"type": "custom", "label": "Katie Pierce, M.C.D.", "url": "/audiologist/katie-pierce-m-c-d/"},
                        {"type": "custom", "label": "Julie Tucker", "url": "/audiologist/julie-tucker/"},
                        {"type": "custom", "label": "Quinn Felton", "url": "/audiologist/quinn-felton/"},
                    ],
                },
                {"type": "custom", "label": "Insurance", "url": "/insurance/"},
            ],
        },
        {
            "type": "custom",
            "label": "Services",
            "url": "/services/",
            "children": [
                {"type": "custom", "label": "Hearing Tests", "url": "/hearing-tests/"},
                {"type": "custom", "label": "Diagnostic Services", "url": "/diagnostic-services/"},
                {"type": "custom", "label": "Hearing Aid Batteries", "url": "/hearing-aid-batteries/"},
                {"type": "custom", "label": "Tinnitus Support", "url": "/tinnitus-management/"},
                {"type": "custom", "label": "Hearing Aid Fittings", "url": "/hearing-aid-fittings/"},
                {"type": "custom", "label": "Custom Hearing Protection", "url": "/custom-hearing-protection/"},
                {"type": "custom", "label": "Hearing Aid Alternatives", "url": "/hearing-aid-alternatives/"},
                {"type": "custom", "label": "Audiology Services", "url": "/audiology-services/"},
                {
                    "type": "custom",
                    "label": "Sensorineural Hearing Loss Treatment",
                    "url": "/sensorineural-hearing-loss-treatment/",
                },
            ],
        },
        {
            "type": "custom",
            "label": "Hearing Aids",
            "url": "/hearing-aids-and-products/",
            "children": [
                {"type": "custom", "label": "Hearing Aids & Products", "url": "/hearing-aids-and-products/"},
                {"type": "custom", "label": "Starkey Hearing Aids", "url": "/starkey-hearing-aids/"},
                {"type": "custom", "label": "Oticon Hearing Aids", "url": "/oticon-hearing-aids/"},
                {"type": "custom", "label": "Phonak Hearing Aids", "url": "/phonak-hearing-aids/"},
                {"type": "custom", "label": "ReSound Hearing Aids", "url": "/resound-hearing-aids/"},
                {"type": "custom", "label": "Signia Hearing Aids", "url": "/signia-hearing-aids/"},
                {"type": "custom", "label": "Unitron Hearing Aids", "url": "/unitron-hearing-aids/"},
                {"type": "custom", "label": "Widex Hearing Aids", "url": "/widex-hearing-aids/"},
                {"type": "custom", "label": "Rexton Hearing Aids", "url": "/rexton-hearing-aids/"},
            ],
        },
        {"type": "custom", "label": "Contact Us", "url": "/contact-us/"},
        {"type": "custom", "label": "Book an Appointment", "url": "/request-an-appointment/"},
    ]

    return {
        "$schema": "https://emdashcms.com/seed.schema.json",
        "version": "1",
        "meta": {
            "name": "Roberts Hearing Clinic",
            "description": "Dynamic Emdash conversion of Roberts Hearing Clinic.",
            "author": "Bidview Marketing",
        },
        "settings": {
            "title": "Roberts Hearing Clinic",
            "tagline": "Audiologist in Alexandria",
        },
        "collections": collections,
        "taxonomies": [
            {
                "name": "category",
                "label": "Categories",
                "labelSingular": "Category",
                "hierarchical": True,
                "collections": ["posts"],
                "terms": [
                    {"slug": slug, "label": label}
                    for slug, label in sorted(category_terms.items(), key=lambda item: item[0])
                ],
            },
            {
                "name": "tag",
                "label": "Tags",
                "labelSingular": "Tag",
                "hierarchical": False,
                "collections": ["posts"],
                "terms": [],
            },
        ],
        "menus": [{"name": "primary", "label": "Primary Navigation", "items": menu_items}],
        "widgetAreas": [],
        "content": entries,
    }


def main() -> None:
    manifest = json.loads(read_text(SOURCE / "export-manifest.json"))
    sitemap_groups = load_sitemap_groups()
    sitemap_by_route: dict[str, dict[str, str]] = {}
    for group, rows in sitemap_groups.items():
        for row in rows:
            sitemap_by_route[row["route"]] = {"group": group, "lastmod": row["lastmod"], "loc": row["loc"]}

    post_routes = {row["route"] for row in sitemap_groups["post"]}
    live_meta_cache = load_live_meta_cache()

    entries: dict[str, list[dict[str, Any]]] = {name: [] for name in COLLECTIONS}
    category_terms: dict[str, str] = {}
    route_manifest: list[dict[str, Any]] = []

    SHELL_DIR.mkdir(parents=True, exist_ok=True)
    for old in SHELL_DIR.glob("*.html"):
        old.unlink()

    for order, page in enumerate(manifest["pages"]):
        route = normalize_route(page["route"])
        html_path = SOURCE / page["output"]
        html = read_text(html_path)
        soup = BeautifulSoup(html, "lxml")
        shell, body_html = split_shell_and_content(html)
        shell_key = route_to_shell_key(route)
        write_text(SHELL_DIR / shell_key, shell)
        if route == "/about-us/":
            write_text(SHELL_DIR / "default.html", shell)

        live_meta = get_live_meta(page["source_url"], live_meta_cache)
        local_title = soup.title.get_text(strip=True) if soup.title else page.get("title", "")
        local_description = meta_content(soup, name="description")
        schema_json = first_json_ld(soup)
        sitemap_info = sitemap_by_route.get(route)
        collection = classify_route(route, sitemap_info["group"] if sitemap_info else None, post_routes)
        h1 = find_h1(soup)
        title = h1 or strip_site_suffix(live_meta.get("title") or local_title)
        meta_title = live_meta.get("title") or local_title
        meta_description = live_meta.get("description") or local_description
        featured_image_path = meta_content(soup, prop="og:image") or ""

        data: dict[str, Any] = {
            "title": title,
            "route": route,
            "meta_title": meta_title,
            "meta_description": meta_description,
            "content": portable_text_from_html(body_html),
            "body_html": body_html.strip(),
            "excerpt": meta_description,
            "featured_image_path": featured_image_path,
            "template_family": page.get("alias_of") and "Alias Route" or collection.replace("_", " ").title(),
            "shell_key": shell_key,
            "schema_json": schema_json,
            "sitemap_group": sitemap_info["group"] if sitemap_info else "",
            "sitemap_lastmod": sitemap_info["lastmod"] if sitemap_info else "",
            "include_in_sitemap": bool(sitemap_info and sitemap_info["group"] != "local"),
            "sort_order": order,
        }

        taxonomies: dict[str, list[str]] | None = None
        if collection == "posts":
            section = article_section(schema_json) or "Hearing"
            term_slug = slugify(section) or "hearing"
            category_terms[term_slug] = section
            taxonomies = {"category": [term_slug]}
            data["author_name"] = "Julie Tucker"
            data["published_label"] = sitemap_info["lastmod"][:10] if sitemap_info else ""

        if collection == "team_members":
            pieces = [piece.strip() for piece in title.split(",", 1)]
            data["credentials"] = pieces[1] if len(pieces) > 1 else ""
            job_match = re.search(r"(Audiologist|Hearing Instrument Specialist|Patient Care Coordinator)", soup.get_text(" "))
            data["job_title"] = job_match.group(1) if job_match else ""

        entry: dict[str, Any] = {
            "id": route_to_slug(route),
            "slug": route_to_slug(route),
            "status": "published",
            "data": data,
        }
        if taxonomies:
            entry["taxonomies"] = taxonomies
        entries[collection].append(entry)
        route_manifest.append(
            {
                "route": route,
                "collection": collection,
                "slug": route_to_slug(route),
                "shell_key": shell_key,
                "source_url": page["source_url"],
                "sitemap_group": data["sitemap_group"],
            }
        )

    write_text(LIVE_META_CACHE, json.dumps(live_meta_cache, ensure_ascii=False, indent=2))
    write_text(MIGRATION_CACHE_DIR / "route-manifest.json", json.dumps(route_manifest, ensure_ascii=False, indent=2))
    write_text(MIGRATION_CACHE_DIR / "sitemaps.json", json.dumps(sitemap_groups, ensure_ascii=False, indent=2))
    write_text(SEED_PATH, json.dumps(build_seed(entries, category_terms), ensure_ascii=False, indent="\t"))

    print("[build] shells", len(route_manifest))
    for collection in COLLECTIONS:
        print(f"[build] {collection}", len(entries[collection]))


if __name__ == "__main__":
    main()
