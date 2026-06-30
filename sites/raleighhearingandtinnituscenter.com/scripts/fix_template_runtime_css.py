from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CSS_FILE = ROOT / "local-copy" / "assets" / "styles" / "local-parity.css"
MARKER = "/* Global header, footer, hero, and trust badge runtime parity. */"

CSS_BLOCK = r"""
/* Global header, footer, hero, and trust badge runtime parity. */
.local-bg-slideshow {
  background-image: var(--local-bg-slide) !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
  transition: background-image 500ms ease-in-out;
}

.astro-element-41a1dbf.local-bg-slideshow,
.astro-element-41a1dbf.local-bg-slideshow:not(.astro-motion-effects-element-type-background),
.astro-element-41a1dbf.local-bg-slideshow > .astro-motion-effects-container > .astro-motion-effects-layer,
.astro-element-ad565ce.local-bg-slideshow,
.astro-element-ad565ce.local-bg-slideshow:not(.astro-motion-effects-element-type-background),
.astro-element-ad565ce.local-bg-slideshow > .astro-motion-effects-container > .astro-motion-effects-layer {
  background-image: var(--local-bg-slide) !important;
}

.astro-location-header {
  position: sticky !important;
  top: 0;
  z-index: 9999;
}

.astro-location-header .menu-item-has-children > a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.astro-location-header .sub-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
}

.astro-location-header .sub-arrow i {
  font-family: "Font Awesome 6 Free" !important;
  font-weight: 900 !important;
}

@media (min-width: 1025px) {
  .astro-location-header .astro-nav-menu--main .menu-item-has-children {
    position: relative;
  }

  .astro-location-header .astro-nav-menu--main .menu-item-has-children > .sub-menu {
    display: none !important;
    position: absolute;
    top: 100%;
    left: 0;
    width: max-content;
    min-width: 280px;
    max-width: min(420px, 90vw);
    z-index: 10000;
    background: #fff;
    box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
  }

  .astro-location-header .astro-nav-menu--main .sub-menu a {
    white-space: nowrap;
    width: 100%;
  }

  .astro-location-header .astro-nav-menu--main .menu-item-has-children:hover > .sub-menu,
  .astro-location-header .astro-nav-menu--main .menu-item-has-children:focus-within > .sub-menu {
    display: block !important;
  }

  .astro-location-header .astro-nav-menu--main .sub-menu .menu-item-has-children > .sub-menu {
    top: 0 !important;
    left: 100% !important;
    margin-top: 0 !important;
  }
}

@media (min-width: 1025px) and (max-width: 1500px) {
  .astro-location-header .astro-element-3db3b05 {
    --gap: 0px 0px;
    --column-gap: 0px;
  }

  .astro-location-header .astro-element-8aac53d {
    --container-widget-width: 24% !important;
    max-width: 24% !important;
    width: var(--container-widget-width, 24%) !important;
  }

  .astro-location-header .astro-element-8aac53d img {
    max-width: 300px !important;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--main .astro-item {
    font-size: 15px !important;
    padding-left: 9px !important;
    padding-right: 9px !important;
  }

  .astro-location-header .astro-element-84f7d0e .astro-button {
    font-size: 14px !important;
    padding: 14px 22px !important;
  }

  .astro-location-header .astro-element-18a9c5c {
    flex: 1 1 auto;
  }
}

@media (max-width: 1024px) {
  .astro-location-header .astro-element-79cb618 .astro-menu-toggle {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    color: #1C1E21 !important;
    fill: #1C1E21 !important;
  }

  .astro-location-header .astro-element-79cb618 .astro-menu-toggle:hover,
  .astro-location-header .astro-element-79cb618 .astro-menu-toggle:focus,
  .astro-location-header .astro-element-79cb618 .astro-menu-toggle[aria-expanded="true"] {
    color: #1C1E21 !important;
    fill: #1C1E21 !important;
  }

  .astro-location-header .astro-element-79cb618 .astro-menu-toggle i,
  .astro-location-header .astro-element-79cb618 .astro-menu-toggle svg,
  .astro-location-header .astro-element-79cb618 .astro-menu-toggle[aria-expanded="true"] i,
  .astro-location-header .astro-element-79cb618 .astro-menu-toggle[aria-expanded="true"] svg {
    color: #1C1E21 !important;
    fill: #1C1E21 !important;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--main {
    display: none !important;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown.astro-nav-menu__container {
    display: none !important;
    position: fixed !important;
    top: var(--local-menu-top, 0px) !important;
    left: 0 !important;
    right: 0 !important;
    width: 100vw !important;
    margin: 0 !important;
    height: auto !important;
    min-height: 200px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
    background: #fff;
    box-shadow: 0 8px 18px rgb(0 0 0 / 16%);
    z-index: 10000;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown.astro-nav-menu__container.is-open {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    height: auto !important;
    transform: none !important;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown > .astro-nav-menu {
    display: block !important;
    width: 100%;
    padding: 0;
    margin: 0;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown li {
    display: block;
    width: 100%;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown a {
    display: flex !important;
    justify-content: center;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 40px;
    padding: 10px 20px !important;
    text-align: center;
    white-space: normal;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown .current-menu-item > a,
  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown .current_page_item > a {
    background: #062C5D;
    color: #fff !important;
    fill: #fff !important;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown .sub-menu {
    display: none !important;
    position: static !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    background: #f7f8fb;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown .is-submenu-open > .sub-menu {
    display: block !important;
  }

  .astro-location-header .astro-element-79cb618 .astro-nav-menu--dropdown .sub-menu a {
    font-size: 14px;
    min-height: 36px;
  }
}

@media (max-width: 767px) {
  .astro-element-ad565ce {
    min-height: 300px;
    background-image: var(--local-bg-slide) !important;
    background-position: center center !important;
    background-repeat: no-repeat !important;
    background-size: cover !important;
  }

  .astro-element-6d0664e .astro-element-597af1c,
  .astro-element-6d0664e .local-hero-copy-target {
    align-items: center;
    text-align: center;
  }

  .astro-element-6d0664e .astro-element-f8f905b .astro-heading-title {
    font-family: "Merriweather", Sans-serif;
    font-size: 31px;
    font-weight: 700;
    line-height: 1.25em;
  }

  .astro-element-6d0664e .astro-element-f0f9ffe .astro-heading-title {
    font-family: "Lato", Sans-serif;
    font-size: 17px;
    line-height: 1.4em;
  }
}

.astro-element-12030d7 {
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: pan-y;
}

.astro-element-12030d7:active {
  cursor: grabbing;
}

.astro-element-12030d7 .e-n-carousel.swiper {
  overflow: hidden;
  width: 100%;
}

.astro-element-12030d7 .swiper-wrapper {
  display: flex !important;
  align-items: center;
  overflow: visible !important;
  transition: transform 500ms ease;
  will-change: transform;
}

.astro-element-12030d7 .swiper-slide {
  display: flex !important;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  box-sizing: border-box;
}

.astro-element-12030d7 .swiper-slide img {
  display: block;
  width: 100%;
  max-width: 190px;
  max-height: 86px;
  object-fit: contain;
  margin: 0 auto;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

@media (max-width: 1024px) {
  .astro-location-footer .local-book-appointment-button .astro-button {
    font-size: 14px !important;
  }
}

.local-schedule-appointment-button .astro-button {
  font-family: "Lato", Sans-serif !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  border-radius: 10px 10px 10px 10px !important;
  padding: 15px 30px 15px 30px !important;
}

.local-schedule-appointment-button .astro-button-content-wrapper {
  flex-direction: row-reverse !important;
}

.local-schedule-appointment-button .astro-button .astro-button-content-wrapper {
  gap: 12px !important;
}

.local-schedule-appointment-button .astro-button-icon i {
  color: inherit !important;
  display: inline-block;
  font-family: "Font Awesome 6 Free" !important;
  font-weight: 900 !important;
}

.astro-element-396bb61,
.astro-element-5029d79 {
  cursor: grab;
  user-select: none;
  touch-action: pan-y;
}

.astro-element-396bb61:active,
.astro-element-5029d79:active {
  cursor: grabbing;
}

.astro-element-396bb61 .swiper,
.astro-element-396bb61 .astro-loop-container,
.astro-element-5029d79 .e-n-carousel.swiper {
  overflow: hidden !important;
  width: 100%;
}

.astro-element-396bb61 .swiper-wrapper,
.astro-element-5029d79 .swiper-wrapper {
  align-items: stretch !important;
  overflow: visible !important;
  will-change: transform;
}

.astro-element-396bb61 .swiper-slide,
.astro-element-5029d79 .swiper-slide {
  height: auto !important;
  box-sizing: border-box;
}

.astro-element-396bb61 .swiper-slide > .e-con,
.astro-element-396bb61 .swiper-slide .astro-5106,
.astro-element-5029d79 .swiper-slide > .e-con,
.astro-element-5029d79 .swiper-slide > .astro-element {
  height: 100%;
}

.astro-element-396bb61 img,
.astro-element-5029d79 img {
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.astro-element-396bb61 .astro-swiper-button,
.astro-element-5029d79 .astro-swiper-button {
  cursor: pointer;
  z-index: 5;
}

.astro-element-5029d79 .swiper-slide > .e-con,
.astro-element-5029d79 .swiper-slide > .astro-element,
.astro-element-5029d79 .swiper-slide .e-con-inner {
  min-height: 100%;
}

@media (min-width: 1025px) {
  .astro-element-5551286 {
    padding-left: 20px !important;
    padding-right: 20px !important;
  }

  .astro-element-5dfba69,
  .astro-element-4dc47bf,
  .astro-element-fb78590 {
    align-self: flex-start !important;
    text-align: left !important;
  }

  .astro-element-5dfba69 .astro-button-wrapper,
  .astro-element-4dc47bf .astro-button-wrapper,
  .astro-element-fb78590 .astro-button-wrapper {
    text-align: left !important;
  }
}

@media (max-width: 1024px) {
  .astro-element-5dfba69,
  .astro-element-4dc47bf {
    align-self: center !important;
    text-align: center !important;
  }

  .astro-element-5dfba69 .astro-button-wrapper,
  .astro-element-4dc47bf .astro-button-wrapper {
    text-align: center !important;
  }
}

@media (max-width: 767px) {
  .astro-element-cd08481 {
    --min-height: 0px !important;
    height: auto !important;
    min-height: 0 !important;
    align-content: flex-start !important;
    justify-content: flex-start !important;
    margin-bottom: 0 !important;
    padding-bottom: 10px !important;
  }

  .astro-element-cd08481 .astro-element-49df275 {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  .astro-element-98d1800 {
    margin-top: -50px !important;
  }
}

.astro-element-c090845 .astro-element-2f11e38 {
  position: relative;
  z-index: 1;
}

.astro-element-c090845 {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.astro-43 .astro-element.astro-element-c090845::before,
.astro-element-c090845::before {
  content: "";
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-color: transparent !important;
  background-image: radial-gradient(rgb(255, 255, 255) 0%, rgb(207, 216, 230) 100%) !important;
  opacity: 0.5;
  z-index: 0 !important;
}

.astro-43 .astro-element.astro-element-c090845::after,
.astro-element-c090845::after {
  content: "";
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-image: url("../media/Location-Info-scaled-67e6178fd2.png") !important;
  background-position: right bottom;
  background-repeat: no-repeat;
  background-size: auto 100%;
  opacity: 0.32;
  transform: scaleX(-1);
  z-index: 0 !important;
}

.astro-element-c090845 > .e-con-inner {
  position: relative;
  z-index: 1 !important;
}

.astro-element-c090845 .astro-element-75485e1,
.astro-element-c090845 .astro-element-2f11e38,
.astro-element-c090845 .astro-element-2f11e38 .astro-widget-container {
  position: relative;
  z-index: 3 !important;
}

.astro-element-c090845 .astro-element-2f11e38 img {
  position: relative;
  z-index: 3 !important;
  display: block !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.local-smooth-accordion-item > .local-accordion-panel {
  overflow: hidden !important;
  transition: max-height 400ms ease;
}

.local-smooth-accordion-item:not([open]) > .local-accordion-panel {
  max-height: 0 !important;
}

.astro-element-a067c93:not(.astro-motion-effects-element-type-background),
.astro-element-a067c93 > .astro-motion-effects-container > .astro-motion-effects-layer {
  background-repeat: no-repeat !important;
  background-size: cover !important;
}

.local-location-section[data-local-template-source="ef200c0"] {
  --local-location-source: "astro-element-ef200c0";
}

body:not(.home) .astro-widget-table-of-contents.local-toc-ready .astro-toc__header {
  cursor: pointer;
}

body:not(.home) .astro-widget-table-of-contents.local-toc-ready .astro-toc__body {
  overflow: hidden;
  transition: max-height 360ms ease, opacity 260ms ease;
}

body:not(.home) .astro-widget-table-of-contents.local-toc-collapsed .astro-toc__body {
  max-height: 0 !important;
  opacity: 0;
  padding-bottom: 0 !important;
  padding-top: 0 !important;
}

body:not(.home) .astro-widget-table-of-contents.local-toc-open .astro-toc__body {
  max-height: 1400px;
  opacity: 1;
  padding-bottom: var(--box-padding, 20px) !important;
  padding-top: var(--box-padding, 20px) !important;
}

body:not(.home) .astro-widget-table-of-contents.local-toc-collapsed .astro-toc__toggle-button--collapse,
body:not(.home) .astro-widget-table-of-contents.local-toc-open .astro-toc__toggle-button--expand {
  display: none !important;
}

body:not(.home) .astro-widget-table-of-contents.local-toc-collapsed .astro-toc__toggle-button--expand,
body:not(.home) .astro-widget-table-of-contents.local-toc-open .astro-toc__toggle-button--collapse {
  display: flex !important;
}

body:not(.home) .local-toc-list {
  margin: 0;
  padding-left: 1.35em;
  line-height: 1.55;
}

body:not(.home) .local-toc-list a {
  color: inherit;
}

body:not(.home) .local-toc-list li {
  margin-bottom: 0.28em;
  padding-left: 0.18em;
}

body:not(.home) .local-toc-list li:last-child {
  margin-bottom: 0;
}

body:not(.home) .local-toc-item-h3 {
  margin-left: 1em;
}

body:not(.home) .local-toc-item-h4,
body:not(.home) .local-toc-item-h5,
body:not(.home) .local-toc-item-h6 {
  margin-left: 2em;
}

.astro-element-c7179b0 .e-n-accordion-item-title-icon i {
  font-family: "Font Awesome 6 Free" !important;
  font-weight: 900 !important;
}

.astro-element-c7179b0 .e-n-accordion-item-title-icon i::before {
  font-family: "Font Awesome 6 Free" !important;
  font-weight: 900 !important;
}

.astro-element-c7179b0 details[open] .e-opened i::before {
  content: "\f106" !important;
}

.astro-element-c7179b0 details:not([open]) .e-closed i::before {
  content: "\f107" !important;
}

.astro-element-c7179b0 details[open] .e-opened,
.astro-element-c7179b0 details:not([open]) .e-closed {
  display: inline-flex !important;
}

.astro-element-c7179b0 details[open] .e-closed,
.astro-element-c7179b0 details:not([open]) .e-opened {
  display: none !important;
}

@media (max-width: 1024px) {
  .astro-element-1ba7f24,
  .astro-element-1ba7f24 .astro-widget-container {
    text-align: center !important;
  }
}
"""


def main() -> None:
    css = CSS_FILE.read_text(encoding="utf-8")
    if MARKER in css:
        css = css[: css.index(MARKER)].rstrip()
    CSS_FILE.write_text(css.rstrip() + "\n\n" + CSS_BLOCK.lstrip(), encoding="utf-8")


if __name__ == "__main__":
    main()
