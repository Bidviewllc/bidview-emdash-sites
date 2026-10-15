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
- A site set up before menus or new fields were in the seed doesn't get them from
  the seed. Menus: `npx tsx scripts/menus-sql.ts > menus.sql`, then
  `npx wrangler d1 execute DB --remote --file menus.sql` (skips menus that exist).
  Fields: add with the EmDash CLI after `npx emdash login --url <site>`. Until a
  field exists the site uses the design default.
- D1 export fails on this database (FTS tables); take a Time Travel bookmark
  (`npx wrangler d1 time-travel info entheos-template-cms-db`) before SQL changes.
- Not yet in EmDash: page-level switches and template-page publishing, reviews,
  service and profile body text.

## Working style
Build in the handoff's order and stop after each step for Liz's review. When the
design and the handoff disagree, ask before guessing.

## Commands
- `npm run dev` (local), `npm run build`
- Deploy: `npm run deploy` (learning account, demo, not a live site).
  Preview of a change without replacing the demo: `npx wrangler versions upload --tag <tag> --message "<what>"`.
