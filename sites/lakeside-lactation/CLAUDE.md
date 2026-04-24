# Lakeside Lactation — emdash Port

## Project Overview
- **Domain:** lakeside-lactation.com
- **Owner:** Lauren LiButti, RN, IBCLC (lactation consultant)
- **Location:** Libertyville, IL (Chicago North Shore + Lake County)
- **Phone:** (708) 317-9070
- **Email:** lauren@lakeside-lactation.com
- **Source site (local):** `C:\Clients\Bidview Marketing\lakeside-lactation\site\` (scraped WordPress/Elementor)
- **Live site:** https://lakeside-lactation.com (WordPress + Elementor)
- **Workers URL (Vince):** https://lakeside-lactation.vince-75c.workers.dev
- **Workers URL (Cameron):** https://lakeside-lactation.cameron-239.workers.dev

## Stack
- **Platform:** emdash v0.1.0
- **Frontend:** Astro 6.1.2 (server-rendered only)
- **Production:** Cloudflare Workers + D1 + R2

## Cloudflare Resources

All Cloudflare account IDs, database IDs, KV namespace IDs, R2 buckets, and API tokens are stored in `.env` (gitignored).

See `.env.example` for the variable list. Two accounts are configured:
- **Vince's account** — `CF_VINCE_*` variables
- **Cameron's account** — `CF_CAMERON_*` variables (active in `wrangler.jsonc`)

Worker name: `lakeside-lactation` (same on both accounts).

## Project Directory
- **Active working dir:** `C:\Clients\Bidview Marketing\emdash\lakeside-lactation\`
- Git remote: `https://github.com/vince112385/thechicagomarketingagency.git`

## Current State: LIVE on lakeside-lactation.com (2026-04-09) — CACHE_VERSION v18

### What happened
1. **v1 approach (failed):** Hand-reverse-engineered CSS from DevTools — too slow, missed details
2. **v3 approach (succeeded):** Copied source HTML + all Elementor CSS verbatim, stripped WP/JS runtime
3. **v3 promoted to main:** Copied `src/pages/v3/index.astro` → `src/pages/index.astro` (import path adjusted to `../../v3/`)
4. **Deleted `.wrangler/state/`** to clear old emdash CMS cache that was overriding the filesystem route
5. **All sections visually verified** section-by-section via Chrome DevTools MCP screenshots (2026-04-06)

### Bug fixes applied (2026-04-07) — all visually verified
1. **Services CSS broken** — root cause: `Testimonials.astro` `closingTags` extraction was capturing 10 `</div>` tags (greedy regex) instead of 2, collapsing the `.page-1122` wrapper before Services. Fixed with depth-tracking loop to find exact outer-container close point.
2. **Testimonial quote font wrong (16px Aktiv Grotesk instead of 30px Literata)** — root cause: `<style id="loop-701">` block inside the swiper-wrapper content was dropped when dynamic slides replaced static content. Fixed by extracting and re-injecting the style block.
3. **Service card titles wrong size** — root cause: inner heading divs (title, description, meta) had no `el-XXXXXXXX` IDs. CSS rules in combined.css (`.page-1122 .el.el-XXXXX .heading-title`) never matched. Fixed by adding `titleWidget`, `descWidget`, `metaWidget` IDs to all 5 cards in `servicePositionIds`.
4. **FAQ questions wrong font/color (teal on teal, barely visible)** — same root cause pattern: question/answer divs had no element IDs so default teal color applied. Fixed by adding `faqPositionIds` array with correct widget IDs and applying them in `faqs.map()`.

### Tracking added to staging (2026-04-07) — CACHE_VERSION v18
- **GTM:** `GTM-TWJJQRHW` — head script + noscript body tag added to `src/pages/index.astro`
- **GA4 / gtag.js:** `GT-5MRPRLX3` — added to `src/pages/index.astro` head
- Both pulled from live WordPress site source HTML
- Visually verified both requests fire on `https://lakeside-lactation.cameron-239.workers.dev/`
- GSC on live site is verified via DNS (no meta tag in source HTML — nothing to transfer)

### Live domain cutover (2026-04-09)
- `lakeside-lactation.com` + `www.lakeside-lactation.com` now point to emdash Worker via Cloudflare Custom Domains
- Old DNS: CNAME `www` → `secure.cloudways.cloud` (deleted), root A record (deleted)
- Custom Domain IDs: root `3919d303aa23996039c614620c0aa5602594de17`, www `1e7ef74c6793ae1556b9b139344640a57abcf969`
- WordPress/Cloudways site replaced — emdash is the production site
- Verified: page renders, GTM + GA4 both firing on `https://lakeside-lactation.com/`
- `wrangler.jsonc` updated with `routes` + `custom_domains` + `workers_dev: true`

### CRITICAL PATTERN: el-XXXXXXXX IDs required for all dynamic widgets
All element-specific CSS in `combined.css` is scoped as `.page-1122 .el.el-XXXXXXXX`. Any dynamic Astro component that renders CMS data MUST apply the correct `el-XXXXXXXX` class AND `data-id` attribute to every wrapper div — otherwise all per-element font/color/size rules fail and fall back to defaults. Always cross-reference source HTML for the correct IDs.

### Current file structure
- `src/pages/index.astro` — main homepage, imports 11 raw HTML section components via `?raw`
- `src/components/sections/*.html` — 11 section fragments split from body-cleaned.html:
  - `Header.html` — top bar, sticky header (desktop), mobile headers
  - `PageWrapperOpen.html` — elementor page wrapper + mobile CTA bar
  - `Hero.html` — hero section with wave divider
  - `MobileCta.html` — mobile CTA bar (duplicate)
  - `ProofBarTagline.html` — proof bar + tagline section
  - `About.html` — about/bio section with Lauren photo
  - `Testimonials.html` — testimonials carousel + trust badges
  - `Services.html` — 5 service cards with shape dividers
  - `Support.html` — support watermark section
  - `Faq.html` — FAQ section (dark teal bg)
  - `CtaFooter.html` — CTA + footer + Elementor popups
- `v3/body-cleaned.html` — original unsplit source (kept as reference)
- `v3/body-content.html` — intermediate file (can be deleted)
- `public/v3-css/` — all Elementor CSS files (theme, widgets, post-*.css)
- `public/v3-assets/` — images/fonts copied from WP uploads

### JS features (inline in index.astro)
- **Sticky header:** scroll listener on `.elementor-element-4f8a8aed`, adds `position:fixed` + `.elementor-sticky--active`
- **Swiper carousel:** CDN swiper-bundle.min.js, initializes on `.elementor-widget-loop-carousel .swiper` (loop only if 2+ slides)
- **Mobile nav toggle:** click handler on `.elementor-menu-toggle`
- **Booking modal:** IntakeQ iframe (`https://intakeq.com/bookingwidget/68e276c0fd05fafdb1083952`), intercepts all `popup%3Aopen` links, opens modal overlay with close button + backdrop click + Escape key

### emdash admin
- Setup wizard at `/_emdash/admin/setup` — NOT yet completed
- Template detected: "Lakeside Lactation (4 collections)"
- Collections in seed.json: testimonials, faqs, services, form_submissions
- Query API: `import { getEmDashCollection, getEmDashEntry } from "emdash"`

### Important: .wrangler/state/ cache
- emdash CMS stores pages in local D1 that OVERRIDE filesystem routes
- If homepage shows old content after changes, delete `.wrangler/state/` and restart dev server
- This happens every time the dev server starts fresh — it creates a new D1 from the seed

---

## NEXT TASK: Elementor Class Cleanup (not started)

### Goal
Remove ALL "elementor" naming from HTML and CSS. Replace with clean semantic class names (Astro/emdash conventions). Visual design must remain pixel-perfect identical.

### Strategy (approved by Codex + Gemini, 2026-04-06)
**Hybrid section-by-section migration:**

1. **Backup** current working state (git commit before starting)
2. For each section (10 total):
   a. Extract section HTML into its own Astro component (e.g., `Hero.astro`, `ProofBar.astro`)
   b. Add semantic class names alongside existing Elementor classes
   c. Use DevTools to identify active CSS rules for that section
   d. Move only that section's CSS into scoped `<style>` block with semantic selectors
   e. Keep old Elementor classes temporarily during transition
   f. **Visually verify** (screenshot compare) — must match before proceeding
   g. Remove old Elementor classes/selectors for that section
3. Once all 10 sections are clean, delete `public/v3-css/` and `v3/body-cleaned.html`

### Why this approach (Codex + Gemini consensus)
- **Global find-replace is too risky** — Elementor selectors are deeply nested, reused, combined in selectors
- **Section-by-section** allows small rollback scope and visual verification per section
- **Keeping old classes temporarily** prevents pixel drift during transition

### Section order for cleanup
1. Hero
2. Proof Bar
3. Tagline
4. About / Bio
5. Testimonials
6. Services
7. Support
8. FAQ
9. CTA
10. Footer

---

## v3 CONVERSION RECIPE — WordPress/Elementor → Astro/emdash

**This is the reusable recipe. Run these steps whenever porting a scraped WP/Elementor site.**

### Step 1 — Copy source CSS into public/
All CSS needs to live under `public/` so it serves from root `/v3-css/`:
```
public/v3-css/
├── theme/                    # Hello Elementor theme
│   ├── reset.css
│   ├── theme.css
│   └── header-footer.css
├── elementor/                # Elementor plugin widgets + modules
│   ├── frontend.min.css
│   ├── widget-*.min.css      (nav-menu, image, icon-list, heading, divider, social-icons, rating, icon-box, loop-common, loop-carousel)
│   ├── shapes.min.css
│   ├── sticky.min.css        (elementor-pro)
│   ├── popup.min.css         (elementor-pro)
│   ├── swiper.min.css + e-swiper.min.css
│   ├── apple-webkit.min.css
│   └── e-animation-grow.min.css
├── post-1098.css             # kit globals (CSS vars, typography)
└── post-XXXX.css             # per-page compiled CSS (one per Elementor template/page)
```

Source paths map to:
- `SITE/wp-content/themes/hello-elementor/assets/css/*` → `public/v3-css/theme/`
- `SITE/wp-content/plugins/elementor/assets/css/**/*.css` → `public/v3-css/elementor/`
- `SITE/wp-content/plugins/elementor-pro/assets/css/**/*.css` → `public/v3-css/elementor/`
- `SITE/wp-content/uploads/elementor/css/post-*.css` → `public/v3-css/`

### Step 2 — Copy asset files
```bash
mkdir -p public/v3-assets
cp SITE/wp-content/uploads/2026/01/*.{png,svg,jpg,ttf} public/v3-assets/
```

### Step 3 — Rewrite paths inside copied post-*.css
Post CSS files reference assets via relative paths like `../../2026/01/filename.png`. Rewrite them:
```bash
cd public/v3-css
for f in post-*.css; do
  sed -i 's|\.\./\.\./2026/01/|/v3-assets/|g; s|\.\./\.\./\.\./\.\./uploads/2026/01/|/v3-assets/|g' "$f"
done
```

### Step 4 — Extract source body HTML
Get lines between `<body>` and `</body>` from source index.html, rewrite asset paths:
```bash
sed -n '170,1315p' SITE/index.html | \
  sed 's|wp-content/uploads/2026/01/|/v3-assets/|g; s|href="wp-content/uploads/2026/01/|href="/v3-assets/|g' \
  > v3/body-content.html
```

Strip runtime JS with Python (Bash sed can't handle multi-line):
```python
import re
with open('body-content.html') as f: html = f.read()
html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
html = re.sub(r'<noscript>.*?</noscript>', '', html, flags=re.DOTALL)
with open('body-cleaned.html', 'w') as f: f.write(html)
```

### Step 5 — Create src/pages/v3/index.astro
```astro
---
import bodyContent from '../../../v3/body-cleaned.html?raw';
export const cacheHint = 3600;
---
<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page Title — V3 Port</title>

    <!-- Theme reset + base -->
    <link rel="stylesheet" href="/v3-css/theme/reset.css" />
    <link rel="stylesheet" href="/v3-css/theme/theme.css" />
    <link rel="stylesheet" href="/v3-css/theme/header-footer.css" />

    <!-- Elementor frontend -->
    <link rel="stylesheet" href="/v3-css/elementor/frontend.min.css" />

    <!-- Kit globals -->
    <link rel="stylesheet" href="/v3-css/post-1098.css" />

    <!-- Widget + module CSS (match source order exactly) -->
    <link rel="stylesheet" href="/v3-css/elementor/widget-nav-menu.min.css" />
    <link rel="stylesheet" href="/v3-css/elementor/widget-image.min.css" />
    ...etc

    <!-- Per-page template CSS -->
    <link rel="stylesheet" href="/v3-css/post-1122.css" />
    <link rel="stylesheet" href="/v3-css/post-1179.css" />
    ...

    <!-- Google Fonts (match source) -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:..." />
  </head>
  <body class="KEEP-ORIGINAL-BODY-CLASSES elementor-kit-XXXX elementor-page-XXXX">
    <Fragment set:html={bodyContent} />
  </body>
</html>
```

**Critical:** keep ORIGINAL body classes from source (`elementor-kit-XXXX`, `elementor-page-XXXX`, `page-id-XXXX`) — Elementor CSS scopes selectors by these.

### Step 6 — Verify
Navigate to http://localhost:4321/v3/, screenshot, compare to source.

### Why This Works
- Source CSS is already authored/compiled by Elementor to produce the visual output
- Body classes like `.elementor-kit-1098` + `.elementor-page-1122` are the CSS scopes — keep them
- Copied HTML = exact Elementor DOM tree → CSS selectors resolve correctly
- Only missing: JS runtime (interactions, carousels, sticky headers, FAQ toggles, popups)

### JS Runtime That Needs Rebuilding Later
After visual parity, rebuild these interactions as Astro components:
- Testimonial carousel/slider (swiper)
- FAQ accordion toggles
- Sticky header scroll behavior
- Popup "Book Appointment" modal
- Image lazy-loading
- Nav menu mobile burger

### Files to Clean Up Later (post-parity refactor)
- Remove Elementor class noise (`elementor-element-XXXX` hashes)
- Collapse nested `e-con-boxed e-con e-parent e-flex` wrappers into semantic `<section>`
- Drop CSS vars that aren't used (Elementor ships tons of unused presets)
- Remove unused color/gradient WP block styles from post-1098.css
- Lazy load images, remove width/height where not needed

## Workflow Per Section
1. Read source HTML for section
2. Inspect rendered styles via Chrome DevTools MCP on file:// source
3. Port clean Astro markup with exact styles (font family, size, weight, line-height, colors, spacing)
4. Take screenshot, compare to source
5. Iterate until match, then move to next section

## Running Pages in Chrome (MCP)
- Page 1: `http://localhost:4321/` (my port)
- Page 2: `file:///C:/Clients/Bidview%20Marketing/lakeside-lactation/site/index.html` (source)
- Use `select_page` to toggle, `evaluate_script` to inspect styles, `take_screenshot` to compare

## Design System (from source extraction)
- **Colors:**
  - Cream: `#FFF9F5` (hero, tagline, services, support, CTA bg)
  - Sand: `#EEE6E0` (about/bio section bg)
  - Teal: `#183439` (primary dark, FAQ bg)
  - Gold: `#C6872C` (phone, links, accent)
  - Text primary: `#2F2C2B`
  - Eyebrow text: `#47423D` (slightly warmer)
  - Sand border: `#E8DFD6` / `#D8D0C6`
- **Fonts:**
  - Aktiv Grotesk (Light/Regular/Medium/Bold) — body text, hero H1
  - Literata (Google Fonts, italic 400) — italic accent words like "here", "every step"
  - Avegas Royale — eyebrows (uppercase serif, letter-spacing 4px)
  - Roboto (Google Fonts) — guiding H2, proof bar title
- **Max container:** 1200-1440px

## Sections Status (v3 port — ALL VERIFIED 2026-04-06)

### ✅ Section 1: HERO (container 602f1cf4, shape_divider_bottom: waves)
- bg: #FFF9F5 cream + hero-bg.png photo
- min-height: 100vh
- Eyebrow "Your Partner in Nurturing" — Avegas Royale 16px 700, uppercase, 4px letter-spacing, #47423D
- H1 "Compassionate feeding care starts here" — Aktiv Grotesk 56px 400, line-height 56px
- "here" in Literata italic
- underline1.png bg on H1 wrapper at 56% 100% position
- Subtitle — Aktiv Grotesk 20px 400, line-height 30px, #2F2C2B
- Wave divider at bottom (waves SVG, rotate 180deg via Elementor CSS rule)
- SVG: width calc(280% + 1.3px), left 80%, height 80px (user adjusted)

### ✅ Section 2: PROOF BAR (part of container 510a2f9)
- bg: #FFF9F5 cream
- padding 40px 0
- Left: 5 gold stars + "Expert Care You Can Trust" (Roboto 20px 500) + "See Google Reviews" link (Roboto 12px 400)
- Vertical divider (1px × 68px, #D8D0C6)
- Right: 5 credential logos (IBCLC, NILCA, NCC RNC-NIC, CPN, CLSC) max-height 80px, justify-content space-between

### ✅ Section 3: TAGLINE (Literata intro paragraph)
- bg: #FFF9F5 cream, 1px top border #E8DFD6
- padding 120px 48px
- Single paragraph: Literata 30px 400, line-height 45px, #2F2C2B, max-width 1120px
- "over 20 years of experience" em in Literata italic
- Content: "Registered nurse and International Board Certified Lactation Consultant with *over 20 years of experience* supporting families in a Level IV NICU."

### ✅ Section 4: ABOUT / BIO (container 6c9ebe2d id="about", shape_divider_bottom: waves) — DONE
- bg: #EEE6E0 sand, `position: relative; overflow: hidden`
- **Heading area (centered, top):**
  - Eyebrow "for every step, every challenge, and every triumph." — Avegas Royale 16px 500, uppercase, 4px letter-spacing, #47423D
  - H2 "Guiding you through *every step* of your breastfeeding journey" — Roboto 56px 400 line-height 56px #2F2C2B, "every step" in Literata italic
- **2-column layout** (grid 624px 1fr, gap 100px, align-items: start, max-width 1440px, padding 0 48px 0):
  - LEFT: Full Lauren photo (Group-2.png uncropped), z-index: 1, photo-wrap has `margin-bottom: -100px` (photo extends into next section)
  - RIGHT: "Meet Lauren LiButti, RN, IBCLC" (Aktiv Grotesk 36px 300) + 3 bio paragraphs (18px 400 line-height 27px)
- **Wave divider at bottom** (same waves SVG as hero, fill #FFF9F5)
- **CSS specificity note:** use `.about-content p:not(.about-meet)` to prevent bio paragraph rule from overriding .about-meet 36px

### ✅ Section 5: TESTIMONIALS (container 11816529 id="testimonials")
- "What Moms are saying about their experience..." heading
- Testimonial cards with Kaitlin B. testimonial
- 4 trust badges: "Proven, expert care you can trust"

### ✅ Section 6: SERVICES (container 46d54789 id="services", shape_divider_top: curve, shape_divider_bottom: curve-asymmetrical negative)
- Eyebrow "Services"
- H2 "How Lauren can help" ("help" in Literata italic)
- 5 service cards: Prenatal Lactation Consult, In-Home, Follow Up, Back To Work, Lactation After Loss
- Card title: 24px, meta: 16px 700

### ✅ Section 7: SUPPORT (container 3e17dd8a)
- Large 150px watermark: "Support that meets you where you are" — Avegas Royale, color #D8D0C6
- Quote text: 24px Literata
- 2 circular images

### ✅ Section 8: FAQ (container 2630074c id="faq", shape_divider_top: waves)
- Dark teal bg with rectangle-side.png + subtract.png backgrounds
- Left col 592px: "FAQ" eyebrow white 16px 700, "Frequently Asked Questions" 56px white, Contact Lauren button
- Right col 1100px: 4 Q&As (22px questions white)

### ✅ Section 9: CTA + FOOTER (container 5964a52e, shape_divider_bottom: waves)
- "GET STARTED" eyebrow + "Take the next step with support you can trust." H2 (Aktiv Grotesk 36px 400) + body + Book Appointment button + Lauren image
- Footer with logo, contact info, book button, copyright, links, social

## Elementor Shape Dividers
- **Hero bottom (waves)**: data-negative="false", rotate 180deg, fill #FFF9F5 ✅ ADDED
- **About bottom (waves)**: data-negative="false", rotate 180deg, fill #FFF9F5 ✅ ADDED
- **Services top (curve)**: `M1000,4.3V0H0v4.3C0.9,23.1,126.7,99.2,500,100S1000,22.7,1000,4.3z` ✅ (in source HTML)
- **Services bottom (curve-asymmetrical, inverted)**: `M615.2,96.7C240.2,97.8,0,18.9,0,0v100h1000V0C1000,19.2,989.8,96,615.2,96.7z` ✅ (in source HTML)
- **FAQ top (waves)** ✅ (in source HTML)
- **CTA bottom (waves)** ✅ (in source HTML)

### Shape Divider CSS
```css
.elementor-shape { direction: ltr; left: 0; line-height: 0; overflow: hidden; position: absolute; width: 100%; }
.elementor-shape-bottom { bottom: -1px; } .elementor-shape-top { top: -1px; }
.elementor-shape[data-negative="false"].elementor-shape-bottom,
.elementor-shape[data-negative="true"].elementor-shape-top { transform: rotate(180deg); }
.elementor-shape svg { display: block; width: calc(280% + 1.3px); left: 80%; transform: translateX(-50%); height: 80px; }
.elementor-shape-fill { fill: #FFF9F5; }
```
Parent section needs `position: relative; overflow: hidden`.

## Key Reference Files
- **Source HTML:** `C:\Clients\Bidview Marketing\lakeside-lactation\site\index.html` (1321 lines)
- **Elementor kit CSS:** `C:\Clients\Bidview Marketing\lakeside-lactation\site\wp-content\uploads\elementor\css\post-1098.css` (global vars/colors/fonts)
- **Source assets:** `C:\Clients\Bidview Marketing\lakeside-lactation\site\wp-content\uploads\2026\01\`
- **My images:** `C:\Clients\Bidview Marketing\emdash\lakeside-lactation\public\images\`
- **Design comparisons:** `C:\Clients\Bidview Marketing\emdash\lakeside-lactation\design-ref\`

## Running the Project
```bash
cd "C:\Clients\Bidview Marketing\emdash\lakeside-lactation"
npm run dev     # → http://localhost:4321
```

## Vince's Working Rules
- NEVER decide things without asking
- NEVER claim done without verification
- NEVER lie or fabricate
- VISUALLY check everything (take screenshots, compare to source)
- Save state to project CLAUDE.md, not global
- Keep tasks cleaned up

## Codex/Gemini Collaboration
- User asks when to check with Codex/Gemini for plan review — always ask first
- v3 port approach: Codex recommended copy-source, Gemini recommended rebuild — user chose copy-source (visual fidelity first)
- Elementor cleanup approach (2026-04-06): Both recommended section-by-section hybrid migration, NOT global find-replace. Codex: keep old classes temporarily alongside new ones. Gemini: extract computed styles per section into scoped CSS.

## Remaining Dev Server Notes
- Dev server running in background (Astro 6.1.2)
- Port 4321
- CSS Hot Module Reload works; template changes require full refresh

## SEO audit remediation (2026-04-24, cache v20 → v21, deployed)

Responding to the 2026-04-18 Screaming Frog audit (report at `/home/vince/agent-reports/seo-lakeside-lactation/2026-04-18/` on VPS). 3 crawled 404s, all linked from the sitewide footer:

### 404s fixed — all were footer link issues, not missing pages

The clean URLs `/terms-of-service/` and `/privacy-policy/` always returned 200. The audit 404s were the footer linking to `/index.html`-suffixed variants which Cloudflare Workers does not route. Root cause: legacy WordPress mirror markup preserved in `src/components/sections/CtaFooter.html` pointed to relative paths like `privacy-policy/index.html`. Fix: rewrite every such href to the clean absolute path.

- `privacy-policy/index.html` → `/privacy-policy/` (4 occurrences in CtaFooter.html — main menu + dropdown + popup-modal main + popup-modal dropdown)
- `terms-of-service/index.html` → `/terms-of-service/` (same 4 locations)
- `cdn-cgi/l/email-protection/index.html` → `mailto:lauren@lakeside-lactation.com` (plain mailto; old Cloudflare email-obfuscation span removed because CF Email Obfuscation is not enabled on the zone and was 404ing)

### Mobile popup menu — unrelated UX bug found during thorough footer scan

Lines 170-181 of CtaFooter.html had 10 nav links (About/Testimonials/Services/FAQ/Contact × 2, main menu + dropdown) all with `href="/" target="_blank"`. On mobile, tapping any of them opened home in a new tab instead of scrolling to the section. Fixed to match the visible-header pattern in Header.html: proper `#about`, `#testimonials`, `#services`, `#faq`, `#contact` anchors, same-tab navigation.

### Legal pages — full rewrite

Both `src/pages/terms-of-service.astro` and `src/pages/privacy-policy.astro` existed but were thin (~7-8 short sections each). Replaced with HIPAA-grade versions:

- **Terms of Service** — 18 sections. Includes: not-an-emergency-service disclaimer, no-provider-patient-relationship-from-website, preserved existing business terms (24-hr cancellation, $50 late-fee, 20-mile $50 travel fee, no insurance / superbills only), Illinois governing law + Lake County venue, changes clause, severability.
- **Privacy Policy** — 17 sections. Full HIPAA Notice of Privacy Practices: scope (HIPAA + IL Personal Information Protection Act + IL Mental Health & Developmental Disabilities Confidentiality Act), PHI definition, use/disclosure for Treatment-Payment-Operations, 7 HIPAA patient rights (access, amend, accounting of disclosures, restrictions, confidential communications, paper copy of notice, file complaint), breach notification rule, Business Associate Agreements for vendors, telehealth privacy, email/SMS risk disclosure, data retention tied to IL medical record law, HHS Office for Civil Rights complaint link.

Both use existing Base.astro layout (teal + gold theme). Styling: local `<style>` block with `.legal-page`, max-width 800px, teal h2, gold links.

### Alt text — 16 homepage images

`alt=""` across all homepage images pre-existed from the WordPress mirror. Fixed as follows (verified live via grep — 15 descriptive + 2 intentional decoratives):

| File | Image | Alt |
|---|---|---|
| Header.html (×4) | Company/Lakeside logos | `Lakeside Lactation` |
| ProofBarTagline.html | IBCLC-Logo-1.svg | `International Board Certified Lactation Consultant (IBCLC) credential` |
| ProofBarTagline.html | NILCA-logo-1.png | `NILCA — National Institute of Lactation Care Advocates member` |
| ProofBarTagline.html | NCC-RNC-NIC-logo-1.png | `Registered Nurse Certified in Neonatal Intensive Care (RNC-NIC) — National Certification Corporation` |
| ProofBarTagline.html | Certified-CPN-logo-1.png | `Certified Pediatric Nurse (CPN) credential` |
| ProofBarTagline.html | Certified-Lactation-Specialist-Logo-1.svg | `Certified Lactation Specialist credential` |
| About.html | Group-2.webp | `Lauren LiButti, RN, IBCLC, founder of Lakeside Lactation` |
| Services.astro (NOT Services.html) | top-image-logo-1.png | `Lauren supports a mother breastfeeding her baby during an in-home lactation consultation` |
| Support.html | Group-332-1-1.webp | `Lauren arriving at a family's home for an in-home lactation visit with a pediatric weighing scale` |
| CtaFooter.html | grff22-1.webp | `A mother weighing her baby during a virtual lactation consultation with Lakeside Lactation` |
| CtaFooter.html (×2) | Lakeside-Logo-H-1.png, Company-Logo-H-1.png | `Lakeside Lactation` |
| Testimonials.html (×2 decorative) | quotemark1-1.png, Vector-1.png | `alt="" role="presentation" aria-hidden="true"` (WCAG-correct for purely decorative) |

**Rendering gotcha discovered**: `Services.astro` and `Testimonials.astro` are real Astro components imported into index.astro, not raw-HTML twins. Services.html has a twin that is NOT rendered — editing it is a no-op. Testimonials.astro DOES `import rawHtml from './Testimonials.html?raw'` and re-uses most of it (only replaces swiper slides) so editing Testimonials.html outside the swiper-wrapper block is effective. Always check index.astro's import statements before editing a sibling file.

### Deployment details

- `npm run build` then `npm run deploy` (wrangler). Cache bumped `v19 → v20 → v21` in `src/worker.ts` (two deploys — first for pages+alt, second for footer links).
- Wrangler occasionally prints `fetch failed` after a successful `Uploaded` line — retry once and it completes.
- Deployed to Cloudflare Workers `lakeside-lactation` on Cameron's CF account (`239e9d015c7a3a39cdc2e9400312f553`). Custom domains `lakeside-lactation.com/*` and `www.lakeside-lactation.com/*`.

### Still pending (not deployed)

- **Codex/Gemini review** of legal pages — not run yet; worth doing next session before the lawyer-sensitive copy gets baked into any ClickUp fix-now workflow.
- **Commit + push** to `vince112385/lakeside-lactation` — repo was empty on 2026-04-23; the Windows source folder IS a git repo with history but has never been pushed to the GitHub remote. `git status` shows ~14 modified files from this session plus a large `design-ref/` of screenshots. Currently only deployed directly via wrangler, no source-of-truth in GitHub.
- **Base.astro footer** (used by ToS + Privacy pages, NOT homepage) has placeholder social links to bare `facebook.com`/`instagram.com`/`linkedin.com`. Homepage footer (CtaFooter.html) uses a different markup and also has placeholder socials (no `href` on the anchor at all). Real social URLs needed for both.
- **Cloudflare Email Obfuscation** — the underlying zone setting is off. Enabling it would give us scraper protection back; separate dashboard action on Cameron's CF account.
- **Visual browser check** of ToS + Privacy — I verified HTTP 200 + content in the HTML, but did not open the pages in Chrome to confirm the styling renders cleanly. Do this next session.
- **Broader site crawl** — only homepage + the 2 legal pages were verified. `/services/`, `/services/[slug]/`, `/404` not crawled.
- **Atlantic Hearing Care-style localization audit** of tracked keywords in Supabase `clients.metadata` (related to the managed-ai-agents project; Lakeside is now a seo-brain pilot too and may have the same generic-keywords issue).
