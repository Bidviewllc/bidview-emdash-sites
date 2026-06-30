from __future__ import annotations

import shutil
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOCAL_COPY = ROOT / "local-copy"
ASSETS = LOCAL_COPY / "assets"
MEDIA = ASSETS / "media"
STYLES = ASSETS / "styles"
FONTAWESOME_SRC = ROOT / "node_modules" / "@fortawesome" / "fontawesome-free"
FONTAWESOME_DEST = ASSETS / "fontawesome"
HERO_FILES = [
    "Container-14.png",
    "Container-13.png",
    "Container-10.png",
    "Container-9.png",
    "Container-8.png",
]
MOBILE_HERO_FILES = [
    ("2026/01", "b3936bf26e598e09780ba034ad31945812b1a7ec-3-scaled.jpg"),
    ("2026/01", "a453517995ef4f9024da95c58708762cf086a2c9-1-scaled.jpg"),
    ("2026/01", "2a48519f56654a5c1a96ad3d40f0c8725c93649f-1-scaled.jpg"),
    ("2026/01", "35681cba80fd3adfbf4e0e5fd205db18df727f18-1-scaled.jpg"),
    ("2026/01", "efe48ed77636304e7db6c572e3043d70d39e26bd-scaled.jpg"),
    ("2026/01", "d2e53c493b004e96e1b6f9cdbbf3cd9a0738899d-1-scaled.jpg"),
    ("2026/04", "DSC00303.jpg"),
    ("2026/04", "DSC01954.jpg"),
]


def relative_prefix(html_file: Path) -> str:
    depth = len(html_file.parent.relative_to(LOCAL_COPY).parts)
    return "../" * depth


def download(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        return
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        dest.write_bytes(response.read())


def install_fontawesome() -> None:
    if not FONTAWESOME_SRC.exists():
        raise SystemExit("Font Awesome package is missing. Run npm install first.")
    (FONTAWESOME_DEST / "css").mkdir(parents=True, exist_ok=True)
    (FONTAWESOME_DEST / "webfonts").mkdir(parents=True, exist_ok=True)
    shutil.copy2(FONTAWESOME_SRC / "css" / "all.min.css", FONTAWESOME_DEST / "css" / "all.min.css")
    for font_file in (FONTAWESOME_SRC / "webfonts").glob("*"):
        if font_file.is_file():
            shutil.copy2(font_file, FONTAWESOME_DEST / "webfonts" / font_file.name)


def install_hero_images() -> None:
    MEDIA.mkdir(parents=True, exist_ok=True)
    for filename in HERO_FILES:
        url = f"https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/01/{filename}"
        download(url, MEDIA / filename)
    for dated_path, filename in MOBILE_HERO_FILES:
        url = f"https://raleighhearingandtinnituscenter.com/wp-content/uploads/{dated_path}/{filename}"
        download(url, MEDIA / filename)


def write_parity_css() -> None:
    STYLES.mkdir(parents=True, exist_ok=True)
    css = """/* Local visual parity fixes for assets that WordPress injected at runtime. */
.astro-element-41a1dbf:not(.astro-motion-effects-element-type-background),
.astro-element-41a1dbf > .astro-motion-effects-container > .astro-motion-effects-layer {
  background-image: url("../media/Container-14.png") !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}

.astro-element-41a1dbf {
  background-image: url("../media/Container-14.png") !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}
"""
    (STYLES / "local-parity.css").write_text(css, encoding="utf-8")


def rewrite_homepage_slideshow() -> None:
    index_file = LOCAL_COPY / "index.html"
    html = index_file.read_text(encoding="utf-8")
    for filename in HERO_FILES:
        local_url = f"assets/media/{filename}"
        escaped_local_url = local_url.replace("/", "\\/")
        for remote_path in (
            f"https://raleighhearingandtinnituscenter.com/wp-content/uploads/2026/01/{filename}",
            f"https://raleighhearingandtinnituscenter.com/astro-content/uploads/2026/01/{filename}",
        ):
            html = html.replace(remote_path, local_url)
            html = html.replace(remote_path.replace("/", "\\/"), escaped_local_url)
    for dated_path, filename in MOBILE_HERO_FILES:
        local_url = f"assets/media/{filename}"
        escaped_local_url = local_url.replace("/", "\\/")
        for remote_path in (
            f"https://raleighhearingandtinnituscenter.com/wp-content/uploads/{dated_path}/{filename}",
            f"https://raleighhearingandtinnituscenter.com/astro-content/uploads/{dated_path}/{filename}",
        ):
            html = html.replace(remote_path, local_url)
            html = html.replace(remote_path.replace("/", "\\/"), escaped_local_url)
    index_file.write_text(html, encoding="utf-8")


def ensure_stylesheet_links() -> None:
    for html_file in LOCAL_COPY.rglob("index.html"):
        html = html_file.read_text(encoding="utf-8")
        prefix = relative_prefix(html_file)
        links = [
            f'<link rel="stylesheet" href="{prefix}assets/fontawesome/css/all.min.css">',
            f'<link rel="stylesheet" href="{prefix}assets/styles/local-parity.css">',
        ]
        changed = False
        for link in links:
            href = link.split('href="', 1)[1].split('"', 1)[0]
            if href not in html:
                html = html.replace("</head>", f"{link}</head>", 1)
                changed = True
        if changed:
            html_file.write_text(html, encoding="utf-8")


def make_images_eager() -> None:
    for html_file in LOCAL_COPY.rglob("index.html"):
        html = html_file.read_text(encoding="utf-8")
        updated = html.replace('loading="lazy"', 'loading="eager"')
        if updated != html:
            html_file.write_text(updated, encoding="utf-8")


def fix_stylesheet_asset_paths() -> None:
    replacements = {
        "url('assets/fonts/": "url('../fonts/",
        'url("assets/fonts/': 'url("../fonts/',
        "url(assets/fonts/": "url(../fonts/",
        "url('assets/media/": "url('../media/",
        'url("assets/media/': 'url("../media/',
        "url(assets/media/": "url(../media/",
    }
    for css_file in STYLES.glob("*.css"):
        css = css_file.read_text(encoding="utf-8", errors="ignore")
        updated = css
        for old, new in replacements.items():
            updated = updated.replace(old, new)
        if updated != css:
            css_file.write_text(updated, encoding="utf-8")


def main() -> None:
    install_fontawesome()
    install_hero_images()
    write_parity_css()
    rewrite_homepage_slideshow()
    ensure_stylesheet_links()
    make_images_eager()
    fix_stylesheet_asset_paths()


if __name__ == "__main__":
    main()
