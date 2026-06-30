import argparse
import hashlib
import json
import mimetypes
import posixpath
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path


BASE_URL = "https://raleighhearingandtinnituscenter.com/"
SITEMAP_URL = urllib.parse.urljoin(BASE_URL, "sitemap_index.xml")
STAGING_BASE = "https://staging.example.com"
ASSET_VERSION = "20260601-rhtc-static-v1"
USER_AGENT = "Mozilla/5.0 (compatible; LocalStaticExporter/1.0)"
SKIP_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".pdf", ".zip",
    ".css", ".js", ".json", ".xml", ".txt", ".mp4", ".webm", ".mov", ".mp3",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
}
SKIP_URL_PARTS = (
    "/wp-json/",
    "/wp-admin/",
    "/wp-login.php",
    "?",
    "#",
)


def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    return urllib.request.urlopen(req, timeout=12)


def fetch_bytes(url):
    last_error = None
    for attempt in range(2):
        try:
            with request(url) as response:
                return response.read(), response.headers.get("content-type", "")
        except Exception as exc:
            last_error = exc
            time.sleep(0.5 + attempt)
    raise last_error


def normalize_page_url(url):
    parsed = urllib.parse.urlparse(urllib.parse.urljoin(BASE_URL, url))
    if parsed.scheme not in ("http", "https"):
        return None
    if parsed.netloc.lower().replace("www.", "") != urllib.parse.urlparse(BASE_URL).netloc:
        return None
    path = parsed.path or "/"
    ext = posixpath.splitext(path.rstrip("/"))[1].lower()
    if ext in SKIP_EXTENSIONS:
        return None
    if any(part in url for part in SKIP_URL_PARTS[:2]):
        return None
    path = "/" + path.strip("/")
    if path != "/":
        path += "/"
    return urllib.parse.urlunparse(("https", urllib.parse.urlparse(BASE_URL).netloc, path, "", "", ""))


def route_from_url(url):
    path = urllib.parse.urlparse(url).path.strip("/")
    return "" if not path else path


def page_dir_for_route(output_dir, route):
    return output_dir if route == "" else output_dir.joinpath(*route.split("/"))


def rel_from_page(route, target):
    depth = 0 if route == "" else len(route.split("/"))
    prefix = "../" * depth
    return prefix + target.lstrip("/")


def canonical_for_route(route):
    if route == "":
        return STAGING_BASE + "/"
    return STAGING_BASE + "/" + route.strip("/") + "/"


def clean_text(text):
    if not text:
        return text
    replacements = {
        "Elementor": "Astro",
        "elementor": "astro",
        "ELEMENTOR": "ASTRO",
        "hello-elementor": "hello-astro",
        "wp-block": "astro-block",
        "wp-container": "astro-container",
        "wp-image": "astro-image",
        "wp-post": "astro-post",
        "wp-page": "astro-page",
        "wp-site": "astro-site",
        "--wp--": "--astro--",
        "wp--": "astro--",
        "wp_": "astro_",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.page_links = set()
        self.asset_links = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link":
            rel = attrs.get("rel", "").lower()
            href = attrs.get("href")
            if href and any(token in rel for token in ("stylesheet", "icon", "preload")):
                self.asset_links.add(href)
            return
        if tag == "iframe":
            return
        for attr in ("href", "src", "poster", "data-src"):
            value = attrs.get(attr)
            if value:
                self._collect(tag, attr, value)
        for attr in ("srcset", "data-srcset"):
            value = attrs.get(attr)
            if value:
                for candidate in parse_srcset(value):
                    self.asset_links.add(candidate)

    def _collect(self, tag, attr, value):
        value = value.strip()
        if not value or value.startswith(("mailto:", "tel:", "javascript:", "data:")):
            return
        absolute = urllib.parse.urljoin(BASE_URL, value)
        if tag == "a" and attr == "href":
            page = normalize_page_url(absolute)
            if page:
                self.page_links.add(page)
            return
        if tag == "script":
            return
        if tag not in ("img", "script", "source", "video", "audio"):
            return
        self.asset_links.add(absolute)


def parse_srcset(value):
    results = []
    for part in value.split(","):
        url = part.strip().split(" ")[0]
        if url and not url.startswith("data:"):
            results.append(url)
    return results


def discover_sitemaps(url, seen=None):
    seen = seen or set()
    if url in seen:
        return [], []
    seen.add(url)
    print(f"fetch sitemap: {url}", flush=True)
    try:
        data, _ = fetch_bytes(url)
    except Exception as exc:
        print(f"warn: sitemap fetch failed {url}: {exc}")
        return [], []
    root = ET.fromstring(data)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemaps = [loc.text.strip() for loc in root.findall(".//sm:sitemap/sm:loc", ns) if loc.text]
    urls = [loc.text.strip() for loc in root.findall(".//sm:url/sm:loc", ns) if loc.text]
    child_pages = []
    child_sitemaps = []
    for sitemap in sitemaps:
        pages, children = discover_sitemaps(sitemap, seen)
        child_pages.extend(pages)
        child_sitemaps.extend(children)
    return urls + child_pages, [url] + child_sitemaps


class Rewriter(HTMLParser):
    def __init__(self, route, asset_map, page_routes):
        super().__init__(convert_charrefs=False)
        self.route = route
        self.asset_map = asset_map
        self.page_routes = page_routes
        self.out = []
        self.in_head = False
        self.seen_canonical = False
        self.skip_script = False

    def handle_decl(self, decl):
        self.out.append(f"<!{decl}>")

    def handle_starttag(self, tag, attrs):
        attrs = list(attrs)
        if tag.lower() == "head":
            self.in_head = True
        if tag.lower() == "script":
            self.skip_script = True
            return
        if tag.lower() == "link" and should_drop_link(attrs):
            return
        attrs = self.rewrite_attrs(tag.lower(), attrs)
        if tag.lower() == "form":
            attrs = set_attr(attrs, "action", "")
            attrs = set_attr(attrs, "onsubmit", "return false;")
        if tag.lower() == "link" and attr_value(attrs, "rel") and "canonical" in attr_value(attrs, "rel").lower():
            attrs = set_attr(attrs, "href", canonical_for_route(self.route))
            self.seen_canonical = True
        self.out.append(start_tag(tag, attrs, False))

    def handle_startendtag(self, tag, attrs):
        if tag.lower() == "link" and should_drop_link(list(attrs)):
            return
        attrs = self.rewrite_attrs(tag.lower(), list(attrs))
        self.out.append(start_tag(tag, attrs, True))

    def handle_endtag(self, tag):
        if self.skip_script and tag.lower() == "script":
            self.skip_script = False
            return
        if tag.lower() == "head":
            if not self.seen_canonical:
                self.out.append(f'<link rel="canonical" href="{canonical_for_route(self.route)}">')
            self.out.append(f'<script src="{rel_from_page(self.route, "/assets/site.js")} ?v={ASSET_VERSION}" defer></script>'.replace(" ?v", "?v"))
            self.in_head = False
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.skip_script:
            self.out.append(clean_text(rewrite_css_urls(data, self.route, self.asset_map)))

    def handle_entityref(self, name):
        if not self.skip_script:
            self.out.append(f"&{name};")

    def handle_charref(self, name):
        if not self.skip_script:
            self.out.append(f"&#{name};")

    def handle_comment(self, data):
        cleaned = clean_text(data)
        if "astro" in cleaned.lower() or "wordpress" in cleaned.lower():
            return
        self.out.append(f"<!--{cleaned}-->")

    def rewrite_attrs(self, tag, attrs):
        rewritten = []
        for name, value in attrs:
            if value is None:
                rewritten.append((name, value))
                continue
            low = name.lower()
            if low in ("href", "src", "poster", "data-src"):
                value = rewrite_url(value, self.route, self.asset_map, self.page_routes, tag, low)
            elif low == "content" and value.startswith(("http://", "https://")):
                value = rewrite_meta_content(value, self.route, self.asset_map, self.page_routes)
            elif low in ("srcset", "data-srcset"):
                value = rewrite_srcset(value, self.route, self.asset_map)
            elif low == "style":
                value = rewrite_css_urls(value, self.route, self.asset_map)
            elif low.startswith("data-elementor"):
                name = name.replace("elementor", "astro").replace("Elementor", "Astro")
            rewritten.append((clean_text(name), clean_text(value)))
        return rewritten

    def html(self):
        return "".join(self.out)


def attr_value(attrs, name):
    for key, value in attrs:
        if key.lower() == name:
            return value or ""
    return ""


def set_attr(attrs, name, value):
    return [(k, v) for k, v in attrs if k.lower() != name.lower()] + [(name, value)]


def should_drop_link(attrs):
    rel = attr_value(attrs, "rel").lower()
    href = attr_value(attrs, "href")
    if "canonical" in rel:
        return False
    if any(token in rel for token in ("stylesheet", "icon", "preload")):
        return False
    if any(token in rel for token in ("profile", "dns-prefetch", "alternate", "https://api.w.org")):
        return True
    if href.startswith(("http://", "https://", "//")):
        return True
    return False


def start_tag(tag, attrs, self_closing):
    chunks = [f"<{tag}"]
    for name, value in attrs:
        if value is None:
            chunks.append(f" {name}")
        else:
            escaped = value.replace("&", "&amp;").replace('"', "&quot;")
            chunks.append(f' {name}="{escaped}"')
    chunks.append(" />" if self_closing else ">")
    return "".join(chunks)


def should_drop_script(src):
    src_lower = src.lower()
    parsed = urllib.parse.urlparse(urllib.parse.urljoin(BASE_URL, src))
    if parsed.scheme in ("http", "https"):
        return True
    return any(token in src_lower for token in (
        "elementor",
        "breeze",
        "gravityforms",
        "wp-includes",
        "wp-content/plugins",
        "wp-content/themes",
        "elfsight",
        "fontawesome",
        "googletagmanager",
        "google-analytics",
        "facebook",
        "recaptcha",
    ))


def asset_kind(url, content_type=""):
    path = urllib.parse.urlparse(url).path.lower()
    ext = posixpath.splitext(path)[1]
    if "text/css" in content_type or ext == ".css":
        return "styles"
    if "javascript" in content_type or ext == ".js":
        return "scripts"
    if ext in (".woff", ".woff2", ".ttf", ".otf", ".eot"):
        return "fonts"
    if ext in (".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".avif"):
        return "media"
    return "media"


def asset_filename(url, content_type=""):
    parsed = urllib.parse.urlparse(url)
    name = posixpath.basename(parsed.path) or "asset"
    stem, ext = posixpath.splitext(name)
    if not ext:
        ext = mimetypes.guess_extension(content_type.split(";")[0].strip()) or ".bin"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:10]
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-") or "asset"
    return f"{safe_stem}-{digest}{ext}"


def absolutize_asset(url, base_url):
    if not url or url.startswith(("data:", "mailto:", "tel:", "javascript:", "#")):
        return None
    if url.startswith("//"):
        url = "https:" + url
    return urllib.parse.urljoin(base_url, url)


def rewrite_url(value, route, asset_map, page_routes, tag, attr):
    if value.startswith(("mailto:", "tel:", "javascript:", "data:", "#")):
        return value
    absolute = absolutize_asset(value, BASE_URL)
    page = normalize_page_url(absolute or value)
    if tag == "a" and attr == "href" and page and route_from_url(page) in page_routes:
        target_route = route_from_url(page)
        target = "/index.html" if target_route == "" else "/" + target_route + "/"
        return rel_from_page(route, target)
    if absolute in asset_map:
        return rel_from_page(route, "/" + asset_map[absolute])
    return value


def rewrite_meta_content(value, route, asset_map, page_routes):
    absolute = absolutize_asset(value, BASE_URL)
    page = normalize_page_url(absolute or value)
    if page and route_from_url(page) in page_routes:
        return canonical_for_route(route_from_url(page))
    if absolute in asset_map:
        return rel_from_page(route, "/" + asset_map[absolute])
    if absolute and urllib.parse.urlparse(absolute).netloc == urllib.parse.urlparse(BASE_URL).netloc:
        return STAGING_BASE + urllib.parse.urlparse(absolute).path
    return value


def rewrite_srcset(value, route, asset_map):
    parts = []
    for item in value.split(","):
        stripped = item.strip()
        if not stripped:
            continue
        bits = stripped.split()
        absolute = absolutize_asset(bits[0], BASE_URL)
        if absolute in asset_map:
            bits[0] = rel_from_page(route, "/" + asset_map[absolute])
        parts.append(" ".join(bits))
    return ", ".join(parts)


CSS_URL_RE = re.compile(r"url\((['\"]?)(.*?)\1\)")


def rewrite_css_urls(css, route, asset_map, base_url=BASE_URL):
    def repl(match):
        raw = match.group(2).strip()
        if raw.startswith(("data:", "#")):
            return match.group(0)
        absolute = absolutize_asset(raw, base_url)
        if absolute in asset_map:
            return f"url('{rel_from_page(route, '/' + asset_map[absolute])}')"
        return match.group(0)
    return CSS_URL_RE.sub(repl, css)


def collect_css_assets(css, css_url):
    assets = set()
    for match in CSS_URL_RE.finditer(css):
        raw = match.group(2).strip()
        absolute = absolutize_asset(raw, css_url)
        if absolute:
            assets.add(absolute)
    return assets


def write_site_js(output_dir):
    js = """
(function () {
  document.addEventListener('submit', function (event) {
    if (event.target && event.target.tagName === 'FORM') event.preventDefault();
  });

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('[aria-controls], .astro-menu-toggle, .menu-toggle, button');
    if (!toggle) return;
    var id = toggle.getAttribute('aria-controls');
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    var expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    target.hidden = expanded;
    target.classList.toggle('is-open', !expanded);
  });

  document.querySelectorAll('a[href="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) { event.preventDefault(); });
  });
})();
""".strip()
    path = output_dir / "assets" / "site.js"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(js, encoding="utf-8")


def write_sitemap(output_dir, routes):
    urls = []
    for route in sorted(routes):
        urls.append(f"  <url><loc>{canonical_for_route(route)}</loc></url>")
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls)
    xml += "\n</urlset>\n"
    (output_dir / "sitemap.xml").write_text(xml, encoding="utf-8")
    index = '<?xml version="1.0" encoding="UTF-8"?>\n'
    index += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    index += f"  <sitemap><loc>{STAGING_BASE}/sitemap.xml</loc></sitemap>\n"
    index += "</sitemapindex>\n"
    (output_dir / "sitemap_index.xml").write_text(index, encoding="utf-8")


INLINE_STYLE_RE = re.compile(
    r"<style\b([^>]*\bid=[\"'](?:global-styles-inline-css|wp-img-auto-sizes-contain-inline-css|astro-frontend-inline-css|astro-custom-css|astro-img-auto-sizes-contain-inline-css)[\"'][^>]*)>(.*?)</style>",
    re.IGNORECASE | re.DOTALL,
)


def extract_target_inline_css(page):
    extracted = []

    def repl(match):
        extracted.append(clean_text(match.group(2)))
        return ""

    return INLINE_STYLE_RE.sub(repl, page), extracted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="local-copy")
    parser.add_argument("--max-extra-pages", type=int, default=300)
    args = parser.parse_args()
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    sitemap_urls, sitemap_files = discover_sitemaps(SITEMAP_URL)
    queue = []
    seen = set()
    for url in sitemap_urls:
        page = normalize_page_url(url)
        if page and page not in seen:
            queue.append(page)
            seen.add(page)
    html_by_url = {}
    discovered_assets = set()
    discovered_from_links = 0

    print(f"discovered {len(queue)} sitemap pages from {len(sitemap_files)} sitemap files", flush=True)
    index = 0
    while index < len(queue):
        url = queue[index]
        index += 1
        print(f"fetch page {index}/{len(queue)}: {url}", flush=True)
        try:
            data, content_type = fetch_bytes(url)
        except Exception as exc:
            print(f"warn: page fetch failed {url}: {exc}")
            continue
        if "text/html" not in content_type and content_type:
            continue
        html = data.decode("utf-8", errors="replace")
        html_by_url[url] = html
        parser_obj = LinkParser()
        parser_obj.feed(html)
        discovered_assets.update(absolutize_asset(asset, url) for asset in parser_obj.asset_links if absolutize_asset(asset, url))
        for link in parser_obj.page_links:
            if link not in seen and discovered_from_links < args.max_extra_pages:
                seen.add(link)
                queue.append(link)
                discovered_from_links += 1

    asset_map = {}
    css_queue = []
    raw_css_by_asset = {}
    for asset in sorted(discovered_assets):
        print(f"fetch asset {len(asset_map) + 1}/{len(discovered_assets)}: {asset}", flush=True)
        try:
            data, content_type = fetch_bytes(asset)
        except Exception as exc:
            print(f"warn: asset fetch failed {asset}: {exc}")
            continue
        kind = asset_kind(asset, content_type)
        filename = asset_filename(asset, content_type)
        rel_path = f"assets/{kind}/{filename}"
        target = output_dir / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        if kind in ("styles", "scripts"):
            text = data.decode("utf-8", errors="replace")
            target.write_text(clean_text(text), encoding="utf-8")
            if kind == "styles":
                raw_css_by_asset[asset] = text
                css_queue.append((asset, text))
        else:
            target.write_bytes(data)
        asset_map[asset] = rel_path

    failed_css_assets = set()
    for css_url, css in css_queue:
        for asset in collect_css_assets(css, css_url):
            if asset in asset_map or asset in failed_css_assets:
                continue
            print(f"fetch css asset {len(asset_map) + 1}: {asset}", flush=True)
            try:
                data, content_type = fetch_bytes(asset)
            except Exception as exc:
                print(f"warn: css asset fetch failed {asset}: {exc}")
                failed_css_assets.add(asset)
                continue
            kind = asset_kind(asset, content_type)
            filename = asset_filename(asset, content_type)
            rel_path = f"assets/{kind}/{filename}"
            target = output_dir / rel_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            asset_map[asset] = rel_path

    # Rewrite localized CSS now that nested assets are known.
    for asset, rel_path in list(asset_map.items()):
        if rel_path.startswith("assets/styles/"):
            css_path = output_dir / rel_path
            css = raw_css_by_asset.get(asset) or css_path.read_text(encoding="utf-8", errors="replace")
            css_path.write_text(clean_text(rewrite_css_urls(css, "", asset_map, asset)), encoding="utf-8")

    routes = {route_from_url(url) for url in html_by_url}
    extracted_inline_css = []
    for url, html in html_by_url.items():
        route = route_from_url(url)
        page_dir = page_dir_for_route(output_dir, route)
        page_dir.mkdir(parents=True, exist_ok=True)
        rewriter = Rewriter(route, asset_map, routes)
        rewriter.feed(html)
        page = rewriter.html()
        page, extracted = extract_target_inline_css(page)
        extracted_inline_css.extend(extracted)
        if extracted:
            css_href = rel_from_page(route, f"/assets/styles/extracted-inline-head.css?v={ASSET_VERSION}")
            page = page.replace("</head>", f'<link rel="stylesheet" href="{css_href}"></head>')
        page = page.replace(BASE_URL, STAGING_BASE + "/")
        (page_dir / "index.html").write_text(page, encoding="utf-8")

    write_site_js(output_dir)
    if extracted_inline_css:
        inline_css_path = output_dir / "assets" / "styles" / "extracted-inline-head.css"
        inline_css_path.parent.mkdir(parents=True, exist_ok=True)
        seen_css = []
        seen_keys = set()
        for css in extracted_inline_css:
            key = hashlib.sha1(css.encode("utf-8")).hexdigest()
            if key not in seen_keys:
                seen_keys.add(key)
                seen_css.append(css)
        inline_css_path.write_text("\n\n".join(seen_css), encoding="utf-8")
    write_sitemap(output_dir, routes)
    manifest = {
        "source": BASE_URL,
        "sitemap": SITEMAP_URL,
        "stagingBase": STAGING_BASE,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "assetVersion": ASSET_VERSION,
        "pages": [{"url": url, "route": route_from_url(url), "file": str(page_dir_for_route(output_dir, route_from_url(url)) / "index.html")} for url in sorted(html_by_url)],
        "assets": asset_map,
    }
    (output_dir / "export-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"wrote {len(html_by_url)} pages and {len(asset_map)} assets to {output_dir}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
