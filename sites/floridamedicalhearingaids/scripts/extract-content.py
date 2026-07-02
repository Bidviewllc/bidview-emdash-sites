"""
Extract content from the static HTML mirror into:
  - seed/seed.json  (emdash collections + entries: pages/posts/team_members/locations/hearing_aid_brands/site_settings)
  - src/_shell.json  (header HTML, footer HTML, body-end scripts, common head bits) for Base.astro

Each page entry stores: title, slug, meta_title, meta_description, og_image,
head_extra (the page's <link rel=stylesheet> set, root-relative) and body (the
content wrappers between header astro-1047 and footer astro-168).
"""
import os, re, json, glob
from bs4 import BeautifulSoup

MIRROR = r"c:/Clients/Bidview Marketing/emdash/floridamedicalhearingaids.com/local-site"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

POSTS = {
    "swimmers-ear", "hearing-aids-for-tinnitus",
    "understanding-hyperacusis-symptoms-management-treatment",
    "rechargeable-hearing-aids-costs-features-benefits",
    "what-you-need-to-know-about-over-the-counter-hearing-aids",
    "hearing-test-online-what-you-need-to-know",
    "understanding-pressure-in-your-ear",
    "ear-candling-risks-why-ear-candles-are-not-a-safe-way-to-remove-wax",
}
TEAM = {"hearing-instrument-specialist/debra-adair", "patient-care-coordinator/susan-simpkins"}
LOCATIONS = {"audiologist-hearing-aids-sebring-fl", "audiologist-hearing-aids-lake-placid-fl"}


def rootrel(href):
    """Rewrite ../assets or assets/ -> /assets ; leave absolute/root alone."""
    if not href:
        return href
    if href.startswith(("http://", "https://", "//", "/")):
        return href
    href = re.sub(r"^(\.\./)+", "/", href)        # ../../assets -> /assets
    if href.startswith("assets/"):
        href = "/" + href
    return href


def slug_of(path):
    return path.replace("\\", "/")


def meta(soup, name=None, prop=None):
    if name:
        t = soup.find("meta", attrs={"name": name})
    else:
        t = soup.find("meta", attrs={"property": prop})
    return (t.get("content") or "").strip() if t else ""


def extract(path):
    f = os.path.join(MIRROR, path, "index.html") if path else os.path.join(MIRROR, "index.html")
    soup = BeautifulSoup(open(f, encoding="utf-8").read(), "html.parser")
    title = (soup.title.string or "").strip() if soup.title else ""
    md = meta(soup, name="description") or meta(soup, prop="og:description")
    og = meta(soup, prop="og:image")
    h1 = soup.find("h1")
    hero = h1.get_text(strip=True) if h1 else ""
    # head stylesheet links -> root-relative
    head_links = []
    for l in soup.head.find_all("link", rel=lambda v: v and "stylesheet" in v) if soup.head else []:
        href = rootrel(l.get("href"))
        if href:
            head_links.append(f'<link rel="stylesheet" href="{href}"/>')
    head_extra = "".join(dict.fromkeys(head_links))  # dedupe, keep order
    # content = body children that are not header/footer/script/style/link/noscript/skip-link
    parts = []
    for c in soup.body.find_all(recursive=False):
        if c.name in (None, "script", "style", "link", "noscript"):
            continue
        if c.name == "a" and "skip-link" in (c.get("class") or []):
            continue
        if c.get("data-astro-type") in ("header", "footer"):
            continue
        # Drop nested scripts that reference WordPress-runtime globals not present in the
        # static build (gform -> "gform is not defined"; wp.i18n -> "wp is not defined").
        for sc in c.find_all("script"):
            txt = sc.get_text() or ""
            if "gform" in txt or "wp.i18n" in txt:
                sc.decompose()
        # Make Elfsight review widgets eager (drop lazy attr) so they render without scroll.
        for el in c.select("[data-elfsight-app-lazy]"):
            del el["data-elfsight-app-lazy"]
        parts.append(str(c))
    body = "\n".join(parts)
    body_class = " ".join(soup.body.get("class", []))
    # Capture the Rank Math structured data (JSON-LD) from the <head> so schema
    # (Organization/LocalBusiness/WebPage/Person/BreadcrumbList/FAQPage) is preserved.
    json_ld = ""
    if soup.head:
        blocks = soup.head.find_all("script", attrs={"type": "application/ld+json"})
        json_ld = "\n".join(str(b) for b in blocks)
    return {"title": title, "meta_title": title, "meta_description": md, "og_image": og,
            "hero_heading": hero, "head_extra": head_extra, "json_ld": json_ld,
            "body_class": body_class, "body": body}


def main():
    # all page dirs
    paths = []
    for f in glob.glob(os.path.join(MIRROR, "**", "index.html"), recursive=True):
        rel = os.path.relpath(os.path.dirname(f), MIRROR).replace("\\", "/")
        paths.append("" if rel == "." else rel)
    # ear-candling short slug is a redirect stub -> skip (handled by route redirect)
    paths = [p for p in paths if p != "ear-candling"]

    collections = [
        {"name": "site_settings", "slug": "site_settings", "label": "Site Settings",
         "fields": [{"name": k, "slug": k, "type": "text", "label": k.title()} for k in ["phone", "email", "address", "hours"]]},
    ]
    content_fields = [
        {"name": "title", "slug": "title", "type": "string", "label": "Title"},
        {"name": "meta_title", "slug": "meta_title", "type": "string", "label": "Meta Title"},
        {"name": "meta_description", "slug": "meta_description", "type": "text", "label": "Meta Description"},
        {"name": "hero_heading", "slug": "hero_heading", "type": "string", "label": "Hero Heading"},
        {"name": "og_image", "slug": "og_image", "type": "string", "label": "OG Image"},
        {"name": "head_extra", "slug": "head_extra", "type": "text", "label": "Page CSS links"},
        {"name": "json_ld", "slug": "json_ld", "type": "text", "label": "Structured Data (JSON-LD)"},
        {"name": "body_class", "slug": "body_class", "type": "string", "label": "Body Class"},
        {"name": "body", "slug": "body", "type": "text", "label": "Body HTML"},
    ]
    for name, label in [("pages", "Pages"), ("posts", "Posts"), ("team_members", "Team Members"),
                        ("locations", "Locations"), ("hearing_aid_brands", "Hearing Aid Brands")]:
        collections.append({"name": name, "slug": name, "label": label, "fields": list(content_fields)})

    entries = []
    counts = {}
    for p in paths:
        data = extract(p)
        slug = "home" if p == "" else slug_of(p)
        if p == "":
            coll = "pages"
        elif p in POSTS:
            coll = "posts"
        elif p in TEAM:
            coll = "team_members"
        elif p in LOCATIONS:
            coll = "locations"
        elif p.startswith("hearing-aid/"):
            coll = "hearing_aid_brands"
        else:
            coll = "pages"
        counts[coll] = counts.get(coll, 0) + 1
        entries.append({"collection": coll, "slug": slug, "status": "published", "data": data})

    seed = {
        "$schema": "https://emdash.dev/schema/seed.json",
        "version": 1,
        "meta": {"label": "Florida Medical Hearing"},
        "collections": collections,
        "taxonomies": [],
        "menus": [],
        "entries": entries,
    }
    os.makedirs(os.path.join(HERE, "seed"), exist_ok=True)
    json.dump(seed, open(os.path.join(HERE, "seed", "seed.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("seed.json written:", sum(counts.values()), "entries", counts)

    # shell for Base.astro: header + footer + body-end scripts from home
    home = BeautifulSoup(open(os.path.join(MIRROR, "index.html"), encoding="utf-8").read(), "html.parser")
    header = home.body.find("header", attrs={"data-astro-type": "header"})
    footer = home.body.find("footer", attrs={"data-astro-type": "footer"})
    # the two <link> tags just before the header (nav-menu css + site-overrides)
    pre = []
    for sib in header.find_previous_siblings():
        if sib.name == "link":
            pre.append(f'<link rel="stylesheet" href="{rootrel(sib.get("href"))}"/>')
    pre = "".join(reversed(pre))
    # body-end scripts (after footer): keep src + inline
    scripts = []
    seen_footer = False
    for c in home.body.find_all(recursive=False):
        if c is footer:
            seen_footer = True
            continue
        if seen_footer and c.name in ("script", "link", "style"):
            s = str(c)
            s = re.sub(r'href="((?:\.\./)+|assets/)[^"]*"', lambda m: 'href="' + rootrel(m.group(0)[6:-1]) + '"', s)
            s = re.sub(r'src="((?:\.\./)+|assets/)[^"]*"', lambda m: 'src="' + rootrel(m.group(0)[5:-1]) + '"', s)
            scripts.append(s)
    # The shell is captured from the HOME page (root depth), so its relative
    # href/src (about/, assets/x, ../assets/x) break on nested pages. Rewrite every
    # relative URL to root-relative so header/nav/footer work at any depth.
    def rr(v):
        if not v or v.startswith(("http://", "https://", "//", "/", "#", "mailto:", "tel:", "data:", "javascript:")):
            return v
        v = re.sub(r"^(\./)+", "", v)
        v = re.sub(r"^(\.\./)+", "", v)
        return "/" + v

    def rewrite_shell(h):
        h = re.sub(r'\b(href|src)="([^"]*)"', lambda m: f'{m.group(1)}="{rr(m.group(2))}"', h)
        def rs(m):
            out = []
            for it in m.group(1).split(","):
                seg = it.strip().split(" ")
                if seg and seg[0]:
                    seg[0] = rr(seg[0])
                out.append(" ".join(seg))
            return 'srcset="' + ", ".join(out) + '"'
        h = re.sub(r'srcset="([^"]*)"', rs, h)
        return h.replace('href="/index.html"', 'href="/"')

    shell = {
        "header": rewrite_shell(pre + str(header)),
        "footer": rewrite_shell(str(footer)),
        "scripts": rewrite_shell("\n".join(scripts)),
    }
    json.dump(shell, open(os.path.join(HERE, "src", "_shell.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print("shell written: header", len(shell["header"]), "footer", len(shell["footer"]), "scripts", len(shell["scripts"]))


if __name__ == "__main__":
    main()
