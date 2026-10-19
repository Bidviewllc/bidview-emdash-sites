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
- `src/pages/[...slug].astro`: a stand-in for pages not built yet (the sitemap).

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
- Collections: Practice details (pinned first in the admin sidebar: seed `sortOrder: 0`; on a live site `npx tsx scripts/pin-collections.ts <site> practice`, which keeps the Pages order) (one record, slug `main`: colours, wordmark,
  rating, memberships, Review controls switch, design choices; page-specific
  lists live on their page: Home "years", Services "first_visit", About
  "milestones"/"values", team photo on Shared sections, office interior photo
  on Page templates; moved 2026-10-16 with `scripts/move-practice-fields.ts`), Offices, Services, Hearing aid brands (models as a repeater),
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
- **Template pages** (defined in `src/data/page-settings.ts`; Liz chose this
  over a single Pages list on 2026-10-16): each fixed page is its own content type
  (`page_home`, `page_about`...; admin label "Home page" etc.) with one record,
  slug `main`, grouped in a "Pages" sidebar folder, so its screen shows only its
  own fields (no hiding add-on). Published = page on; unpublished = 404
  (middleware), its menu links hidden, and switch-on links that depend on it
  hidden (Home "Read our story" needs About; "Read more reviews" needs Reviews;
  latest/recent posts need Blog and a post; Book buttons go to Contact when Book
  appointment is off). A page type that doesn't exist counts as on with defaults.
  Each record holds the hero choice and photo, the page text and that page's
  settings, which feed the Review controls starting values (`s.bool`/`s.choice`/
  `heroFor` read the record first). "Page templates" (`page_templates`) holds
  settings for record pages (service/brand/location hero, service sidebar, profile
  video, post image). "Shared sections" (`shared_sections`) holds the shared
  booking band (headline, description, photo); each page with a band has
  "Booking band: Use the shared booking band / Customize for this page".
- **Page text** (`src/data/page-text.json`, starting wording per page): hero
  headline/description, section headlines/descriptions, booking band and search
  description, labelled "<section> – Headline/Description". Section labels above
  headlines ("eyebrows") are fixed text in the pages, not editable (Liz,
  2026-10-16). Pages read text with `s.text("field")` / `s.paras("field")`
  (blank line = new paragraph); `{city}`, `{name}`, `{short}`, `{phone}` are
  filled in (also `{email}`, `{address}`).
- **Body text** (2026-10-16): rich text renders through `src/lib/portable-text.ts`
  (our own renderer, so H2s get ids for the "Jump to"/table-of-contents lists and
  the blog's booking box can sit before the third H2). Services: `intro`,
  `content` (rich text), `sidebar_text`. Brands: `intro` (paragraphs),
  `models_intro`, `accessories_intro`, `older_intro`, `care_text`. Offices:
  `intro`, `directions`, `access_notes`. Team: `bio` (rich text), `video_url`
  (YouTube/Vimeo embed; with no link the sample player shows only in review mode).
  Blog posts: `content`. Legal pages: `body`. Starting wording lives in
  `src/data/content/*.md` (rich text, converted with EmDash's
  markdownToPortableText in the seed) and `record-text.json` (plain text, also the
  fallback when a field is empty). Empty rich text falls back to the old sample
  markup in the page.
- **Photos** (`Photo.astro` for plain slots): hero photo on each page record (Home
  16:9, others 3:2) and on Services, Brands and Offices (`photo` = exterior);
  community photo on the About page; team and office-interior photos on Practice
  details; booking band photo on Shared sections. "Photo" hero with no photo:
  labelled placeholder while Review controls are on, the no-photo Light hero when
  they're off (live). The example photo (`/assets/photos`) is review-only: Review
  controls' "Example photo" hero, the sample article body and the sample video
  poster.
- **Patient resource pages** (2026-10-16, not in the design boards; built from
  the Service detail patterns): `/patient-resources/<slug>` for resources with
  "Give this its own page" on (off = 404 and no "Learn more"). Hero
  with the topic tags → rich text (`content`; H2s make "Jump to") beside a
  sidebar (Forms card when "has_forms", booking card). Hero: the service pages' DetailHero (hero choice "Patient resource pages – Hero" on Page templates, photo = `hero_image` on the resource) → three more resources (same
  first topic first) → the shared booking band (`site.sharedBand`). Forms:
  `forms_pdf` (file) and `forms_url` (link) drive "Download PDF" / "Fill out
  online" (`FormButtons.astro`); a missing one shows as a placeholder only while
  reviewing. Sample text: `src/data/content/resource-body.md`.
- **Reviews** (2026-10-16): Google reviews live in the site's own D1 tables
  `reviews` / `review_meta` / `review_jobs`, the same schema Vince's
  `workers/reviews-sync` (on main) fills weekly; location key = office slug.
  `src/lib/reviews-reader.mjs` is a byte-identical copy of his canonical reader
  (his test checks copies; edit his, then copy). `site.ts` reads every office,
  drops text-less reviews and those below Practice details "Reviews: lowest star
  rating to show", and takes the rating and count from Google's totals. No synced
  reviews yet = the sample reviews. Offices have `google_place_id` (sync + the
  "Leave us a review" link). Admin screen: the `reviews` plugin
  (`src/plugins/reviews/`; Plugins → Reviews) lists every review with Hide/Show,
  via its routes `list` / `hide`, which use the D1 binding through
  `cloudflare:workers` env. Hidden stays hidden through syncs. The demo database
  has the sample reviews loaded (`node scripts/reviews-sample-sql.mjs`); the demo
  practice is fictional, so nothing syncs.
- Code changes only reach the main address after the version is promoted; the
  admin always edits the shared database, so a preview URL shows admin edits
  straight away.
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

## Step 3 (2026-10-16)
- Review hub `/review` (`src/pages/review/index.astro`): one card per page
  template (default view, hero versions, alternate states, the design boards' alt
  states, other records on the same template) and site-wide looks. Header and
  footer galleries `/review/headers`, `/review/footers` (`ReviewGallery.astro`:
  the home page in frames, cropped and scaled). All three exist only while Review
  controls are on. When a page gets a new Review controls switch, add it to the hub.
- Accessibility pass: rules at the end of `site.css`. Small links reach 48px with
  padding cancelled by a negative margin (crumbs, tel/mailto links, byline) or an
  invisible ::after (blog tag), so the look doesn't change. Checked with axe
  (WCAG A/AA), a 48px-target, 15px-text and sideways-scroll sweep and a Tab walk
  over every hub link at 390, 768 and 1440px. Known exceptions: the logo's
  "Hearing Center" line (logotype) and links inside sentences.

## Forms (2026-10-16)
- Built in the admin with EmDash's Forms plugin (`@emdash-cms/plugin-forms`):
  Plugins → Forms (fields, "Notify emails"), Plugins → Submissions (inbox).
  Two forms, slugs `contact` and `appointment-request`; a site gets them from
  `DEFAULT_FORMS` in `src/lib/forms.ts` the first time the page is viewed.
- The site draws them (`SiteForm.astro`: half-width pairs, pill check boxes, a
  `location` select filled with the offices) and takes submissions itself at
  `/api/form` (Liberty's handler lessons), writing into the plugin's storage so
  the inbox shows them. Checks: trap field, time on page, Turnstile if
  `TURNSTILE_SECRET` is set, spam words/links, Workers AI (binding `AI`).
  Failing ones are saved as Archived with the reason in "Spam check", never
  emailed, never dropped.
- Lead source: `src/scripts/referral.ts` (port of AudioHelp's Get Referrer v2.3)
  fills the hidden `referral_source` / `referral_detail` fields; `page_url` too.
  Keep the hidden fields on the forms.
- Email: Resend (key on Marketing & tracking, from noreply@bidview.net) to the
  form's Notify emails, else the Practice details email; hidden copy to the
  "Hidden copy" address (default local@bidviewmarketing.com).
- Lead source labels (Liz, 2026-10-16): paid = "PPC - Google / Microsoft /
  Display Ads / Meta Ads / Paid Social - X / Yelp Ads / Other Paid", newsletters
  = "Email"; Organic, LLM Search, Directory, Referral, Other, Direct as AudioHelp.

## Marketing & tracking (Admins only: Bidview and Entheos)
- Plugin `src/plugins/marketing` (routes need settings:manage); items in
  `src/data/marketing-items.ts`, stored in the D1 table `marketing_settings`
  (`src/lib/marketing.ts`), each with an on/off switch. Secrets (Resend key,
  Turnstile secret) are write-only and never reach a page.
- Live domain: tracking (GTM, GA4, Google Ads, Clarity, call tracking), custom
  code (head / body start / body end) and Turnstile run only when the request is
  on that domain (`Tracking.astro`). Empty = never (previews and the demo).
- Events: `click_phone_number` and `form_submit` (with lead_source) go to gtag
  or the dataLayer; optional Google Ads conversion on form sends.

## SEO (2026-10-16, Vince's rules in page-templates.md)
- Every page and record has EmDash's SEO panel (title, description, share image,
  canonical, hide from search). `Base.astro`: our `<title>` (panel title or the
  page's, practice name taken out then added once: `src/lib/seo.ts`), and
  EmDash's `<EmDashHead>` for the one set of meta/OG tags (plus Settings → SEO
  verification codes).
- Indexing only on the live domain (Marketing & tracking); previews, workers.dev
  and the demo are noindex. Thank-you, legal, review pages and errors always noindex.
- Structured data: `src/lib/schema.ts` (one office: MedicalBusiness site-wide;
  several: Organization + MedicalBusiness per location page; Service + FAQPage,
  Person, Brand + FAQPage, BlogPosting, BreadcrumbList; no rating schema; hours
  only when they parse). Practice details: NPI and extra profile links (sameAs).
- `/sitemap.xml` is ours (live, indexable pages only, panel-hidden ones out);
  EmDash's per-collection sitemaps return 404. robots.txt is EmDash's (Settings → SEO).

## Booking embed, maps, search (2026-10-16)
- Book appointment page record: "Scheduler embed code" (editors can paste it).
  Version A shows it; with no code, the labelled slot while reviewing and the
  request form on a live site.
- Maps: `MapEmbed.astro`, a keyless Google Map searched by practice name and
  address, so Google shows the business card (Liz chose this over the API key).
- Search: `/search` (EmDash full-text search over services, brands, posts,
  resources, plus team, offices and fixed pages by name; live pages only;
  noindex). The 404 search box posts there.

## Admin scripts
- `scripts/keep-draft.ts`: scripts that change live records use `saveKeepingDraft`,
  so someone's unpublished edits are never published by a script.

## Working style
Build in the handoff's order and stop after each step for Liz's review. When the
design and the handoff disagree, ask before guessing.

## Commands
- `npm run dev` (local), `npm run build`
- Deploy: `npm run deploy` (learning account, demo, not a live site).
  Preview of a change without replacing the demo: `npx wrangler versions upload --tag <tag> --message "<what>"`.
