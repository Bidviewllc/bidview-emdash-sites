import re
from pathlib import Path


OUTPUT_DIR = Path("local-copy")
STAGING_BASE = "https://staging.example.com"


TEXT_EXTENSIONS = {".html", ".css", ".svg", ".xml", ".js"}


def route_for_index(path):
    rel = path.relative_to(OUTPUT_DIR).as_posix()
    if rel == "index.html":
        return ""
    return rel[:-len("/index.html")]


def canonical(route):
    return f"{STAGING_BASE}/" if not route else f"{STAGING_BASE}/{route}/"


def clean_common(text):
    replacements = {
        "Elementor": "Astro",
        "elementor": "astro",
        "WordPress": "Astro",
        "wordpress": "astro",
        "wp-img-auto-sizes-contain-inline-css": "astro-img-auto-sizes-contain-inline-css",
        "global-styles-inline-css": "astro-global-styles",
        "wp-element-button": "astro-element-button",
        "wp-block": "astro-block",
        "wp-container": "astro-container",
        "wp-image": "astro-image",
        "wp-post": "astro-post",
        "wp-page": "astro-page",
        "wp-site": "astro-site",
        "wp-theme": "astro-theme",
        "wp-custom": "astro-custom",
        "wp-embed": "astro-embed",
        "wp-singular": "astro-singular",
        "wp-caption": "astro-caption",
        "wp-": "astro-",
        "wp--": "astro--",
        "--wp--": "--astro--",
        "wp_": "astro_",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"/\*# sourceURL=[^*]*\*/", "", text)
    return text


def clean_html(path, text):
    route = route_for_index(path)
    text = re.sub(r"<meta\s+name=[\"']generator[\"'][^>]*>", "", text, flags=re.I)
    text = re.sub(r"<meta\b[^>]+content=[\"'][^\"']*/(?:wp|astro)-content/[^\"']*[\"'][^>]*>", "", text, flags=re.I)
    text = re.sub(r"<noscript>\s*<iframe[^>]+googletagmanager[^<]*</iframe>\s*</noscript>", "", text, flags=re.I)
    text = re.sub(r"<link\s+rel=[\"']canonical[\"'][^>]*>", "", text, flags=re.I)
    text = text.replace("</head>", f'<link rel="canonical" href="{canonical(route)}"></head>', 1)
    text = clean_common(text)
    return text


def main():
    for path in OUTPUT_DIR.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if path.name == "index.html":
            text = clean_html(path, text)
        else:
            text = clean_common(text)
        path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
