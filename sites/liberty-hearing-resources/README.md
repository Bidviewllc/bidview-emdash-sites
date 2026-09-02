# Liberty Hearing Center — static design build

Hand-built static HTML for Liberty Hearing Center (College Station, TX).
This is a **design reference, not an EmDash site.** There is no Astro project,
no Worker, no CMS, and no `wrangler.jsonc` here. Nothing in this folder deploys
from this repo.

Live preview: https://liberty-hearing-resources.vercel.app
(deployed separately from Vercel, not from this repo)

## What's here

11 pages, each an `index.html` in its own folder:

| Path | Page |
| --- | --- |
| `/` | Home |
| `/about/` | About |
| `/services/` | Audiology Services |
| `/hearing-evaluations/` | Hearing Evaluations |
| `/phonak-hearing-aids/` | Phonak Hearing Aids |
| `/pricing/` | Pricing |
| `/resources/` | Resources |
| `/contact/` | Contact |
| `/dr-carly-hall/` | Dr. Carly Hall, AuD |
| `/dr-chris-duhon/` | Dr. Chris Duhon, AuD |
| `/rocio-zarandona/` | Rocio Zarandona |

Shared files in `assets/`:

- **`brand.css`** — the whole color palette as CSS custom properties. Colors are
  defined here and nowhere else; no page hardcodes a color. Each color has an
  `-rgb` twin (raw `r,g,b`) for use inside `rgba()`. Change a color and its twin
  together.
- **`site.js`** — small vanilla-JS runtime for the mockup (see below).
- Photos and logos (`.jpg`, `.jpeg`, `.webp`).

Layout is inline `style` attributes on the elements, not classes. That was
deliberate for fast design iteration and is the main thing worth restructuring
if these pages become templates.

## Paths are root-absolute

Every link and asset reference starts from `/` (`/about/`, `/assets/brand.css`).
The site has to be served from a domain root. Dropping it in a subdirectory
breaks all navigation and styling.

For a local look, run any static server from this folder, e.g.:

```
python -m http.server 8000
```

then open http://localhost:8000

## What `site.js` does

Four things, all client-side:

1. **`style-hover` attributes** — elements carry `style-hover="prop:val;..."`,
   applied on pointer enter and removed on leave. A stand-in for `:hover` rules,
   since the styling is inline.
2. **Home section swap** — the homepage has two variants of one slot, a launch
   CTA (`#book`) and a "Hearing the Call" section. Elements marked `data-swap`
   toggle between them. This is a design comparison device for reviewing both
   options, not a feature. Pick one and drop the other in the real build.
3. **Clinic photo lightbox** — `data-lightbox-open` elements open the enlarged
   photo; click outside or press Escape to close.
4. **Contact form thank-you state** — front-end only, see below.

## Not implemented

Things that look functional but aren't, and need real work in the production build:

- **Contact form (`/contact/`)** — `#request-form` calls `preventDefault()` and
  swaps in a thank-you message. It does not submit, validate, email, or store
  anything. Needs a real handler, plus spam protection.
- **Google Fonts** — Inter loads from `fonts.googleapis.com`. Self-host it if
  you want to drop the third-party request.
- **SEO** — titles are set per page. Meta descriptions, canonicals, Open Graph,
  and schema have not been reviewed.
- **Analytics / tracking** — none present.
- **Image weight** — several photos are 300–380 KB unoptimized JPEGs. Worth
  converting and resizing before launch.

## Source

Maintained by Liz in `TheCube/.vercel-deploy/liberty-hearing-resources/`, which
is where the Vercel preview deploys from. This copy is a snapshot for hand-off.
If you change files here, tell Liz so the two don't drift.
