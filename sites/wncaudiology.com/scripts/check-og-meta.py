"""
Fetch OG images and canonical URLs from live WP pages for SEO verification.
"""
import re, urllib.request

SLUGS = [
    "ear-candling-risks-and-alternatives",
    "hearing-aids-for-tinnitus-finding-relief-in-asheville",
    "how-long-does-it-take-to-get-used-to-hearing-aids",
    "hyperacusis-when-sounds-feel-too-loud",
    "over-the-counter-hearing-aids-what-you-need-to-know",
    "swimmers-ear-causes-symptoms-treatment-and-prevention-tips",
    "understanding-pressure-in-the-ear-causes-symptoms-and-relief-options",
    "hearing-test-online-what-you-need-to-know",
]
BRAND_SLUGS = ["phonak", "oticon", "resound", "unitron", "widex", "starkey", "signia"]

URLS = [(s, f"https://wncaudiology.com/{s}/") for s in SLUGS] + \
       [(f"hearing-aids/{s}", f"https://wncaudiology.com/hearing-aids/{s}/") for s in BRAND_SLUGS]


def get_prop_meta(html, prop):
    for pat in [
        rf'property="{re.escape(prop)}"[^>]+content="([^"]*)"',
        rf'content="([^"]*)"[^>]+property="{re.escape(prop)}"',
        rf"property='{re.escape(prop)}'[^>]+content='([^']*)'",
        rf"content='([^']*)'[^>]+property='{re.escape(prop)}'",
    ]:
        m = re.search(pat, html)
        if m:
            return m.group(1)
    return ""


def get_canonical(html):
    m = re.search(r'rel="canonical"[^>]+href="([^"]*)"', html)
    if not m:
        m = re.search(r"href=\"([^\"]+)\"[^>]+rel=\"canonical\"", html)
    return m.group(1) if m else ""


def get_jld_types(html):
    types = []
    for jld in re.findall(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL):
        types += re.findall(r'"@type"\s*:\s*"([^"]+)"', jld)
    return types


for slug, url in URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", errors="replace")
        og_img = get_prop_meta(html, "og:image")
        og_title = get_prop_meta(html, "og:title")
        canonical = get_canonical(html)
        jld_types = get_jld_types(html)
        print(f"\n=== {slug} ===")
        print(f"  canonical : {canonical}")
        print(f"  og:title  : {og_title}")
        print(f"  og:image  : {og_img[:120] if og_img else 'NONE'}")
        print(f"  JSON-LD   : {jld_types}")
    except Exception as e:
        print(f"\n=== {slug} ERROR: {e} ===")
