# Board index

Every board in the design canvas, grouped by canvas page. Open `source/<file>` for the markup of each one. Boards marked *import* are thin wrappers that render another board with different settings (shown as the props list).

## Components

| File | What it shows | Notes |
|---|---|---|
| `Main.dc.html` | 00 Foundations: color, type, spacing, buttons |  |
| `Header.dc.html` | 01–02 Header (desktop + mobile) | 390px phone columns |
| `Hero.dc.html` | 05 Page hero (interior) |  |
| `TrustBar.dc.html` | 12 Home hero + trust bar |  |
| `Cards.dc.html` | 06 + 11 Cards and logo row |  |
| `FAQ.dc.html` | 07 Accordion / FAQ |  |
| `Reviews.dc.html` | 08 Reviews |  |
| `Providers.dc.html` | 09 Provider cards |  |
| `Blog.dc.html` | 16–17 Blog cards + featured post |  |
| `Timeline.dc.html` | 18 Timeline |  |
| `CTA.dc.html` | 04 CTA band |  |
| `Forms.dc.html` | 10 + 14 Location block and forms |  |
| `Footer.dc.html` | 03 Footer |  |
| `Palettes.dc.html` | Palette swap test |  |

## Headers & footers

| File | What it shows | Notes |
|---|---|---|
| `HeaderOptions.dc.html` | Header options · wide logos (H1–H3) |  |
| `HeaderOptionsStacked.dc.html` | Header options · square and vertical logos (V1–V7) |  |
| `HeaderOptionsMobile.dc.html` | Header options · mobile, menu closed | 390px phone columns |
| `HeaderOptionsMenu.dc.html` | Header options · mobile, menu open | 390px phone columns |
| `SiteHeader.dc.html` | Header component · pick a style in Tweaks (used by Home) |  |
| `FooterOptions.dc.html` | Footer options · landscape logo (F1–F7) |  |
| `FooterOptionsVertical.dc.html` | Footer options · vertical logo (F1–F7) |  |
| `FooterOptionsMobile.dc.html` | Footer options · mobile, landscape logo | 390px phone columns |
| `FooterOptionsMobileVertical.dc.html` | Footer options · mobile, vertical logo | 390px phone columns |
| `SiteFooter.dc.html` | Footer component · pick a style in Tweaks (used by Home) |  |

## Home

| File | What it shows | Notes |
|---|---|---|
| `Home1.dc.html` | Home · desktop 1/2 (hero → services) |  |
| `Home2.dc.html` | Home · desktop 2/2 (brands → footer) |  |
| `HomeMobile.dc.html` | Home · mobile (reads left to right) | 390px phone columns |
| `HomeStates.dc.html` | Home · alternate states |  |
| `HomeFull.dc.html` | Home · full page (open full-window to scroll it all; header and footer styles in Review controls) |  |
| `ContactPage.dc.html` | Contact · desktop (full page) |  |
| `ContactMobile.dc.html` | Contact · mobile (reads left to right) | 390px phone columns |
| `ContactPageAlt.dc.html` | Contact · alternate states: photo hero, one office, CTA without photo | *import* of `ContactPage` hero="Photo" offices="One" cta-photo="{{false}}" |

## Services

| File | What it shows | Notes |
|---|---|---|
| `ServicesHub.dc.html` | Services hub · desktop (full page; hub layout) |  |
| `ServicesMobile.dc.html` | Services hub · mobile (reads left to right) | 390px phone columns |
| `ServiceDetail.dc.html` | Service detail · desktop (full page; used for every service) |  |
| `ServiceDetailMobile.dc.html` | Service detail · mobile (reads left to right) | 390px phone columns |
| `ServiceDetailPosts.dc.html` | Service detail · extra mock-up: recent posts ON + review carousel | *import* of `ServiceDetail` hero="Example photo" reviews="Carousel" reviews-link="{{true}}" show-posts="{{true}}" sticky="{{true}}" cta-photo="{{true}}" |
| `ServicesHubAlt.dc.html` | Services hub · alternate states: no-photo hero (Primary), steps hidden, “Read more reviews” hidden, CTA without photo | *import* of `ServicesHub` hero="No photo · Primary" show-steps="{{false}}" reviews-link="{{false}}" cta-photo="{{false}}" |
| `ServiceDetailAlt.dc.html` | Service detail · alternate states: no-photo hero (Light), reviews link hidden, CTA without photo | *import* of `ServiceDetail` hero="No photo · Light" reviews-link="{{false}}" cta-photo="{{false}}" |

## Hearing aids

| File | What it shows | Notes |
|---|---|---|
| `HearingAidsHub.dc.html` | Hearing aids hub · desktop (full page; hub layout) |  |
| `HearingAidsMobile.dc.html` | Hearing aids hub · mobile (reads left to right) | 390px phone columns |
| `BrandPage.dc.html` | Brand page · desktop (full page; same layout for every brand) |  |
| `BrandMobile.dc.html` | Brand page · mobile (reads left to right) | 390px phone columns |
| `HearingAidsAlt.dc.html` | Hearing aids hub · alternate states: no-photo hero (Primary), styles section hidden, CTA without photo | *import* of `HearingAidsHub` hero="No photo · Primary" show-styles="{{false}}" cta-photo="{{false}}" |
| `BrandPageAlt.dc.html` | Brand page · alternate states: no-photo hero (Primary), CTA without photo | *import* of `BrandPage` hero="No photo · Primary" cta-photo="{{false}}" |

## About

| File | What it shows | Notes |
|---|---|---|
| `AboutPage.dc.html` | About us · desktop (full page) |  |
| `AboutMobile.dc.html` | About us · mobile (reads left to right) | 390px phone columns |
| `PersonPage.dc.html` | Provider profile · desktop (full page; same layout for every provider) |  |
| `PersonMobile.dc.html` | Provider profile · mobile (reads left to right) | 390px phone columns |
| `LocationPage.dc.html` | Location · desktop (full page; one per office) |  |
| `LocationMobile.dc.html` | Location · mobile (reads left to right) | 390px phone columns |
| `AboutPageAlt.dc.html` | About us · alternate states A: no-photo hero (Primary), horizontal journey, CTA without photo | *import* of `AboutPage` hero="No photo · Primary" journey="Horizontal" cta-photo="{{false}}" |
| `AboutPageAltB.dc.html` | About us · alternate states B: journey hidden, credentials hidden (no gaps left behind) | *import* of `AboutPage` journey="Hidden" credentials="{{false}}" |
| `PersonPageAlt.dc.html` | Provider profile · alternate states: video hidden, one office, CTA without photo | *import* of `PersonPage` video="{{false}}" offices="One" cta-photo="{{false}}" |
| `LocationPageAlt.dc.html` | Location · alternate states: no-photo hero (Primary), provider without profile link, CTA without photo | *import* of `LocationPage` hero="No photo · Primary" provider-linked="{{false}}" cta-photo="{{false}}" |

## Blog

| File | What it shows | Notes |
|---|---|---|
| `BlogPage.dc.html` | Blog archive · desktop · grid with 16:9 images (chips filter) |  |
| `BlogPageSquare.dc.html` | Blog archive · desktop · grid with square images | *import* of `BlogPage` layout="Grid · square" |
| `BlogPageList.dc.html` | Blog archive · desktop · list view (featured-row style) | *import* of `BlogPage` layout="List" |
| `BlogPageCategory.dc.html` | Blog category archive · /blog/category/hearing-aids/ (one chip active; CTA without photo) | *import* of `BlogPage` layout="Grid · 16:9" category="Hearing Aids" cta-photo="{{false}}" |
| `BlogMobile.dc.html` | Blog archive · mobile (reads left to right) | 390px phone columns |
| `PostPage.dc.html` | Blog post · desktop (full page; long-form reading) |  |
| `PostMobile.dc.html` | Blog post · mobile (reads left to right) | 390px phone columns |
| `PostPageAlt.dc.html` | Blog post · alternate states: no featured image, author without profile link, CTA without photo | *import* of `PostPage` featured-image="{{false}}" author-linked="{{false}}" cta-photo="{{false}}" |

## Resources

| File | What it shows | Notes |
|---|---|---|
| `ResourcesPage.dc.html` | Patient resources · View A: Cards, Group by None (default) |  |
| `ResourcesAccordion.dc.html` | Patient resources · View B: Accordion, Group by None (CTA without photo) | *import* of `ResourcesPage` hero="No photo · Light" layout="Accordion" group-by="None" cta-photo="{{false}}" |
| `ResourcesGrouped.dc.html` | Patient resources · View C: Cards, Group by Tag | *import* of `ResourcesPage` hero="No photo · Light" layout="Cards" group-by="Tag" |
| `ResourcesMobile.dc.html` | Patient resources · mobile (View A, then B and C) | 390px phone columns |

## Utility

| File | What it shows | Notes |
|---|---|---|
| `BookPage.dc.html` | Book appointment · desktop · Version A: scheduler embed (full page) |  |
| `BookPageB.dc.html` | Book appointment · desktop · Version B: request form (full page) | *import* of `BookPage` version="B · Request form" |
| `BookMobile.dc.html` | Book appointment · mobile (A, B, then page end) | 390px phone columns |
| `BookPageSideA.dc.html` | Book appointment · desktop · Right sidebar · Version A: scheduler embed | *import* of `BookPage` version="A · Scheduler embed" layout="Right sidebar" |
| `BookPageSideB.dc.html` | Book appointment · desktop · Right sidebar · Version B: request form | *import* of `BookPage` version="B · Request form" layout="Right sidebar" |
| `ReviewsPage.dc.html` | Reviews · desktop (full page; location filter works) |  |
| `ReviewsMobile.dc.html` | Reviews · mobile (reads left to right) | 390px phone columns |
| `LegalPage.dc.html` | Legal pages · desktop (Privacy Policy shown; same template for Terms and Accessibility) |  |
| `LegalMobile.dc.html` | Legal pages · mobile (reads left to right) | 390px phone columns |
| `NotFoundPage.dc.html` | 404 · desktop |  |
| `NotFoundMobile.dc.html` | 404 · mobile (reads left to right) | 390px phone columns |
| `ThankYouPage.dc.html` | Thank-you · desktop (after a form is sent) |  |
| `ThankYouMobile.dc.html` | Thank-you · mobile (reads left to right) | 390px phone columns |
| `ReviewsPageAlt.dc.html` | Reviews · alternate states: one office (no location filter), CTA without photo | *import* of `ReviewsPage` offices="One" cta-photo="{{false}}" |
| `LegalPageAlt.dc.html` | Legal pages · alternate state: table of contents hidden | *import* of `LegalPage` jump-list="{{false}}" |
| `NotFoundPageAlt.dc.html` | 404 · alternate state: search box hidden (quick links only) | *import* of `NotFoundPage` search="{{false}}" |
