# Commonwealth Audiology — Standalone Site

## Overview
Standalone emdash site (npm, emdash@0.8.0). Canonical deployed version.
- **GitHub:** https://github.com/Bidviewllc/bidview-emdash-sites (path: `sites/commonwealth-audiology/`)
- **Local path:** `C:\Clients\Bidview Marketing\github-organization\bidview-emdash-sites\sites\commonwealth-audiology`
- **Stack:** Astro 6 + emdash@0.8.0 + Cloudflare Workers (D1 + R2 + KV)

## Cloudflare Resources (Cameron's account `239e9d015c7a3a39cdc2e9400312f553`)
| Resource | Name | ID |
|---|---|---|
| Staging Worker | `commonwealth-audiology-staging` | — |
| Staging D1 | `commonwealth-audiology-staging-db` | `fde1d6dc-e694-4a68-a50c-55bc5dc5a3c5` |
| Staging R2 | `commonwealth-audiology-staging-media` | — |
| Prod D1 | `commonwealth-audiology-db` | `c0ec066d-0263-4753-9e29-b3b5203deeb8` |
| Prod R2 | `commonwealth-audiology-media` | — |
| KV SESSION | shared | `028dfa4da881449cb1fcfb8ae46b6e2e` |

- **Staging URL:** https://commonwealth-audiology-staging.cameron-239.workers.dev/
- **CF token:** `~/.claude/credentials/cloudflare-cameron-token.txt` → use as `CLOUDFLARE_API_TOKEN`

## Deploy Commands
```bash
npm run deploy:staging      # build + patch dist/server/wrangler.json + wrangler deploy
npm run deploy:production   # build + wrangler deploy (prod)
```
`scripts/deploy-staging.mjs` patches `dist/server/wrangler.json` post-build with staging D1/R2 bindings.

## Staging Status (as of 2026-05-18)
- Worker deployed and running
- Staging D1 seeded: posts, pages, media, nav menus (3-level), services, brands, team
- Staging R2: 3 featured images (`feat-ear-candles.jpg`, `feat-rechargeable-hearing-aids.jpg`, `feat-hearing-aids-for-tinnitus.jpg`)
- **emdash admin NOT set up** — `/_emdash/admin` redirects to `/setup`. Visit https://commonwealth-audiology-staging.cameron-239.workers.dev/_emdash/admin to complete wizard and create admin user.

## Production Status
- Prod D1 (`commonwealth-audiology-db`) is **empty** — NOT seeded
- Prod R2 (`commonwealth-audiology-media`) is **empty**
- Production Worker does NOT exist yet — awaiting Vince approval to seed + deploy

## Pages Built
| Page | Path | Layout | Notes |
|---|---|---|---|
| Homepage | `/` | Base (custom) | Hero, services, brands, team, news, location |
| About | `/about/` | InternalPage | — |
| Insurance & Billing | `/about/insurance-billing/` | InternalPage | — |
| Giving Back | `/give-back/` | InternalPage | — |
| Contact | `/contact/` | Base + PageHero | 4-col cards, form, appt CTA; NO sidebar |
| Book Appointment | `/book-appointment/` | Base + PageHero | Suno iframe scheduler; NO sidebar |
| Dr. Tiffany Brewer | `/tiffany-brewer/` | InternalPage | — |
| Aubrey Gingrich | `/aubrey-gingrich/` | InternalPage | — |
| Magnolia | `/magnolia/` | InternalPage | — |
| Audiology Services | `/audiology-services/` | InternalPage | — |
| Hearing Tests | `/audiology-services/hearing-tests/` | InternalPage | — |
| Hearing Aid Services | `/audiology-services/hearing-aid-services/` | InternalPage | — |
| Tinnitus Evaluation | `/audiology-services/tinnitus-evaluation-treatment/` | InternalPage | — |
| Hearing Aid Fittings | `/audiology-services/hearing-aid-fittings/` | InternalPage | — |
| Sensorineural Hearing Loss | `/audiology-services/sensorineural-hearing-loss/` | InternalPage | — |
| Ear Wax Removal | `/audiology-services/ear-wax-removal/` | InternalPage | — |
| Real Ear Measurement | `/audiology-services/real-ear-measurement/` | InternalPage | — |
| Hearing Aids & Products | `/hearing-aids-products/` | InternalPage | — |
| Oticon | `/hearing-aids-products/oticon/` | InternalPage | — |
| Widex | `/hearing-aids-products/widex/` | InternalPage | — |
| Starkey | `/hearing-aids-products/starkey/` | InternalPage | — |
| Phonak | `/hearing-aids-products/phonak/` | InternalPage | — |
| ReSound | `/hearing-aids-products/resound/` | InternalPage | — |
| Signia | `/hearing-aids-products/signia/` | InternalPage | — |
| Unitron | `/hearing-aids-products/unitron/` | InternalPage | — |
| Costco Hearing Aids | `/hearing-aids-products/costco-hearing-aids/` | InternalPage | — |
| Nano Hearing Aids | `/hearing-aids-products/nano-hearing-aids/` | InternalPage | — |
| Walmart Hearing Aids | `/hearing-aids-products/walmart-hearing-aids/` | InternalPage | — |
| Custom Hearing Protection | `/hearing-aids-products/custom-hearing-protection/` | InternalPage | — |
| Hearing Aid Batteries | `/hearing-aids-products/hearing-aid-batteries/` | InternalPage | — |
| News Archive | `/news/` | Base + PageHero | 3-col card grid, featured images |
| News Post | `/news/[slug]/` | InternalPage | Meta (date + author) in PageHero |
| Sitemap | `/sitemap/` | InternalPage | Dynamic grouped list |
| XML Sitemap | `/sitemap-index.xml` | API route | All static + posts |
| Privacy Policy | `/privacy-policy/` | InternalPage | — |
| Terms of Service | `/terms-of-service/` | InternalPage | — |

## Shared Components (`src/components/`)
- `Header.astro` — sticky nav, mobile toggle, 3-level dropdown menu
- `Footer.astro` — links, sitemap, social
- `PageHero.astro` — internal hero; props: `title`, `breadcrumbs[]`, `image`, `meta?` (shown below title, used for blog post date/author)
- `Accordion.astro` + `AccordionItem.astro` — `<details>`/`<summary>` FAQ pattern
- `TableOfContents.astro` — auto-builds from h2/h3/h4 inside `data-toc-content`
- `Sidebar.astro` — CTA card + Recent News with featured image thumbnails; props: `phone`, `bookUrl`, `posts[]`

## Layouts
- `src/layouts/Base.astro` — HTML shell + Header + Footer
- `src/layouts/InternalPage.astro` — Base + PageHero + 2-col body (`1fr 360px`) + Sidebar; props include `heroMeta?` (threaded to PageHero `meta`)

## Key Seeds (`seed/seed.json`)
- `menus`: 3-level nested (Home, About→[Our Team, Insurance & Billing, News], Services→[7], Hearing Aids→[12], Contact)
- `book_url`: `/book-appointment/` (NOT the suno URL directly)
- emdash Worker re-seeds `menus` from seed.json on first boot — seed.json is source of truth for nav

## Book Appointment Page
- Suno scheduler URL: `https://scheduling.suno.care/?clinic=9918&token=23718121fb23614672a5dc01cefda21bf1f9a8cc&pc=ffffff&dc=1279bd`
- All "Book an Appointment" CTAs site-wide link to `/book-appointment/`
- No sidebar layout

## Contact Form
- `action="#"` — **no backend wired**. TODO: connect to a form-handling endpoint (Worker route or email relay).

## Media / Uploads
- Images in `uploads/` and `public/uploads/`
- **CRITICAL:** emdash media endpoint returns `cache-control: public, max-age=31536000, immutable`. NEVER overwrite a file with the same storageKey/filename. Always copy to a NEW descriptive filename, update `media.storage_key` + `ec_posts.featured_image.meta.storageKey`, delete old file.
- Current featured images (staging R2): `feat-ear-candles.jpg`, `feat-rechargeable-hearing-aids.jpg`, `feat-hearing-aids-for-tinnitus.jpg`
- Hero images: `internal-hero-default.png`, `sidebar-care.png`

## D1 / SQL Gotchas
- D1 import: strip `PRAGMA foreign_keys=OFF;`, `BEGIN TRANSACTION;`, `COMMIT;` before `wrangler d1 execute --remote --file=d1-seed.sql --yes`
- FTS5 triggers on `ec_posts`: drop triggers → update → `INSERT INTO _emdash_fts_posts VALUES('rebuild')` → recreate triggers

## FTS Trigger Pattern
```js
const triggers = D.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND tbl_name='ec_posts'").all();
D.transaction(() => {
  for (const t of triggers) D.prepare(`DROP TRIGGER "${t.name}"`).run();
  // ... do updates ...
  D.prepare("INSERT INTO _emdash_fts_posts(_emdash_fts_posts) VALUES('rebuild')").run();
  for (const t of triggers) D.prepare(t.sql).run();
})();
```

## Pending Tasks
- [ ] **emdash admin setup** — visit `/_emdash/admin/setup` on staging, create admin user
- [ ] **Contact form backend** — wire `action` to a form-handling endpoint
- [ ] **Production deploy** — seed prod D1 + R2, deploy prod Worker (Vince approval required)
- [ ] **Wire internal pages to CMS** — currently static .astro; homepage/blog/nav are backend-driven. Decide whether to wire editable pages via `createEditable()`.
- [x] **Sync demos/simple** — `book-appointment.astro` added, `contact.astro` bookingUrl fixed to `/book-appointment/`, `sitemap-index.xml.ts` updated (2026-05-18)
- [ ] **Sync demos/simple data.db** — `book_url` in local SQLite DB still points to suno URL directly; run UPDATE on `_emdash_site_settings` or re-bootstrap

## Local Dev (Legacy)
- Folder: `c:\Clients\Bidview Marketing\emdash\commonwealth-audiology\demos\simple\`
- Run: `pnpm dev --port 4325` (port 4321 used by Rose Hearing project)
- **NOTE:** This copy is divergent from the canonical `sites/commonwealth-audiology/`. Use canonical for all new work.
