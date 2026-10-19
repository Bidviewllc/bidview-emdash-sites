# Audiology Template · Design 1 (Nested panels) · Build handoff

This folder is the complete design for a reusable website template for independent audiology practices. It was designed in a Claude design canvas and is handed over here for the production build. Read this file first, then `tokens.json`, then `styles/d1.css`. Use `BOARDS.md` to find the board for any page or state.

The placeholder practice is **Lakeview Hearing Center** (Riverside, ST). Every name, address and phone number below is placeholder content that will come from a per-practice data file.

---

## 1. What to build

A demo site on Vercel that the agency team and clients use to review the template.

- **Framework:** Next.js (App Router) with TypeScript. Plain CSS reusing `styles/d1.css`, with no CSS framework.
- **Routes:** every page below gets a real route, and the site navigation links them together.
- **Responsive:**
  - Desktop is designed at 1440px.
  - Mobile is designed at 390px.
  - Use the mobile layout up to about 1024px; there is no tablet design yet.
- **Global tweaks panel:** a floating "Review controls" panel on every page (section 6). Its settings are stored in the URL query string, so a shared link reproduces exactly what the sender saw.
- **Review hub:** `/review` lists every page and every alternate state, with links (section 7).
- **Content:** all content lives in one data file per practice (section 5). Swapping practices means editing that one file.

### Build order

1. **Shell and Home:**
   - project setup with the CSS tokens;
   - the practice data file and the tweaks panel;
   - the header and footer components with all their variants;
   - the Home page;
   - the Service detail page.
2. **Remaining pages:** the other 15 pages in the order of section 4.
3. **Finish:**
   - the `/review` hub;
   - a full mobile pass on every page;
   - an accessibility pass covering contrast, keyboard use, focus states and 48px targets.

---

## 2. Rules that cannot be broken

The audience is older adults, so these rules come before any visual preference.

| Rule | Detail |
|---|---|
| **Body text** | 18px or larger on desktop and mobile. |
| **Exception: top navigation** | 17px. |
| **Small text** | 16px for dates and captions only. Nothing is ever below 15px. |
| **Tap targets** | 48px minimum height and width for every link, button, input, chip, pager item and carousel dot. |
| **Contrast** | WCAG AA throughout: 4.5:1 for text, 3:1 for large text and UI parts. Text on a practice colour always uses the computed "on" colour (section 3). |
| **Errors** | Red `#B42318`, the only colour outside the roles, always paired with an icon and a sentence that says how to fix it. Success messages use Primary. |
| **Mobile header** | Shows a call icon button instead of the full number (approved). |
| **Real controls** | Use real `<button>`, `<a href>`, `<input>` with `<label>`, and `aria-label` on icon-only buttons. Every interactive element is reachable by keyboard and has a visible 3px focus outline. |
| **Hidden optional sections** | Must not leave a double gap. When two white bands end up next to each other, the second one drops its top padding (see AboutPage, HearingAidsHub and ServicesHub for the logic). |
| **Colour usage** | Only the three practice colours plus the design's own white, greys and near-black. |

---

## 3. Design system

The tokens are in `tokens.json`; the full implementation is in `styles/d1.css`.

### Practice colours

Each practice sets three colours. Everything else is derived from them.

| Role | Used for |
|---|---|
| Primary | Buttons; links (darkened as `--p-ink`); the eyebrow square; Primary hero and CTA panels |
| Accent | Tints (hover states, icon circles, tags); link underlines; stars |
| Light | Light background bands; the no-photo Light hero |

Port this logic exactly. It is used in every board's script:

```js
const hex = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return h; };
const lum = (h) => { h = hex(h); const x = [0, 2, 4].map((i) => { const c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const on = (c) => (cr(c, '#FFFFFF') >= cr(c, '#1B1F23') ? '#FFFFFF' : '#1B1F23');
const darken = (h, t) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(hex(h).substr(i, 2), 16) * (1 - t)).toString(16).padStart(2, '0')).join('');
let pInk = P; for (let t = 0.08; cr(pInk, '#FFFFFF') < 4.5 && t < 0.9; t += 0.08) pInk = darken(P, t);
// set on the page root:
// --p:P; --a:A; --l:L; --on-p:on(P); --on-a:on(A); --on-l:on(L); --p-ink:pInk
```

**Presets:**

- Teal / Amber: `#0F5E6B` `#E0A33B` `#F6F1EA` (the default)
- Navy / Coral: `#1E3A5F` `#E8735A` `#EEF3F8`
- Forest / Gold: `#2F5D3A` `#C9A227` `#F7F4EC`

### The nested-panel look

The style is called "nested panels": content sits in rounded panels inset 12px from the page edge (8px on mobile), and cards and photos sit inside those panels.

- **Panel:** grey `#EFEFED` (or the Light colour) with a 28px radius (24px on mobile) and 16px padding (12px on mobile).
- **Cards and tiles:** white with a 16px radius, inside a panel.
- **Corner rule:** an inner element's radius equals the outer radius minus the gap between them.
- **Photos:** always have their own rounded corners and never touch each other or the panel edge.
- **Bands:**
  - A full-bleed white band uses 112px vertical padding.
  - `.band.bg-light` and `.band.bg-gray` are inset rounded panels with 104px padding.
  - When an inset band sits next to another inset band, they get a 12px gap between them.
- **Shadows:** almost none. Only dropdowns, the floating header pill and the V1 logo badge have a soft shadow.

### Type

- **Fonts:**
  - Headings: Plus Jakarta Sans 500/600.
  - Body: Atkinson Hyperlegible Next 400/600/700.
- **Scale:** in `tokens.json`. In short:
  - H1 is 52px (64px for xl), 34px on mobile.
  - H2 is 40px, 30px on mobile.
  - H3 is 26px; H4 is 21px.
  - Lead is 20px; body is 18px.
- **Eyebrow:** 15px uppercase with an 8px Primary square in front.

### Components

The classes for each component are in `d1.css`. The component boards are on the "Components" canvas page; see `BOARDS.md`.

- **Foundations** (`Main`): colours, type, spacing and buttons.
- **Buttons:**
  - Primary, Accent, Secondary (outline), Gray (with an arrow), Inverse (on Primary) and Ghost-on-Primary.
  - `.btn` is 52px tall; `.btn.sm` is 48px tall.
- **Header:**
  - The desktop header has dropdown menus: a grey panel holding a white list.
  - The mobile header has a call icon and a menu button. The open menu is a full-width nested panel with expanding parent items, and Book and Call buttons at the bottom.
- **Page hero (interior pages):** four versions.
  - Photo: text on the left, image on the right.
  - Example photo: the image fills the right two-thirds and fades into a darkened Primary.
  - No photo · Light and No photo · Primary.
  - A `short` hero variant is used on utility pages.
- **Home hero and trust bar:** the association logos come in colour, white and black. The white or black versions are chosen automatically from the background.
- **Cards and logo row:** service cards and brand logo tiles, each with a linked or plain state.
- **Accordion / FAQ:** `.acc`; 84px rows; the plus/minus icon sits in a 44px tile.
- **Reviews:** a single quote and a carousel, with 48px dots and arrows.
- **Provider cards:** linked (with an arrow) or plain, and a horizontal variant.
- **Blog cards and featured post:** the image ratio (16:9 or square) is set once per site.
- **Timeline:** a 2×2 grid or horizontal.
- **CTA band:** a Primary action panel next to a photo panel, or the Primary panel alone (`.cta.solo`).
- **Location block and forms:**
  - Inputs are 56px tall with labels above them.
  - Checkboxes and radios sit in 56px pills.
  - Errors are red with an icon; success uses Primary.
- **Footer:** see the header and footer options below.

### Header and footer options

These live on the "Headers & footers" canvas page. Each is a single component with a `variant` prop:

- `SiteHeader.dc.html` has `variant`, `mobile` and `menuOpen`.
- `SiteFooter.dc.html` has `variant`, `logo` (Landscape/Vertical), `mobile` and `badges`.

| Header | Description |
|---|---|
| H1 · Classic two-bar | A Primary utility bar (address, directions, phone) above logo, nav and Book |
| H2 · Floating pill | A white pill header inside a Light panel, with a plain utility line above |
| **H3 · Single row (current default)** | Logo, nav, phone and Book in one row |
| V1 · Overhanging logo badge | A stacked logo on a white badge hanging below the utility bar and main bar |
| V2 · Centered logo, split nav | A grey utility bar with a small Book button; the logo sits between the two halves of the nav |
| V3 · Logo spans two tiers | The logo, a divider, then contact details on top and nav plus Book below |
| V4 · Centered stack | Call on the left, a large logo in the centre, Book on the right; the nav is centred below |
| V5 · Logo over menu, stacked actions | The logo is top left; Book and Call are stacked on the right; the nav sits below |
| V6 | As V5, with Call and Book side by side |
| V7 | As V5, with Book only |

| Footer | Description |
|---|---|
| F1 · Classic grouped | A brand card, then three link groups. With a vertical logo, the logo gets its own card |
| F2 · Contact-led split | A Primary invitation panel ("Let's talk about your hearing.") next to a contact and links card |
| F3 · Brand-led minimal | On the Light colour: centred logo, a line of text, 4 links, phone and Book |
| F4 · Patient-first | A brand card, a New patients task card, a Current patients task card and Our practice links |
| F6 · Multi-location | On Primary: brand, two link groups and an outlined "Find your office" panel |
| **F7 · Office cards (current default)** | A brand card, one card per office with hours, and Explore |

- **Numbering:** there is no F5; the numbering matches the source library.
- **Mobile V4–V7:** these headers were designed here. The library only drew mobile versions for H1–H3 and V1–V3.
- **Vertical logo:** Lakeview has no vertical logo, so a stacked version of its mark is used as a stand-in.

---

## 4. Pages

Every page has a desktop board and a mobile board, and most have alternate-state boards (see `BOARDS.md`). The "Tweaks" listed for each page are its on/off switches. They belong in the Review controls panel when someone is on that page, and their defaults are the ones shown on the main board.

Interior heroes come in four versions (Photo / Example photo / No photo · Light / No photo · Primary) unless a page says otherwise.

| # | Page | Route | Main board | Sections, in order | Tweaks (defaults) |
|---|---|---|---|---|---|
| 1 | Home | `/` | Home1 + Home2 (`HomeFull` = whole page); `HomeStates` shows every alternate state | Hero with trust bar → intro or about teaser → providers → services → brands → reviews → locations → latest posts → CTA → footer | hero (Photo); aboutLink; providersLinked; serviceLinks (Mixed); brandLinks (Mixed); reviewsLink; offices (Two/One); showPosts; ctaPhoto; footerBadges; headerStyle; footerStyle; footerLogo |
| 2 | Services hub | `/services` | ServicesHub | Hero → intro → steps (4) → services grid → CTA | hero; showSteps; reviewsLink; ctaPhoto |
| 3 | Service detail | `/services/[slug]` | ServiceDetail | Hero → main area with a right sidebar: "Table of contents" accordion (closed by default) + rich text; the sidebar holds a Book card and reviews (single or carousel), sticky → FAQ → optional recent posts → CTA | hero; reviews (Single/Carousel); reviewsLink; showPosts (off); sticky; ctaPhoto |
| 4 | Hearing aids hub | `/hearing-aids` | HearingAidsHub | Hero → intro with brand grid → styles (optional) → OTC vs prescription (optional) → CTA | hero; brandLinks; showStyles; showOtc; ctaPhoto |
| 5 | Brand page | `/hearing-aids/[brand]` (Phonak shown) | BrandPage | Hero with the brand logo → current models (horizontal cards per product line) → care or accessories (Light inset) → older models (grey inset panel) → FAQ → CTA | hero; ctaPhoto |
| 6 | About | `/about` | AboutPage | Hero → story → journey timeline → values → team (provider cards, no bios) → community (optional) → credentials (colour association logos + an "Additional badge" tile, optional) → CTA | hero; journey (Grid 2×2/Horizontal/Hidden); profiles; community; credentials; ctaPhoto |
| 7 | Provider profile | `/about/[person]` | PersonPage | Profile header (4:5 headshot + text, vertically centred) → full-width bio → intro video (16:9, play and captions) → locations (as Home) → services (as Home) → CTA "Book your appointment" | offices; video; ctaPhoto |
| 8 | Location | `/locations/[office]` (Northfield shown) | LocationPage | Hero (office exterior) → details card + map → horizontal provider card → services (Home card style) → reviews → CTA "Visit our Northfield office" | hero; serviceLinks; providerLinked; ctaPhoto |
| 9 | Contact | `/contact` | ContactPage | Hero (No photo · Light by default) → form + sticky "Talk to us" card (call, email, "Schedule an appointment") → locations (as Home) → CTA "Call us to talk it through" | hero; offices; ctaPhoto |
| 10 | Book appointment | `/book-appointment` | BookPage (+ BookPageB, BookPageSideA, BookPageSideB) | Short no-photo hero → Version A (scheduler embed) or Version B (request form) → "Where to find us". Layout is full width or right sidebar; the sidebar holds "Prefer to call?" (A only) + compact office cards | version (A/B); layout (Full width/Right sidebar) |
| 11 | Reviews | `/reviews` | ReviewsPage | Short Light hero with an inline rating + "Leave us a review on Google" → location filter (only with two offices) → masonry of 12 reviews → "Show more" → CTA "Join our patients" | offices; ctaPhoto |
| 12 | Blog archive | `/blog`, `/blog/category/[cat]` | BlogPage (+ Square, List, Category) | Short no-photo hero → category chips → featured post (All only) → grid or list → pager → CTA | layout (Grid 16:9/Grid square/List); category; ctaPhoto |
| 13 | Blog post | `/blog/[slug]` | PostPage | Header: text on the left (breadcrumb, tag, H1, byline), 3:2 image on the right → article (20px) + author box, with a sticky sidebar (Book card, Recent articles) → related articles → CTA | featuredImage; authorLinked; ctaPhoto |
| 14 | Patient resources | `/patient-resources` | ResourcesPage (+ Accordion, Grouped) | Hero → resources as cards or an accordion, optionally grouped by tag with a sticky contents list → latest articles → organisations row → CTA | hero (Photo); layout (Cards/Accordion); groupBy (None/Tag); ctaPhoto |
| 15 | Legal (Privacy, Terms, Accessibility) | `/privacy-policy` etc. | LegalPage | Short hero + "Last updated" → full-width rich text with a "Table of contents" accordion (closed by default) → footer, no CTA | jumpList |
| 16 | 404 | (not-found) | NotFoundPage | No-photo Light hero: large "404", H1 "We can't find that page", text, search box (optional), Book + "Go to the home page" → "Popular pages" (4 cards) | search |
| 17 | Thank you | `/thank-you` | ThankYouPage | Centred Light panel: check mark, H1 "Thank you, we got your message", callback line with a tappable phone number, "Back to home" + "Read our patient resources" | none |

**Alternate-state boards:** each page's "…Alt" boards show its non-default states. They are listed in `BOARDS.md`.

---

## 5. Practice data file

Suggested shape (TypeScript):

```ts
export const practice = {
  name: 'Lakeview Hearing Center', shortName: 'Lakeview', tagline: 'Independent audiology care for Riverside and Northfield families.',
  logo: { wide: '/logo-wide.svg', stacked: '/logo-stacked.svg' }, // placeholder mark in source boards
  colors: { primary: '#0F5E6B', accent: '#E0A33B', light: '#F6F1EA' },
  email: 'hello@lakeviewhearing.example',
  offices: [
    { slug: 'riverside', name: 'Riverside office', street: '1200 Lakeview Parkway, Suite 210', city: 'Riverside, ST 00000', phone: '(555) 010-0142',
      hours: [['Mon – Thu','8:00 – 5:00'],['Fri','8:00 – 12:00'],['Sat – Sun','Closed']] },
    { slug: 'northfield', name: 'Northfield office', street: '48 Mill Street', city: 'Northfield, ST 00000', phone: '(555) 010-0178',
      hours: [['Tue, Thu','9:00 – 4:00'],['Other days','Closed']] },
  ],
  providers: [ /* Dr. Jordan Ellis, Au.D. (Owner and Audiologist), Dr. Priya Raman, Au.D. (Audiologist), Morgan Lee (Patient Care Coordinator, no profile) */ ],
  services: [ /* name, slug, short description, hasPage */ ],
  brands: [ /* Phonak, Oticon, ReSound, Signia, Starkey, Widex, Unitron (logo files in assets/brands) */ ],
  associations: [ /* ADA, AAA, ABA, ASHA, HearingUp (colour/white/black in assets/associations) */ ],
  social: { facebook: '#', instagram: '#', youtube: '#' },
};
```

Placeholder copy is in the source boards and in `content/*.json`:

- `posts.json`: 9 blog posts.
- `revs.json`: reviews.
- `res.json`: patient resources.
- `postbody.json` and `postside.json`: blog post body and sidebar.

---

## 6. Review controls (global tweaks panel)

A floating panel at the bottom right of every page, collapsible, matching the `.rc` panel in the HomeFull board.

**Global settings:**

- **Colours:**
  - palette: the 3 presets, or Custom with three colour pickers;
  - a live contrast readout.
- **Brand:**
  - practice name;
  - logo, either uploaded (data URL) or a sample;
  - logo shape (wide or stacked);
  - phone number.
- **Header and footer:**
  - header style (H1–V7);
  - footer style (F1–F7);
  - footer logo (Landscape/Vertical);
  - footer badges.
- **Site-wide:**
  - offices (Two/One);
  - default hero style;
  - CTA photo on or off.

**Page settings:** the current page's own Tweaks from section 4.

**Behaviour:**

- Every setting is written to the URL query string, so a link reproduces the view.
- `localStorage` remembers the panel's open or closed state.
- `?panel=off` hides the panel for client presentations.
- A Reset button returns to the defaults.

---

## 7. Review hub (`/review`)

An index page with one card per page. Each card links to the page in its default state and to each alternate state, pre-set through the query string. It includes a short note per page and links to the header and footer galleries.

---

## 8. Decisions already made (from review comments)

- **Brand page:**
  - Model cards are horizontal, one per row, with the image on the left.
  - Older models sit on an inset grey panel, not a full-width band.
- **About:**
  - Team cards have no bios.
  - Credentials reuse the colour association logos, plus an "Additional badge" slot.
- **Provider profile:**
  - The header text is vertically centred.
  - The bio is full width.
  - The video sits above locations; locations and services use the Home sections.
- **Location:** services use the Home card style.
- **Contact:**
  - It uses the Home locations section; the office cards were removed from the side card.
  - The side card has a "Schedule an appointment" button.
- **Book:**
  - It has a right-sidebar version.
  - The full-width layout has no "Prefer to call?" card.
  - Checkbox pills have 20px left padding.
- **Reviews:** no summary card; the rating and Google button sit inline.
- **Blog post:**
  - The header has text on the left and the image on the right.
  - It has a right sidebar, with no categories block.
- **Legal and Service detail:** a "Table of contents" accordion, closed by default. Legal pages are full width.
- **Footers:** in the vertical-logo footers, the brand card centres its logo, call link, Book button and social icons.

---

## 9. Open questions

- **Tablet (768–1024px):** this uses the mobile layout for now. A two-column middle step is not designed.
- **Real assets:** a real vertical or stacked logo per practice is needed; the placeholder photos and the scheduler embed provider are also still to be supplied.
- **Hosting:** whether the demo is public or password-protected on Vercel.
- **Review feedback:** how reviewers leave feedback, either Vercel comments or a simple feedback button.

---

## 10. How to read the source boards

The `.dc.html` files use the canvas's own template format:

- `{{hole}}` placeholders;
- `<sc-if value>` for conditionals;
- `<sc-for list>` for repeats;
- `<dc-import name="X">` to embed another board;
- a `<script type="text/x-dc">` block whose `renderVals()` computes the values and whose `data-props` attribute lists the tweaks.

Treat them as exact visual and markup references and rebuild them as React components; do not try to run them. Class names match `d1.css`. Mobile styles are scoped under a `.m` ancestor class; in the build, turn `.m …` rules into `@media (max-width: 1023px)` rules. Image paths in the boards already point to `../assets/`.
