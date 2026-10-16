# Entheos audiology template · design 1 (demo build)

A reusable website template for independent audiology practices (Entheos Digital
Growth Advantage members and Bidview clients). Design 1 is "nested panels",
handed off from Claude Design in `design/`.

## Read first
1. `design/HANDOFF.md`: pages, rules, tweaks, build order. **It says Next.js on
   Vercel; that was overruled.** We build in Astro, server-rendered on Cloudflare
   Workers, so phase 2 can move straight onto EmDash 1.2.0. Everything else in the
   handoff stands.
2. `design/BOARDS.md` + `design/source/*.dc.html`: reference markup per page and
   state. Not code to run.
3. `design/styles/d1.css`: the designer's stylesheet, the single source for styles.

## How this site is put together
- `scripts/build-css.mjs` turns `design/styles/d1.css` into `src/styles/d1.css`
  (generated; never edit it). The boards write phone rules as `.m .x{}`; the script
  moves them into `@media (max-width: 1023px)`.
- `src/styles/site.css`: what the boards did inline, the header breakpoint
  (desktop header from 1280px), the tablet step (640 to 1023px) and the Review
  controls extras.
- **Content comes from EmDash (phase 2, from 2026-10-15).** `src/middleware.ts`
  runs `loadSite()` (`src/data/site.ts`) once per request and puts the result
  on `Astro.locals.site`; every page and component reads from there. No practice
  details in components. `site.ts` maps EmDash records into the shapes in
  `src/data/types.ts`.
- `src/data/practice.ts` and `blog.ts` are now the **sample content** (Lakeview):
  `scripts/build-seed.ts` turns them into `seed/seed.json` (`npm run seed:build`,
  then `npm run seed:check`). A few blocks still read them directly: reviews (to
  come from Vince's reviews sync), hearing aid style drawings, and the sample
  article body.
- `src/lib/settings.ts`: Review controls settings read from the query string.
  Global settings ride along on internal links via `s.href()`; page settings don't.
  Defaults are left out of URLs.
- `src/lib/color.ts`: the colour logic, ported exactly. The same maths is
  duplicated in `ReviewControls.astro` for live colour previews; keep them in step.
- `src/pages/[...slug].astro`: a stand-in for pages not built yet.

## Decisions (Liz, 2026-10-14)
- Service detail: recent posts card is ON by default, in the sidebar (Vince: no
  post links in page body; sidebars are fine).
- Defaults: Teal / Amber, photo hero, two offices (the spec's, not the HomeFull
  board's saved state).
- Demo logos: the code-drawn Lakeview mark, wide and stacked (`Logo.astro`).
- Tablet: no separate design; built from patterns already in the design.
- Demo is public, on the learning account's workers.dev.

## Variants added after Step 2 (Liz, 2026-10-15)
- Team cards (global setting `team`, used on Home and About): `overlay` (the design's
  arrow on the photo, default), `side` (arrow to the right of name and title),
  `list` (photo left, name, title and short bio right; for team members with no
  profile page). Bios are `providers[].bio` in practice.ts. Location page cards
  are unchanged.
- Trust bar (Home page settings): `trustmove=still` shows the logos once, standing
  still, no pause button (wraps into rows on phones); `trustrating=plain` drops
  the rating's own box and outline.
- Still parked: a wholly different trust bar style for mobile, if "still" doesn't
  solve it.

## Phase 2: EmDash (from 2026-10-15)
- Worker `entheos-template-cms` (learning account), D1 `entheos-template-cms-db`,
  R2 `entheos-template-cms-media`, KV `entheos-template-cms-session`. The phase 1
  demo Worker `entheos-audiology-template` is left as it was.
- Admin: https://entheos-template-cms.local-981.workers.dev/_emdash/admin. Passkeys
  belong to that hostname (`EMDASH_SITE_URL` in wrangler.jsonc), so version
  preview URLs show the site but can't log in. The first person to finish the
  setup wizard becomes the admin.
- Collections: Practice details (one record, slug `main`: colours, wordmark,
  rating, memberships, first-visit steps, About journey and values, Review
  controls switch), Offices, Services, Hearing aid brands (models as a repeater),
  Team, Blog posts (category taxonomy), Patient resources (resource_tag taxonomy;
  a tag whose description starts "Label only" is a card label, not a group).
  Logo, favicon, tagline and social links are EmDash's own Settings.
- Switch-on rules in code: own page off = 404 and no "Learn more"; hide from hub =
  no card or menu item, page still live; unpublished = gone everywhere.
- Records with revisions save as a draft: press Publish for the site to change.
- The seed applies once, at setup. After that, editing seed.json changes nothing
  on the live database.
- Local: `npx astro dev --port 4500`, then
  `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` (seeds the local D1
  with sample content and signs you in).
- Menus (Menus screen): `header` (one dropdown level; a parent's own link becomes
  "All ..." under the dropdown) and seven footer menus, one per footer column:
  `footer_practice`, `footer_services`, `footer_patients`, `footer_current` (F4),
  `footer_quick` (F2, F3), `footer_explore` (F7), `footer_legal`. Column headings
  belong to the design. Items are preloaded for every template page; links to a
  record page that isn't live are dropped in `site.ts` (own page off, unpublished).
- Site design choices are fields on Practice details (header style, footer style,
  footer logo, badge row, logo shape, team cards, CTA photo). Review controls start
  from them; the address bar still overrides for review.
- **Pages list** (collection `site_pages`, defined in `src/data/page-settings.ts`):
  one record per template page plus "Template:" records for service pages, brand
  pages, team profiles, location pages and blog posts. Published = page on;
  unpublished = 404 (middleware), its menu links hidden, and switch-on links that
  depend on it hidden (Home "Read our story" needs About; "Read more reviews"
  needs Reviews; latest/recent posts need Blog and a post; Book buttons go to
  Contact when Book appointment is off). Each record holds the hero choice and
  that page's settings; every setting field shows on every record, so labels start
  with the page name. Settings feed the Review controls starting values
  (`s.bool`/`s.choice`/`heroFor` read the record first). A site without the
  Pages list treats every page as on.
- The `page-settings` plugin (`src/plugins/page-settings/`, registered in
  astro.config.mjs) gives every Pages-list setting field the widget
  `page-settings:scoped`, which shows the field only on the records that use it
  (looked up in page-settings.ts by field slug; the admin passes select choices,
  not widget options, to select fields). It finds the open record's slug from the
  admin address plus one API call; until then it shows the field.
- **Page text** (`src/data/page-text.json`, starting wording per page): hero
  headline/description, section headlines/descriptions, booking band and search
  description of the fixed pages, one named field each on the Pages list,
  labelled "<section> – Headline/Description" and shown only on its own record.
  Section labels above headlines ("eyebrows") are fixed text in the pages, not
  editable (Liz, 2026-10-16). Pages read text with `s.text("field")` /
  `s.paras("field")` (blank line = new paragraph); `{city}`, `{name}`,
  `{short}`, `{phone}` are filled in. The Pages list uses 83 of D1's 100
  columns per table; new page-wide fields beyond ~15 need another collection.
  Record pages (service, brand, location, profile, post) aren't in this yet.
- **Photos** (`Photo.astro` for plain slots): hero photo on each Pages record (Home
  16:9, others 3:2) and on Services, Brands and Offices (`photo` = exterior);
  community photo on the About record; team, booking-band and office-interior
  photos on Practice details. "Photo" hero with no photo: labelled placeholder
  while Review controls are on, the no-photo Light hero when they're off (live).
  The example photo (`/assets/photos`) is review-only: Review controls' "Example
  photo" hero, the sample article body and the sample video poster. The admin
  hides Pages photo fields on records they don't belong to via a style rule from
  the page-settings widget (`PAGE_PHOTO_FIELDS`).
- Changes to the Pages list only reach the main address after the version is
  promoted; the admin always edits the shared database, so a preview URL shows
  admin edits straight away.
- A site set up before menus or new fields were in the seed doesn't get them from
  the seed. Collections and fields: `npx tsx scripts/sync-schema.ts <site>` (dry
  run), then `--apply` (a new collection also gets the seed's records). Menus: `npx tsx scripts/menus-sql.ts > menus.sql`, then
  `npx wrangler d1 execute DB --remote --file menus.sql` (skips menus that exist).
  The CLI needs `npx emdash login --url <site>` once (an admin approves a code).
  Until a field exists the site uses the design default.
- D1 export fails on this database (FTS tables); take a Time Travel bookmark
  (`npx wrangler d1 time-travel info entheos-template-cms-db`) before SQL changes.
- Not yet in EmDash: page text (headings, intros, sections), reviews, service and
  profile body text.

## Working style
Build in the handoff's order and stop after each step for Liz's review. When the
design and the handoff disagree, ask before guessing.

## Commands
- `npm run dev` (local), `npm run build`
- Deploy: `npm run deploy` (learning account, demo, not a live site).
  Preview of a change without replacing the demo: `npx wrangler versions upload --tag <tag> --message "<what>"`.
