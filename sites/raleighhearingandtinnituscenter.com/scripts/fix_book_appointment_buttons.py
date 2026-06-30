from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOCAL_COPY = ROOT / "local-copy"
PARITY_CSS = LOCAL_COPY / "assets" / "styles" / "local-parity.css"

DIV_TOKEN_RE = re.compile(r"<div\b[^>]*>|</div>", re.IGNORECASE)
OUTER_CLASS_RE = re.compile(r'(<div class=")([^"]*\bastro-widget-button\b[^"]*)(")', re.IGNORECASE)
HREF_RE = re.compile(r'(<a class="astro-button astro-button-link astro-size-sm" href=")([^"]*)(")', re.IGNORECASE)
ICON_RE = re.compile(r'(<i aria-hidden="true" class=")([^"]*)("></i>)', re.IGNORECASE)


def relative_contact_href(html_file: Path) -> str:
    depth = len(html_file.parent.relative_to(LOCAL_COPY).parts)
    return "../" * depth + "contact-us/"


def normalize_buttons() -> int:
    total = 0
    for html_file in LOCAL_COPY.rglob("index.html"):
        href = relative_contact_href(html_file)
        html = html_file.read_text(encoding="utf-8")
        updated = html
        offset = 0
        while True:
            marker = updated.find('<span class="astro-button-text">Book An Appointment</span>', offset)
            if marker == -1:
                break
            start = updated.rfind('<div class="astro-element', 0, marker)
            while start != -1:
                start_tag = updated[start : updated.find(">", start) + 1]
                if "astro-widget-button" in start_tag:
                    break
                start = updated.rfind('<div class="astro-element', 0, start)
            if start == -1:
                offset = marker + 1
                continue

            depth = 0
            end = -1
            for token in DIV_TOKEN_RE.finditer(updated, start):
                if token.group(0).lower().startswith("<div"):
                    depth += 1
                else:
                    depth -= 1
                    if depth == 0:
                        end = token.end()
                        break
            if end == -1:
                offset = marker + 1
                continue

            segment = updated[start:end]

            def add_class(match: re.Match[str]) -> str:
                classes = match.group(2)
                if "local-book-appointment-button" not in classes:
                    classes = f"{classes} local-book-appointment-button"
                return f"{match.group(1)}{classes}{match.group(3)}"

            segment = OUTER_CLASS_RE.sub(add_class, segment, count=1)
            segment = HREF_RE.sub(rf"\1{href}\3", segment, count=1)
            segment = ICON_RE.sub(r"\1fas fa-long-arrow-right\3", segment, count=1)
            updated = updated[:start] + segment + updated[end:]
            total += 1
            offset = start + len(segment)
        if updated != html:
            html_file.write_text(updated, encoding="utf-8")
    return total


def ensure_parity_css() -> None:
    marker = "/* Book appointment button source: homepage astro-element-7de5828. */"
    css = PARITY_CSS.read_text(encoding="utf-8") if PARITY_CSS.exists() else ""
    block = """
/* Book appointment button source: homepage astro-element-7de5828. */
.local-book-appointment-button .astro-button {
  font-family: "Lato", Sans-serif !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  transition-duration: 0.8s !important;
  border-radius: 10px 10px 10px 10px !important;
  padding: 15px 30px 15px 30px !important;
}

.local-book-appointment-button.astro-element {
  --align-self: center;
}

.local-book-appointment-button .astro-button-content-wrapper {
  flex-direction: row-reverse !important;
}

.local-book-appointment-button .astro-button .astro-button-content-wrapper {
  gap: 12px !important;
}

.local-book-appointment-button .astro-button-icon i {
  color: inherit !important;
  display: inline-block;
  font-family: "Font Awesome 6 Free" !important;
  font-weight: 900 !important;
}

@media (max-width: 767px) {
  .local-book-appointment-button.astro-mobile-align-justify .astro-button {
    width: 100%;
  }

  .local-book-appointment-button .astro-button .astro-button-content-wrapper {
    justify-content: center;
  }
}
"""
    if marker in css:
        css = css[: css.index(marker)].rstrip() + "\n" + block.lstrip()
    else:
        css = css.rstrip() + "\n\n" + block.lstrip()
    PARITY_CSS.write_text(css, encoding="utf-8")


def main() -> None:
    count = normalize_buttons()
    ensure_parity_css()
    print(f"Normalized {count} Book An Appointment buttons")


if __name__ == "__main__":
    main()
