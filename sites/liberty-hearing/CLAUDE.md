# Liberty Hearing Center — emdash project

Audiology practice in College Station, TX. Converted from a hand-built static
HTML design build into an emdash/Astro site.

## Layout of this folder

```
liberty-hearing/
  _static-source/    the original static design build (REFERENCE ONLY, do not deploy)
  emdash/            the Astro/emdash app — this is the real project
  CLAUDE.md          this file
```

`_static-source/` is a snapshot of `sites/liberty-hearing-resources/` from branch
`liberty-hearing-static` in `Bidviewllc/bidview-emdash-sites` (commit `f7fdc8db`,
by Liz Wright). Liz maintains the original in
`TheCube/.vercel-deploy/liberty-hearing-resources/`, which deploys to
`https://liberty-hearing-resources.vercel.app` (NOT from the monorepo).
Keep it around for visual diffing; tell Liz if the design needs to change.

## Source of truth: the Cloudflare site (Vince, 2026-09-04)

**The Vercel demo is NO LONGER a constraint.** Vince: *"Dont worry about Vercel.
As long as the CF staging site is good."* `liberty-hearing.cameron-239.workers.dev`
is what matters now.

Earlier in this project I was told twice to match the demo byte-for-byte, and
several decisions were made ONLY to preserve that. Those reasons are now void —
see "Parity-driven decisions — REVIEWED, deliberately left as-is" below. Do not cite "demo parity"
as a reason to keep or revert anything from here on.

`_static-source/` and the Vercel demo remain useful as the *design reference*
(what the pages are meant to look like), not as a spec to match exactly.

## Decisions Vince made 2026-09-03 (do not change without asking)

1. **Track B — proper Astro components.** Shared header/footer components, one
   `.astro` file per page. Not raw-HTML `?raw` fragments.
2. **Admin UI only for the CMS.** Wire content into D1 collections so it is
   editable at `/_emdash/admin`. Do NOT add `createEditable()` in-page edit
   handles in this pass. (This is an exception to the "new emdash-native sites
   MUST have inline editing" policy — Vince chose admin-UI-only.)
3. **Homepage: keep the launch CTA (`#book`).** The design build had two
   competing sections behind a toggle; `#hearing-the-call` and both toggle
   buttons were REMOVED on conversion.
4. **Deploy target: monorepo** `Bidviewllc/bidview-emdash-sites` →
   `sites/liberty-hearing/`. Cameron D1/R2/worker **are now provisioned and the
   site is deployed** (see below) — but the code has **not** been committed to
   the monorepo yet. It currently lives only in this local folder, which is the
   same drift trap that bit Ontario (repo copy missing the live contact backend).

## Deployed — Cameron Cloudflare (2026-09-03)

| | |
| --- | --- |
| Worker | `liberty-hearing` |
| URL | https://liberty-hearing.cameron-239.workers.dev |
| Account | `239e9d015c7a3a39cdc2e9400312f553` (Cameron) |
| D1 | `liberty-hearing-db` — `c6fbfd7c-5c0f-42fc-9ff2-00dccd78892a` |
| R2 | `liberty-hearing-media` |
| KV SESSION | `028dfa4da881449cb1fcfb8ae46b6e2e` (shared) |
| Cron | `0 * * * *` (scaffold shipped `* * * * *` — dialled back to hourly) |
| Version | `5cce9935-9e53-4e73-af33-ba3f0d4cc775` |
| Secrets | `RESEND_API_KEY` set (Ontario's key — the workspace where `bidview.net` is verified). `LEAD_TO` and `TURNSTILE_SECRET` deliberately NOT set. |

Deploy: `npm run build && npx wrangler deploy` with `CLOUDFLARE_API_TOKEN`
(from `~/.claude/credentials/cloudflare-cameron-token.txt`) and
`CLOUDFLARE_ACCOUNT_ID` exported. No staging worker/D1/R2 exists — production
only, Vince's call.

**Verified live:** all 11 pages 200 with one `<h1>`, all assets 200, full
header/footer/main parity with the Vercel demo, page heights identical on all 11,
33/33 responsive combos clean, 0 broken images, modal + lightbox + hover + active
nav all working.

**emdash setup wizard has NOT been run** — `/_emdash/api/setup/status` returns
`500 NOT_CONFIGURED`, and D1 has emdash's 39 system tables but **0 collections
and 0 users**. The admin UI itself loads at `/_emdash/admin`. Someone needs to
complete the wizard there to create the admin user + collections.


**Two known third-party console flags — NOT site defects.** The QA sweep reports
6 items; both causes are understood and neither is worth chasing:
1. `/pricing/` — CORS failures against `gql.withcherry.com`. Cherry's *analytics*
   endpoint only ("Failed to track widget analytics event"). The estimator still
   renders. Verified.
2. `/assistive-listening-devices/` — aborted `prod.suno.tech` XHRs. These belong
   to `/book-appointment/`, which precedes it in the sweep's route list; the
   requests abort on navigation and the harness attributes them to the next page.
   That page contains **zero** Suno references (re-verified 2026-09-09).

## Current state (2026-09-03)

Phase 1 (local parity) is **done and verified**, and deployed. Phase 2 (CMS
wiring, contact form) is **not started**.

- 11 routes, all 200, all directory-style (`/about/`, not `/about`).
- `npm run build` passes. Baseline + converted both verified.

**Verified against the LIVE demo** (`liberty-hearing-resources.vercel.app`), not
just the local snapshot — the demo deploys from Liz's folder, so it can drift.
It had NOT drifted: content hashes match commit `f7fdc8db` on all 11 pages, and
the demo has exactly these 11 pages (no sitemap, no robots.txt; the 16 other nav
URLs 404 there too).

- **`<main>`, `<header>` and `<footer>` all match the live demo on all 11 pages**
  — same text, link sets, heading outline, tag census, element counts, `<details>`
  counts and contact-form fields.
- **Full-page render height is identical on all 11 pages** (e.g. home 10340px,
  phonak 10715px). Removing `#hearing-the-call` changed nothing visually because
  that section was `display:none` by default.
- Only intentional deltas: the removed `#hearing-the-call` section + its 2 toggle
  buttons (homepage dead-link count 65→64), and `/contact#request` →
  `/contact/#request` (required by `trailingSlash: "always"`; the demo's version
  would take a 301 hop).
- Titles/descriptions render byte-identical (`&amp;` in source is escaping only).
- 33 page/viewport combinations (390 / 768 / 1440) — **0 horizontal overflow,
  0 broken images, exactly one `<h1>` per page.**
- Header swap verified: `[data-hdrgrid]` hides and `[data-mobilebar]` shows at
  ≤1050px; reversed at 1440.
- Interactive JS verified with real browser clicks: SSNHL modal opens/closes
  (+ body scroll lock/unlock), photo lightbox opens/closes, 105 `style-hover`
  elements wired.

## Contact form (`src/pages/api/contact.ts`)

Follows the pattern proven on the other 9 Bidview sites, with their fixes folded in:

- `POST /api/contact`, honeypot (`website`), Turnstile (fail-open), server-side
  validation, spam filter, D1 backup, Resend email, `303 → /thank-you/`.
  `GET` → 405.
- **Body parsing is decoupled from response format.** A FormData POST carrying
  `Accept: application/json` is parsed as a form but answered with JSON. Keying
  both off content-type is what caused ABH's "Please check the form and try again".
- **D1 write happens BEFORE the email**, so no email failure can lose a lead.
- **The spam filter deliberately does NOT reject non-ASCII.** The onePHG sites
  do, and an em-dash silently swallowed a legitimate submission. Accented names
  are normal. It checks link count (≥2), spam keywords, BBCode, and 120+ char
  unbroken tokens.
- Required: `name`, `email`, `message` (enforced both in HTML and server-side).
  `phone` is optional — say if the clinic wants it required.
- **No visible required-field markers.** Deliberate: the demo has none and Vince
  asked for exact parity. Easy to add if wanted.
- Table: `contact_submissions (id, name, email, phone, extra, message, created_at)`
  — `extra` holds "Reason for visit: X | Preferred time of day: Y".

**Verified end-to-end on the live worker** (2026-09-03): GET→405; empty /
name-only / bad-email / empty-message all 400; honeypot and both spam cases
return a normal-looking 303 but write nothing; valid form POST → 303
`/thank-you/`; FormData+Accept:json → `200 {"ok":true}`; JSON body →
`200 {"ok":true}`; a **real browser click** landed on `/thank-you/` and wrote the
row with the correct select values. 4 QA rows confirmed in live D1, then deleted
(table back to 0).

**Test harness:** `scratchpad/formtest.mjs <base-url>` — runs all of the above.
Keep test messages **pure ASCII** and send a matching `Origin` header (Astro CSRF
rejects origin-less POSTs with 403). Always ALSO do a real browser click: a
direct POST cannot catch client-side JS that intercepts submit (the Roberts bug).

## Parity-driven decisions — REVIEWED, deliberately left as-is

These were originally chosen to match the Vercel demo. Parity was dropped
2026-09-04, so I put them back to Vince. **His call: leave them.**

> *"Just leave it for now. We will build those pages later."* (footers)
> *"We will work on them later. We will wait for client feedback."* (everything else)

**So: do NOT fix these on your own initiative.** They are known, raised, and
parked on purpose. The dead footer links stop being dead once the missing pages
are built — that is the intended fix, not rewriting the footers.
Also parked pending client feedback: required-field markers on the contact form,
deleting the unused scaffold blog routes, and WebP conversion of the 6 large
JPEGs.

For reference, what was raised:

1. **27 dead `href="#"` links in the footers.** (PARKED — pages coming later) `SiteFooter.astro` reproduces
   seven demo footer variants verbatim, dead links included (5 on inner/services,
   7 on aids). I had originally unified all pages onto the homepage footer, which
   removed every dead link; that was reverted for parity. Reinstating the unified
   footer fixes them and costs ~24px of height on 9 pages.
2. **No required-field markers on the contact form.** (PARKED — awaiting client) The three server-enforced
   fields (`name`, `email`, `message`) carry `required` but no visible `*`,
   because the demo has none.

NOT in scope of this: the ~604 dead `href="#"` links in the header mega-menu.
Those are pages that do not exist yet (Ear Wax Removal, brand pages, etc.) — a
content gap for Liz/the client, not a parity artefact.

## Online booking — Suno widget (`/book-appointment/`)

ClickUp **868k3k71a**. Suno (Carissa) supplied the embed; **Erika Haler is the
client POC**, Dr. Duhon CC'd her. Built 2026-09-04.

- Page: `src/pages/book-appointment/index.astro` — intro, the widget, then a
  location / hours / "prefer to ask first" row.
- Embed: `<div id="clinic-scheduler" data-token=… data-clinic="10083" …>` plus
  the Suno script, which **must be `is:inline` and must come after the div**.
- **This is a real booking system**, not a form — it loads Liberty's actual
  appointment types from clinic `10083` ("Cerumen (earwax) removal age 10+",
  "Hearing Aid Adjustment New Patient", "New Patient Hearing Test", 4 total)
  and writes real bookings. Unlike `/contact/`, it does not depend on `LEAD_TO`.
- **Colours:** `data-pc` = accent, `data-dc` = panel background. Suno's defaults
  were amber `#ffbf00` / teal `#a8e1df` — clashed badly. Now `a6192e`
  (`--brand-red`) / `f5f7fb` (`--surface`), Vince's call. Verified live: the
  selected radio computes to `rgb(166, 25, 46)`. **Change them in BOTH the
  `SUNO` const and the standalone fallback link** — same two params.
- Standalone fallback (used by `<noscript>` and the "trouble?" line):
  `https://scheduling.suno.care/?clinic=10083&token=…&pc=…&dc=…`

**16 booking CTAs repointed** from `/contact/#request` → `/book-appointment/`
across 9 page files + `SiteHeader.astro`. **Two links were deliberately NOT
repointed** because they are not booking CTAs:
  - `SiteHeader.astro` — "Can't find what you need? **Contact Us**" (mega-menu)
  - `phonak-hearing-aids` — jump-list item **05** "Learn more about Phonak"
    (items 01-04 are `#anchors`)

**This page and the repointed CTAs are an intentional deviation from the Vercel
demo** — the demo has no booking page and all its CTAs go to `/contact/#request`.
Do not "restore parity" on these. Liz should be told so her copy does not drift.

Verified live: page 200, widget renders in ~4s with brand-red accent, loads the
4 real appointment types, header CTA points here, canonical correct,
13 pages x 3 viewports clean.

## Homepage placeholder cleanup (2026-09-08)

Audited every placeholder on `/`. Four existed; three are now resolved.

**1. Map — was pointing at the WRONG PLACE.** The `#locations` map was a dashed
"Map embed" box. I first replaced it with an address query
(`?q=2405 Texas Ave S #307...`) — Vince spotted that it pins a spot about a mile
south near Southwest Pkwy, not the clinic. Now uses the Google Business Profile:

    https://maps.google.com/maps?cid=353508880098481867&z=16&output=embed

`cid=353508880098481867` = Liberty Hearing Center (from
https://maps.app.goo.gl/McGe4Xy3sr5UZcoHA, coords 30.6086065,-96.3098147).
**Do NOT swap this back to an address query — it geocodes wrong.**
The same fix was applied to **`/contact/`**, which had the identical bad query in
its map iframe *and* in both "Get directions" links (now
`https://maps.google.com/?cid=353508880098481867`). 4 references fixed in total.

**2. Blog section — hidden.** Lorem ipsum copy + empty "Article image" boxes.
Wrapped in `{SHOW_BLOG && (...)}` with `const SHOW_BLOG = false` in the
frontmatter. **Deliberately a build-time flag, not `display:none`** — the latter
would still ship the Lorem ipsum in the HTML for crawlers to read. Flip to `true`
when real articles exist. Nothing links to `#blog`, so no anchors broke. Page
height 10340 -> 9451; it now ends on "Serving Central Texas" -> footer, no gap.

**3. `#standards-band` — placeholder logo removed, three logos rebalanced.**
The dashed 4th "logo" box is gone. Two things worth keeping:
  - The container is **NOT `data-stack`** any more. With three logos that rule
    collapses to 2 columns at <=1080px and orphans NHCA bottom-left against a
    dead gap (verified — it looked broken). It is now
    `display:flex;flex-wrap:wrap;justify-content:space-around`, which keeps one
    row on desktop AND tablet and centres any wrapped row on mobile.
  - Heights are **deliberately unequal — 64 / 58 / 55px** for *optical* balance.
    Equal heights read badly: NHCA is huge caps and dominates, AAA is three small
    stacked lines and recedes. Measured luminance: AAA and NHCA are pure white
    (1.00), **ASHA ships grey (0.67)**, hence `filter:brightness(1.5)`.
    Don't "tidy" these to a single height.

**4. Testimonials — STILL Lorem ipsum.** 3 fake quotes ("Lorem I.", "Dolor S.",
"Amet C.") in `#testimonials`. Not touched — Vince has not said what to do with
them. Real Google reviews would be the natural fill.

QA: Codex (`gpt-5.5`) reviewed both changed files — **no findings**. Visually
checked at 1440/768/390 (map, band, page bottom) plus a live map screenshot
confirming the pin reads "Liberty Hearing Center". 13 pages x 3 viewports clean.

## Content build from the client copy doc (2026-09-08)

**Source:** `docs.google.com/document/d/1Z3-uVQaMj999m-LGSmAhEyRSvF9NuMQU3A6eHzdIdDE`
— publicly readable via `/export?format=txt` (420 KB, 37 page definitions).
Saved to `scratchpad/liberty-content.txt`.

**24 new pages built.** Scope was Vince's: only pages linked in the nav/footer
that had no dedicated page. Existing pages were NOT touched.

- Parser: `scratchpad/parse.py` (splits on `URL:`, classifies each line as
  heading / paragraph / bullet / FAQ question). H2 vs H3 is decided by
  Title-Case ratio (>=55% of words capitalised = H2).
- Generator: `scratchpad/gen-pages.py` -> `src/pages/<route>/index.astro`.
  **Re-run it rather than hand-editing a generated page.**
  Run it with `MSYS_NO_PATHCONV=1` or Git Bash mangles the `/slug` arguments.
- Layout: `src/components/ContentPage.astro`, following `/phonak-hearing-aids/`
  and `/hearing-evaluations/` (Vince's call) — intro band, then a `data-stack="2"`
  grid with a table-of-contents accordion + article on the left and a **sticky
  sidebar** on the right, then a CTA band.
- `Block` type lives in `src/lib/content-blocks.ts`, NOT in the .astro file —
  without a shared type the generated literals widen `t` to `string` and every
  page fails `astro check`.

**Brand page URLs follow the EXISTING convention** (`/oticon-hearing-aids/`,
`/widex-hearing-aids/`, ...) to match the live `/phonak-hearing-aids/`, not the
doc's `/hearing-aids/oticon`. Vince's call.

**62 nav/footer links repointed** (46 header — it duplicates every item for the
mobile menu — plus 16 across the footer variants). **Two are still `href="#"` on
purpose: "Community Resources" and "Accessories" — the doc has no copy for them.**

**Sidebars on the 3 pre-existing pages** (`hearing-evaluations`, `phonak-hearing-aids`,
`services`): the "Recent news" card was removed (3 dead links each) and the CTA
button repointed to `/book-appointment/`. Zero dead links remain in any `<aside>`.

**Bug Codex caught (real, was live):** `ContentPage` slugified H2 text into ids
with no collision handling, and the Oticon page genuinely repeats an H2 — so two
ToC entries jumped to the same heading. Ids are now de-duplicated with a counter
and empty slugs fall back to `section-N`. Verified live: Oticon has 22 unique
h2 ids and all 22 ToC links resolve.

**Testimonials: hidden, not filled.** Asked to pull them from GBP. Two
independent checks say it is not possible: the public Maps listing for
cid `353508880098481867` shows **no rating and no review count**, and the GBP MCP
reports Liberty is **not a managed business** in the BidView org (no owner
access). `libertyhearingcentertx.com` is a 3 KB placeholder with none either.
Inventing testimonials for a medical practice is not an option, so the section
sits behind `SHOW_TESTIMONIALS = false` in `src/pages/index.astro`.
**Vince confirmed 2026-09-08: "They dont have reviews. So just hide the review
section for now."** Flip the flag when real reviews exist.

**Out of scope** (in the doc, not linked in nav/footer): `/costco-hearing-aids`,
`/nano-hearing-aids`, `/walmart-hearing-aids`, `/privacy-policy`,
`/terms-of-service`.

Verified: `astro check` 0 errors across 55 files; all 24 pages 200 with one h1,
meta description and canonical; **37 pages x 3 viewports clean** (the only
flagged items were aborted Suno XHRs from `/book-appointment/` mis-attributed to
the next route by the harness — that page has no Suno reference at all).

## Favicon + Cherry financing widget (2026-09-08)

**Favicon — real set, replacing the `data:,` no-op.**
Generated from `public/assets/logo-color.webp` with Pillow. The full lockup is
too wide (784x465) — padded to a square it fills only ~56% and reads as a blob at
16px. **The crop is the eagle HEAD only** (right ~54% of the mark above the
wordmark), which is nearly square, fills the icon, and stays legible at 16px.
Files in `public/`: `favicon.ico` (16/32/48), `favicon.png` 192,
`apple-touch-icon.png` 180, `icon-512.png`. Linked from `Base.astro` with `?v=1`
— **bump that when the artwork changes**, favicons cache hard, often through a
hard refresh. To regenerate: crop `logo-color.webp` to the top 72%, tighten to
the alpha bbox, take the right ~54%, pad square at 1.04, export.

**Cherry patient-financing widget — on `/pricing/` only.**
Vendor snippet supplied by Vince, kept verbatim except for Astro's `is:inline`
on the script (without it Astro tries to bundle a third-party URL).
Sits at the end of `src/pages/pricing/index.astro`.

- It is a **floating estimator**, pinned bottom-right, so its position in the DOM
  is irrelevant. Cherry ignores the supplied `<div id="floatingEstimator">` and
  injects its own `div#widget-floatingEstimator-mount` at body level. That div is
  a 0-height static wrapper whose child is `position:fixed` — **do not measure
  the wrapper to decide whether the widget rendered** (I did, and wrongly
  concluded it was broken). Check for the text "Pay over time" instead.
- **Verified rendering live**: the pill shows "Pay over time — No hard credit
  checks / 0% APR options" bottom-right on the deployed pricing page.
- **Known noise:** the console logs CORS failures against `gql.withcherry.com`
  for the widget's *analytics* endpoint ("Failed to track widget analytics
  event"). The widget itself still works. Not worth chasing unless Cherry asks.
- Cherry's own written copy lives on `/insurance-billing/` (the doc has a Cherry
  section there). The pricing page had no Cherry text; only the widget was added.

## Blog, sitewide Cherry, link audit (2026-09-09)

**Cherry is now SITEWIDE** — moved out of `/pricing/` into `Base.astro` (it is a
floating popup, so it belongs everywhere). Verified present on a sample of pages.

**Two real blog posts** from `docs.google.com/document/d/1V6mxopq8l9VMOsfD7IYV2A82YlQu5-v6jNZihGadIXI`
(saved to `scratchpad/blog-content.txt`, generated by `scratchpad/gen-blog.py`):
`/hearing-aids-for-tinnitus/` and `/best-way-to-clean-ears/`. Same
`ContentPage` layout as the service pages.

**`/resources/` rebuilt.** The placeholder "Featured" section and all 9 dummy
"Article image" cards are gone, replaced by a 2-card grid of the real posts.
Images chosen from the existing photo set: `hearing-aids.jpg` (consultation) for
the tinnitus post, `hearing-test.jpg` (booth/headphones) for the ear-cleaning
post. **The homepage blog section stays hidden** — Vince: resources page only.

**Full-site crawl** (`scratchpad/crawl.mjs <base-url>`): **57 internal URLs, 0
broken, 0 redirects**; both external links (Google Maps, Suno standalone) 200.

**29 dead in-content links repointed.** These were design placeholders that only
became fixable once the 24 service pages existed — including **dead breadcrumb
"Home" links** on five pages. Fixed: 12 homepage "Learn more" links (each to its
matching service page), breadcrumbs, prev/next service and brand links, and
"Request an Appointment" CTAs.

Two of those 12 had no exact page and were mapped to the closest match —
**flag if you disagree**: "Musicians' Hearing Evaluations" ->
`/custom-hearing-protection-conservation/`, "Other Solutions" ->
`/assistive-listening-devices/`.

**Remaining `href="#"` is exactly 3 per page and all deliberate:** "Community
Resources" x2 (header) and "Accessories" x1 (footer) — no copy exists for either.
Plus 4 inside the hidden `SHOW_BLOG` block, which do not render.

## LAUNCH — libertyhearingcentertx.com (prepared, NOT executed)

Checked 2026-09-09. **Nothing has been cut over.**

| | |
| --- | --- |
| Zone | `libertyhearingcentertx.com` — **active, in Cameron's account** |
| Zone ID | `29b0ef015289c069adf2a13e05fb7184` |
| Nameservers | `brit.ns.cloudflare.com`, `harvey.ns.cloudflare.com` |
| Worker custom domains bound | **none yet** |
| Current state | apex **and** `www` both serve 200 through Cloudflare (the old placeholder site) |

### Exact DNS cutover list (zone read from the dashboard 2026-09-09)

> **ROLLBACK RECORD: `LAUNCH-ROLLBACK.md`** in this folder — the full pre-launch
> zone verbatim, public-DNS corroboration, the old site's fingerprint, worker
> version rollback points and step-by-step restore. Machine-readable snapshot:
> `dns-snapshot-prelaunch.json`. **Read it before touching DNS.**


The old site is **Squarespace** ("Coming Soon" placeholder). Full zone is 8 records:

**DELETE these 5 — all Squarespace, all proxied:**
| Name | Type | Value |
| --- | --- | --- |
| `libertyhearingcentertx.com` | A | `198.49.23.145` |
| `libertyhearingcentertx.com` | A | `198.185.159.144` |
| `libertyhearingcentertx.com` | A | `198.49.23.144` |
| `libertyhearingcentertx.com` | A | `198.185.159.145` |
| `www` | CNAME | `ext-sq.squarespace.com` |

**KEEP — do not touch:**
| Name | Type | Value | Why |
| --- | --- | --- | --- |
| `libertyhearingcentertx.com` | MX | `alt4.aspmx.l.google.com` (pri 10, DNS only) | **Google Workspace email** |
| `libertyhearingcentertx.com` | TXT | `google-site-verification=t07qIet...` | Google verification |

**Optional:** `_domainconnect` CNAME -> `_domainconnect.domains.squarespace.com`
is a Squarespace leftover. Harmless, affects neither web nor mail. Can be removed
once they are fully off Squarespace; **not required for the cutover.**

**NOTE — their email setup looks incomplete.** Only ONE MX exists
(`alt4.aspmx.l.google.com`, pri 10). Google Workspace normally publishes the
primary `aspmx.l.google.com` (pri 1) plus alt1-alt4, or the modern single
`smtp.google.com` (pri 1). Mail is presumably still delivering via alt4, but
there is no fallback. **Separate issue from the launch — do not "fix" it during
the cutover; raise it with Erika.**

**Gotcha:** public DNS reports `www` as an **A** record because Cloudflare
proxying flattens a proxied CNAME. In the dashboard it is a CNAME. Do not
conclude from a `dig`/DoH lookup that there is no CNAME.

**Blocker — same one as every previous launch:** the Cameron `cfat_` token can
manage `workers/domains` but **cannot read or edit DNS** (verified again:
`GET /zones/{id}/dns_records` -> 403). The Workers API refuses to bind a hostname
that still has a DNS record (`100117: already has externally managed DNS
records`). **Cameron must delete the existing apex + `www` records first** —
leaving MX / SPF / DKIM / DMARC alone, those are email.

Then, per the proven runbook:
```
PUT https://api.cloudflare.com/client/v4/accounts/239e9d015c7a3a39cdc2e9400312f553/workers/domains
{"zone_id":"29b0ef015289c069adf2a13e05fb7184",
 "hostname":"libertyhearingcentertx.com",   # then again for www.
 "service":"liberty-hearing","environment":"production"}
```
SSL auto-provisions in seconds. Then verify apex+www 200, correct titles, the
crawl clean, forms, and the Suno + Cherry widgets.

**Do before launch:** set `LEAD_TO` (contact form still emails nobody), get a
Turnstile keypair from Cameron, and decide on the 6 large JPEGs / JSON-LD schema
/ analytics, all still listed under "Still to do".

## How this project is put together

- **`src/layouts/Base.astro`** — head (title/description/canonical/OG/Twitter),
  fonts, `brand.css` + `global.css`, emdash's `EmDashHead`/`EmDashBodyStart`/
  `EmDashBodyEnd` hooks, `SiteHeader` + `SiteFooter`, and `site.js` at the end.
  The static build had NO canonical, OG, or Twitter tags — those are new.
- **`src/components/SiteHeader.astro`** — the 256-line header, identical on
  every page in the design. Takes `active="home|about|services|aids|resources|contact"`.
  **Active state is a CSS rule** (`[data-nav-active="x"] [data-navkey="x"]` in
  `global.css`), not an inline colour — that is how one component serves all 11 pages.
- **`src/components/SiteFooter.astro`** — the design ships **seven different
  footers** across the 11 pages (different taglines, column order, headings and
  links). All seven are reproduced **verbatim**, selected by a `variant` prop
  that `Base.astro` takes and each page passes:

  | variant | pages |
  | --- | --- |
  | `home` | `/` |
  | `inner` | about, hearing-evaluations, contact |
  | `services` | services |
  | `aids` | phonak-hearing-aids |
  | `pricing` | pricing |
  | `resources` | resources |
  | `staff` | dr-carly-hall, dr-chris-duhon, rocio-zarandona |

  **This deliberately preserves the design's 27 dead `href="#"` footer links**
  (5 on inner/services, 7 on aids). Vince's call 2026-09-03: exact parity with
  the Vercel demo beats fixing them. **Do not "fix" them without asking.**
  I had first unified all pages onto the homepage footer, which removed the dead
  links but made 9 pages ~24px taller and changed their link labels — that was
  reverted.
- **Layout is inline `style` attributes**, carried over from the design build.
  There are no layout classes. This is the main thing to refactor if these pages
  become templates. Responsive behaviour is data-attribute driven — see the
  header comment in `global.css`.

## Gotchas hit during this conversion — read before editing

- **`npm run build` and `npx wrangler deploy` MUST be chained with `&&`.** Run on
  separate lines, a failed build still lets `wrangler deploy` ship whatever stale
  `dist/` is lying around — which happened on 2026-09-03 and silently deployed a
  build without the fix I'd just made (I only caught it by fetching the live
  asset). The build fails with `dist/client: Device or resource busy` whenever a
  local `wrangler dev` is running, so kill it first. Verify a distinctive string
  in `dist/` before deploying, and re-fetch the live asset after.
- **Don't build verification regexes with `new RegExp(\`...[\\s\\S]...\`)`.** In
  these scripts a backslash level got eaten and the pattern compiled to `[sS]`,
  so `<main>` extraction returned an empty string and **every page compared as
  "identical"** — a false PASS that I reported before catching it. Use literal
  `/<main[^>]*>([\s\S]*?)<\/main>/`, and make any comparison script assert its
  extraction is non-empty before it is allowed to print "identical".
  Working audit scripts: `scratchpad/audit2.mjs` (4-way page audit) and
  `scratchpad/assets.mjs` (asset inventory).
- **NEVER set `trailingSlash: "always"` in `astro.config.mjs`.** I did, to match
  the design's `/about/` URLs, and it broke the deployed site in two
  non-obvious ways: **`/` returned 404**, and **every emdash route 404'd unless
  called with a trailing slash** (`/_emdash/admin` 404 but `/_emdash/admin/` 200;
  `/_emdash/api/setup/status` 404 but `.../status/` 200). The admin UI calls its
  own API without trailing slashes, so the entire admin was dead. It all looked
  fine locally under `wrangler dev`. **`build: { format: "directory" }` alone
  gives the `/about/` URLs and does not break anything** — both `/about` and
  `/about/` serve 200.
- **`emdash/CLAUDE.md` (the scaffold's own template doc) is WRONG for this
  project on two points.** It says to use `pnpm dev` — this project uses npm —
  and it tells you to "build page-specific styles in each Astro page's `<style>`
  block". That does not work here; see the next bullet.
- **Astro silently drops a page's inline `<style>` block here.** The homepage's
  `.lhc-urgent` / `.lhc-modal` CSS was extracted by Astro but **no stylesheet
  link was ever emitted** — `dist/_astro/` had no CSS at all and the urgent
  banner shipped unstyled. Fix: that CSS now lives in
  `public/assets/global.css`. **Do not put page CSS in an `.astro` `<style>`
  block in this project — put it in `global.css`.**
- **Scaffold dependency conflict.** `create-emdash` pins
  `wrangler ^4.124.0` + `@cloudflare/workers-types ^4`, but
  `@astrojs/cloudflare@14.2.6` needs `wrangler ^4.125.0`, and wrangler 4.128
  needs `@cloudflare/workers-types ^5`. Bumped both in `package.json`.
  Install with `npm install --ignore-scripts` (Windows rule).
- **Never `rm -rf node_modules/.vite` while `astro dev` is running.** It puts
  the dev server into a permanent 500 (`file does not exist at .vite/deps_ssr/...`)
  that still returns HTTP 200-shaped error pages. This silently invalidated a
  whole round of QA. Stop the server first (`npx astro dev stop`).
- **Do not QA through iframes or via `astro dev` under load.** Iframed pages
  came back with ~27-byte bodies, which made an overflow check report a false
  PASS. QA against the production build instead:
  `npm run build && npx wrangler dev --port 8788 --local`.
- **Playwright:** browsers are not downloaded on this box. Use
  `chromium.launch({ channel: 'chrome' })`. The install lives at
  `ontario-hearing-2.0/node_modules/playwright` and must be imported via
  `pathToFileURL(...)` (bare Windows paths break the ESM loader), then read
  `.chromium` off the module or its `.default`.
- `<img id="lightbox-img" src="">` is intentionally empty until a photo is
  clicked. Exclude it from broken-image checks — it is in the original design too.

## Still to do

**Blocking launch:**
- **LEAD_TO is not set, so no lead email is sent.** The form works and every
  lead is saved to D1, but nothing reaches a human inbox until someone sets the
  clinic's address. There is **no email address anywhere in the Liberty design
  or the branch** — it has to come from Vince/the client. Then:
  `npx wrangler secret put LEAD_TO` (or add it to `vars`) and redeploy is not
  even needed for a secret — the next request picks it up.
- **Turnstile is not enabled.** `TURNSTILE_SECRET` is unset and there is no site
  key, so the `.cf-turnstile` div on `/contact/` renders 0px and no widget
  script is loaded. Verification is **fail-open** by design, so leads still flow.
  Cameron's `cfat_` token **cannot create Turnstile widgets**
  (`POST /accounts/{id}/challenges/widgets` → 403, same permission gap as DNS
  and cache-purge) — ask Cameron for a keypair scoped to this hostname, then set
  `TURNSTILE_SECRET` and add the sitekey to the widget div. Until then the form
  relies on the honeypot + server-side spam filter.
- **CMS not wired.** No collections, no `emdash-env.d.ts` schema, no seed. All
  11 pages are hardcoded. Decision 2 above says admin-UI-only.
- **Scaffold starter routes still present** and unreviewed:
  `src/pages/404.astro`, `[slug].astro`, `category/[slug].astro`,
  `posts/index.astro`, `posts/[slug].astro`, `tag/[slug].astro`. They reference
  emdash collections that do not exist. Decide keep/delete with Vince.

**Content gaps in the design itself (Liz/client, not code):**
- **~24 nav links go to `#`** — the mega-menu promises pages that do not exist
  (Ear Wax Removal, Tinnitus Assessments, Cochlear Implants, 7 hearing-aid brand
  pages, Insurance & Billing, Community Resources, Giving Back, staff member
  "Nellie Minneman", etc.). ~48 dead links per page come from this header alone;
  604 across the site. **These are matched to the demo on purpose** — see the
  SiteFooter note above. They resolve when those pages get built.
- **Placeholder content on the homepage:** only the **3 Lorem ipsum
  testimonials** remain. The blog section is hidden, the map is real, and the
  empty "LOGO" trust badge is gone — see "Homepage placeholder cleanup" above.
- **Hours inconsistency to confirm:** homepage says Mon 7:00 AM–6:00 PM,
  Tue–Thu 8:30 AM–4:30 PM, Fri closed. Verify with the client.

**Performance / SEO:**
- 6 unoptimized JPEGs at 313–383 KB (`building-from-road.jpeg` 383 KB,
  `entrance.jpeg` 374 KB, `team.jpg` 371 KB, plus hearing-test, hearing-aids,
  reviewing-results). Convert to WebP before launch.
- No JSON-LD schema anywhere. `Base.astro` accepts a `schema` prop but no page
  passes one. An audiology practice wants `MedicalBusiness`/`LocalBusiness`.
- Google Fonts (Inter) loads from `fonts.googleapis.com` — self-host to drop the
  third-party request.
- No analytics.

## Commands

```bash
cd emdash
npm install --ignore-scripts
npm run dev                                   # http://127.0.0.1:4321
npm run build
npx wrangler dev --port 8788 --local          # QA the real build here

# static design reference for visual diffing
cd ../_static-source && python -m http.server 8899
```
