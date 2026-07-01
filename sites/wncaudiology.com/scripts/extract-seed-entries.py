"""
Extract seed entries from existing Astro pages for posts and brands collections.
Reads src/pages/*.astro and src/pages/hearing-aids/*.astro to pull
title, description, canonical, bodyClass, html_file from each page,
then writes/updates seed/seed.json with collection schemas + entries.
"""
import re
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
PAGES = ROOT / "src" / "pages"
SEED_FILE = ROOT / "seed" / "seed.json"

# ── helpers ──────────────────────────────────────────────────────────────────

def read_astro(path):
    text = path.read_text(encoding="utf-8")
    return text

def extract_prop(text, prop_name):
    """Extract a prop value from an Astro page: title="..." or title={...}"""
    # Match: prop="value" (quoted)
    m = re.search(rf'{prop_name}="([^"]*)"', text)
    if m:
        return m.group(1)
    # Match: prop={`value`} (template literal)
    m = re.search(rf'{prop_name}={{`([^`]*)`}}', text)
    if m:
        return m.group(1)
    return ""

def extract_html_file(text):
    """Extract the html fragment filename from ?raw import."""
    m = re.search(r'import pageHtml from ["\'].*?/([^/]+)\.html\?raw["\']', text)
    if m:
        return m.group(1)
    return ""

# ── blog posts ────────────────────────────────────────────────────────────────

BLOG_POST_SLUGS = [
    "ear-candling-risks-and-alternatives",
    "hearing-aids-for-tinnitus-finding-relief-in-asheville",
    "how-long-does-it-take-to-get-used-to-hearing-aids",
    "hyperacusis-when-sounds-feel-too-loud",
    "over-the-counter-hearing-aids-what-you-need-to-know",
    "swimmers-ear-causes-symptoms-treatment-and-prevention-tips",
    "understanding-pressure-in-the-ear-causes-symptoms-and-relief-options",
    "hearing-test-online-what-you-need-to-know",
]

# published_at from rank-math schema datePublished — extracted previously
PUBLISHED_DATES = {
    "ear-candling-risks-and-alternatives": "2026-02-04",
    "hearing-aids-for-tinnitus-finding-relief-in-asheville": "2025-11-17",
    "how-long-does-it-take-to-get-used-to-hearing-aids": "2026-04-16",
    "hyperacusis-when-sounds-feel-too-loud": "2026-01-08",
    "over-the-counter-hearing-aids-what-you-need-to-know": "2025-10-03",
    "swimmers-ear-causes-symptoms-treatment-and-prevention-tips": "2025-12-05",
    "understanding-pressure-in-the-ear-causes-symptoms-and-relief-options": "2025-11-05",
    "hearing-test-online-what-you-need-to-know": "2025-10-03",
}

post_entries = []
for slug in BLOG_POST_SLUGS:
    astro_file = PAGES / f"{slug}.astro"
    if not astro_file.exists():
        print(f"  SKIP (not found): {astro_file}")
        continue
    text = read_astro(astro_file)
    title = extract_prop(text, "title")
    desc  = extract_prop(text, "description")
    canonical = extract_prop(text, "canonical")
    body_class = extract_prop(text, "bodyClass")
    html_file = extract_html_file(text)

    entry = {
        "collection": "blog_articles",
        "id": slug,
        "status": "published",
        "data": {
            "slug_path": f"/{slug}/",
            "html_file": html_file,
            "seo_title": title,
            "seo_description": desc,
            "body_class": body_class,
            "published_at": PUBLISHED_DATES.get(slug, "2026-01-01"),
        }
    }
    post_entries.append(entry)
    print(f"  post: {slug} -> html_file={html_file}")

# ── brands ────────────────────────────────────────────────────────────────────

BRAND_SLUGS = ["phonak", "oticon", "resound", "unitron", "widex", "starkey", "signia"]

brand_entries = []
for slug in BRAND_SLUGS:
    astro_file = PAGES / "hearing-aids" / f"{slug}.astro"
    if not astro_file.exists():
        print(f"  SKIP (not found): {astro_file}")
        continue
    text = read_astro(astro_file)
    title = extract_prop(text, "title")
    desc  = extract_prop(text, "description")
    canonical = extract_prop(text, "canonical")
    body_class = extract_prop(text, "bodyClass")
    html_file = extract_html_file(text)

    entry = {
        "collection": "brands",
        "id": slug,
        "status": "published",
        "data": {
            "slug_path": f"/hearing-aids/{slug}/",
            "html_file": html_file,
            "seo_title": title,
            "seo_description": desc,
            "body_class": body_class,
        }
    }
    brand_entries.append(entry)
    print(f"  brand: {slug} -> html_file={html_file}")

# ── build seed.json ───────────────────────────────────────────────────────────

seed = json.loads(SEED_FILE.read_text(encoding="utf-8-sig"))

seed["collections"] = [
    {
        "name": "blog_articles",
        "slug": "blog_articles",
        "label": "Blog Articles",
        "fields": [
            {"name": "slug_path",       "slug": "slug_path",       "type": "string", "label": "URL Slug Path"},
            {"name": "html_file",       "slug": "html_file",       "type": "string", "label": "HTML Fragment File"},
            {"name": "seo_title",       "slug": "seo_title",       "type": "string", "label": "SEO Title"},
            {"name": "seo_description", "slug": "seo_description", "type": "text",   "label": "SEO Description"},
            {"name": "body_class",      "slug": "body_class",      "type": "string", "label": "Body CSS Classes"},
            {"name": "published_at",    "slug": "published_at",    "type": "string", "label": "Published Date"},
        ]
    },
    {
        "name": "brands",
        "slug": "brands",
        "label": "Hearing Aid Brands",
        "fields": [
            {"name": "slug_path",       "slug": "slug_path",       "type": "string", "label": "URL Slug Path"},
            {"name": "html_file",       "slug": "html_file",       "type": "string", "label": "HTML Fragment File"},
            {"name": "seo_title",       "slug": "seo_title",       "type": "string", "label": "SEO Title"},
            {"name": "seo_description", "slug": "seo_description", "type": "text",   "label": "SEO Description"},
            {"name": "body_class",      "slug": "body_class",      "type": "string", "label": "Body CSS Classes"},
        ]
    }
]

# Remove any old entries for blog_articles/brands, then add fresh ones
old_entries = [e for e in seed.get("entries", []) if e.get("collection") not in ("blog_articles", "brands")]
seed["entries"] = old_entries + post_entries + brand_entries

SEED_FILE.write_text(json.dumps(seed, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\nWrote {len(post_entries)} posts + {len(brand_entries)} brands -> {SEED_FILE}")
