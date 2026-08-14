# Grant C. Meyer Homes — Project Notes

## Overview
Luxury real estate site for Grant C. Meyer, Incline Village / Lake Tahoe.
Stack: emdash (Cloudflare Workers + Astro + D1 + R2) — **not yet set up**, design phase only.

## ▶ emdash REBUILD — Phase 2 COMPLETE (2026-08-12): WHOLE SITE ported into emdash, live + verified
**Live on `https://gcm-homes-emdash.cameron-239.workers.dev`** (worker version `e36cd870`, 2026-08-12). Every page of
the prototype is now an emdash/Astro page; content text comes from emdash collections (proven editable: changing a
value in D1 changed the live page). **Full nav resolves, 0 broken links sitewide.** Pages:
- **Homepage** (`src/pages/index.astro`, `src/layouts/GcmLayout.astro`): full design + **live featured listings from
  D1**. Text = `homepage` collection (21 fields, entry id `home`).
- **Content pages** (`/buyers` `/sellers` `/concierge` `/about`): `src/components/ContentPage.astro` + thin route
  files, text = `page_content` collection (title = friendly name, `headline` field = H1, eyebrow/lead + 4 cards), 4
  entries. All render from CMS.
- **Community page** (`/community/`, `src/pages/community.astro`): all 9 sections ported — hero, lake-facts strip,
  **Leaflet neighborhood map (Liz's `/map/` iframe)**, things-to-do, schools, history, living-here (native
  `<details>` accordion), **live featured (top 3 from D1)**, CTA. Section copy is currently static in the .astro
  (constants); the map's popup "Explore" postMessages `gotoNeighborhood` → an inline listener navigates to the
  sub-page. Verified in browser: all sections render, map polygons load, 0 console errors.
- **Neighborhood sub-pages** (`/neighborhood/[slug]/`, 15 areas): **owner-editable copy** (overview, Grant's Take,
  hero subhead, tag) from the new **`neighborhoods` collection** (7 fields + title, 15 entries, editable in admin) +
  **live "Homes for Sale in <area>" matched by point-in-polygon** (listing lat/lng vs traced GeoJSON, `src/lib/
  neighborhoods.ts` + `nbgeo.json`). Verified all 15 render 200 with live counts (central 40, ski-way 20, champ-golf
  17, lower-tyner 15, eastern-slope 12, woods/mtn-golf 11, crystal-bay 10, mill-creek/jennifer/ponderosa 7-9,
  upper-tyner 5, lakeview 4, lakefront 3, apollo 2). Crystal Bay = bespoke copy; the other 14 use seeded generic
  overview/take the owner can rewrite. **This satisfies half the "both editable" request (neighborhood/location
  descriptions).**
- **Listings hub** (`/listings/`): prototype `listings.html` served from `public/listings/index.html` — 205 listings,
  search/filters/Leaflet map. Reads `/api/listings`. Verified: 205 cards, 20 map clusters, 0 broken imgs.
- **Detail pages** (`/homes/:city/:address/`, `src/pages/homes/[...slug].astro`): serves `src/detail-page.html`,
  reads `/api/listing-by-slug/:slug`. Verified 200 with photo galleries.
- **Contact page** (`/contact/`, `src/pages/contact.astro`): ported inquiry form — target of every INQUIRE NOW / Ask
  Grant CTA. **Submission is front-end-only right now (confirmation message, no backend)** — wiring to D1 + Resend
  (like onePHG/Ontario) is still open (needs a verified sender for Grant's domain). Fixed the broken `/contact/` link.
- **API routes** (`src/pages/api/`): `listings.ts` (→ `{count,listings}`), `listing-by-slug/[...slug].ts`
  (→ `{listing,photos}`), backed by `src/lib/listings.ts` reading D1 via `import { env } from "cloudflare:workers"`.
- **Every text field is inline-editable** (`{...entry.edit.field}` + GcmLayout passes the `content` ref) — lights up
  once logged into admin.
- **Design assets** copied to `emdash/public/` (styles.css + assets); fonts loaded in GcmLayout.

**Reusable seeding pipeline (KEY — how to add/update CMS content):**
1. Edit collections + content in `emdash/seed/seed.json` (collections[] + content{slug:[entries]}).
2. `cd emdash && CF_API_TOKEN=<cameron> node seed/push-collections.mjs` → writes them into the REMOTE D1's
   `_emdash_collections`/`_emdash_fields`/`ec_<slug>` tables (skips pages/posts; idempotent). Mirrors the Ontario
   generate-setup approach; matches emdash's exact schema.
3. `npx wrangler deploy` the Astro pages that render them.

**Gotchas learned this phase:**
- **Redeploy does NOT re-seed** — emdash applies `seed.json` only at first-time setup (`needsSetup` gate). Adding a
  collection to seed.json + redeploy does nothing to the live DB. Use `push-collections.mjs` (above).
- **Astro 6 removed `Astro.locals.runtime.env`** — access Cloudflare bindings via `import { env } from
  "cloudflare:workers"` (e.g. `env.DB` for the listings query). This is how pages read the D1 listings tables.
- **`live.config.ts` uses ONE generic `_emdash` loader** (emdashLoader) — no per-collection registration needed
  (unlike older estate sites). New collections just work once in the DB.
- Install: `npm install --ignore-scripts --legacy-peer-deps`.

**Seeding note:** `push-collections.mjs` now pushes 3 collections — `homepage` (21f/1), `page_content` (11f/4),
`neighborhoods` (7f/15). Re-run after any seed.json edit. `nbgeo.json` (server-side GeoJSON for point-in-polygon)
is extracted from `public/js/neighborhoods-geo.js` — re-extract if the map polygons change.

### 2026-08-13 — Per-listing owner notes DONE (the 2nd half of "both editable")
Owner can add a private per-listing note/blurb ("A Note From Grant") that **survives every Trestle sync** — verified.
- **Storage = separate `listing_notes` table** (`listing_key PK, note, updated_at`) in `gcm-homes-db`, keyed by the
  listing's **ResourceRecordKey/id** (NOT slug — survives address/slug changes). **Survival is by construction:** the
  sync only writes `listings`/`listing_photos`/`sync_meta` (it does `DELETE FROM listings` + `INSERT OR REPLACE`) and
  **never references `listing_notes`**. Verified: captured a listings row, deleted+reinserted it (the sync's exact
  op), note stayed attached and the API still served it. So no "sync clobbers owner columns" risk — notes live in a
  table the sync can't see.
- **Editing = inline on the detail page**, gated on a logged-in emdash admin. `src/pages/api/listing-by-slug/[...slug]`
  returns `canEdit = !!Astro.locals.user` (emdash's auth middleware sets `locals.user` from the session cookie; it
  also downgrades that response to `Cache-Control: private,no-store` so an admin's editable view never gets cached for
  anonymous visitors). The detail page (`src/detail-page.html`) reads `canEdit`: shows a read-only "A Note From Grant"
  block to everyone when a note exists, and an **Edit/Add → textarea → Save** editor only when `canEdit`.
- **Save route** `src/pages/api/listing-note.ts` — POST is **401 unless `locals.user`** (verified), body `{slug,note}`,
  resolves slug→id (`keyForSlug`) then upserts (`setNote`; empty note → DELETE row). `src/lib/listings.ts` gained
  `getNote`/`setNote`/`keyForSlug`; `bySlug` now returns `listing.ownerNote`, `allActive` LEFT JOINs the note (cards
  could surface a "Grant's note" flag later — not rendered on cards yet).
- **emdash auth note:** `enforceTokenScope` (auth middleware) only guards emdash's own API prefixes and no-ops when
  there's no bearer token, so custom `/api/*` routes are free to use `locals.user` for session gating.
- **Verified (programmatic, all PASS):** note stored + returned by API (text matches), anon `canEdit:false` (no editor
  leaks), unauth POST → **401**, GET `/api/listing-note?slug=` returns note, note **survived** the sync-sim, deployed
  detail page contains the CSS + editor + `saveNote()` + posts to `/api/listing-note`. Cache/version `91d5628a`.
- **NOT visually verified by me** — chrome-devtools was locked to Vince's already-open (admin-logged-in) Chrome; I
  won't kill his session. **Vince's 30-sec browser test:** open `…/homes/glenbrook-nv/777-rodeo-drive/` (I seeded a
  DEMO note there) → you should see "A Note From Grant" + an **Edit note** button (because you're logged in) → edit +
  Save → reload → it persists. Clear the demo by saving an empty note. (777 Rodeo Drive = the $125M flagship; the note
  shows on the detail page only, not on cards.)

### 2026-08-13 — Listing DESCRIPTION editable IN THE ADMIN BACKEND (ec_listings = override source of truth)
Vince: "I still don't see the description box on the listing on the backend"
(…/_emdash/admin/content/listings/1103321136). Right — the `listings` mirror collection had price/beds/note but **no
`description` field**, so no box. And just adding the box isn't enough — an edit has to persist + show on the site.
**Re-architected so `ec_listings` is the single source of truth for the two owner overrides (`description` +
`owner_note`)**, edited from EITHER the admin backend OR the inline detail-page editor, both landing on the same row.
- **Collection fields split:** `MLS_FIELDS` (city/price/beds/… — refreshed from the feed every sync, display-only) vs
  `OWNER_FIELDS` (`description` "overrides the MLS remarks", `owner_note`). `description` is now a registered field →
  **the box shows in the admin.**
- **Sync mirror now PRESERVES owner columns** (was DELETE+INSERT which wiped them): new listings INSERT (overrides
  NULL); existing listings `ON CONFLICT(id) DO UPDATE` set **only MLS columns** (+slug/title/updated_at), leaving
  `description`/`owner_note`/`status`/`version`/revision pointers untouched; removed listings `DELETE … WHERE id NOT IN`.
  Applied to `seed/mirror-listings.mjs` + BOTH sync paths (`vercel/api/sync.js` redeployed, `cf-worker/sync/sync.mjs`).
- **Site + inline editor now read/write `ec_listings`** (`lib/listings.ts`): `getOverride`/`setNote`/`setDescription`
  hit `ec_listings.owner_note`/`.description` by id (was the separate `listing_notes` table). `bySlug` returns effective
  `description` (override||MLS), `descriptionOverride`, `mlsDescription`; `allActive` LEFT JOINs `ec_listings`.
- **Migrated** old `listing_notes` rows → `ec_listings` (COALESCE, no clobber). **`listing_notes` is now ORPHANED**
  (nothing reads/writes it) — left in place as a backup; safe to drop later.
- **Verified end-to-end (all PASS):** description field registered; site shows 1205 Douglas Fir's migrated override
  with MLS preserved underneath; an admin-style write to `ec_listings.description` **showed on the site**; ran the real
  preserve-mirror → 1205 desc + 777 note **survived** while MLS price still refreshed; unauth POST → **401**.
  Cache/version `b6ddd2a4`.
- **NOT clicked in the authed admin by me** (browser locked to Vince's passkey session). **Vince's test:**
  hard-refresh `/_emdash/admin`, open any listing → you'll now see a **Description** field (+ Note From Grant) → edit +
  Save → it shows on the public listing page AND survives the next sync. (MLS fields like price are display-only —
  editing them is refreshed away by the sync; that's expected.)
- **Two ways to edit the same thing:** admin backend (this) OR inline on the listing page (the "Edit description" /
  "Reset to MLS" editor). Both write `ec_listings`, so they stay consistent.

#### Follow-up: Description is now a WYSIWYG (Portable Text) in the admin
Vince: "the description box should be a WYSIWYG in the backend." emdash's only rich-text field type is
**`portableText`** (stored as JSON, ProseMirror WYSIWYG — same as the Pages "content" field). Switched the `description`
field to it.
- **`src/lib/portabletext.ts` (new):** `plainToPortableText(plain)` (deterministic keys b0/s0… so description and the
  MLS snapshot stay byte-identical for track-until-edited) + `portableTextToHtml(pt)` — a compact serializer (p, h1–h6,
  blockquote, ul/ol, strong/em/underline/code, links; falls back to `<p>` for any non-JSON legacy value). emdash ships
  NO PT→HTML renderer, so we render it ourselves. Verified against rich PT (headings + bold + bullet list + link).
- **Field registration:** `description` → `type=portableText, column_type=json` (the mirror's `FIELD_TYPE(slug)` special-
  cases it; everything else stays `string`). This is what makes the admin show the **WYSIWYG editor**.
- **Storage:** `description` + the `mls_description` snapshot are now **Portable Text JSON**. The sync/mirror build PT
  from the MLS remarks via `ptFromPlain()` (added to `mirror-listings.mjs` + both sync files) with the same
  deterministic keys, so unedited listings still compare equal and track the feed. Migrated all 207 existing rows
  (plain → PT); the 1 remaining plain override was converted.
- **Site rendering:** `lib/listings.ts` `bySlug` now returns `descriptionHtml` (serialized) + `descriptionIsCustom`
  (PT JSON differs from snapshot). `detail-page.html` injects `descriptionHtml` as rich HTML (styled: h3/ul/blockquote/
  strong/links) and — since editing moved to the backend WYSIWYG — the **inline description editor was removed**; admins
  now get an "Edit description in the backend →" link to `/_emdash/admin/content/listings/{id}`. The **owner-note** inline
  editor stays (note is plain text).
- **Verified (all PASS):** description field type = portableText/json; all 207 rows valid PT; unedited listing renders
  rich `<p>` HTML, `isCustom:false`; a simulated rich admin edit (h3 + **bold** + bullet list) rendered correctly on the
  live site as `<h3>…<strong>…</strong>…<ul><li>…`, `isCustom:true`; detail page carries the rich CSS + reads
  `descriptionHtml`. Cache/version `46926f13`. Left a **rich demo** on 1205 Douglas Fir.
- **NOT clicked in the admin by me** (browser locked). **Vince's test:** hard-refresh `/_emdash/admin`, open a listing →
  Description is now a **rich-text editor** pre-filled with the MLS remarks → format it (bold, headings, lists) → Save →
  it renders formatted on the public listing page. (Same emdash WYSIWYG as the Pages "content" field, so it will render.)

#### FIX: "mls_description: unknown field on collection 'listings'" on save
Saving a listing in the admin errored because `mls_description` was a real COLUMN in `ec_listings` but not a registered
field — emdash's save validator (`validation-BsVUJfsP.mjs`) flags any submitted key that isn't a known field. Same class
as the earlier `title` bug. **Fix: emdash's validator SKIPS any key starting with `_`** (its internal-field convention) —
so renamed the hidden snapshot column `mls_description` → **`_mls_description`** (`ALTER TABLE … RENAME COLUMN`, data
preserved). Updated all refs: `mirror-listings.mjs`, both sync files, and `lib/listings.ts` (`getOverride` selects
`"_mls_description" AS mls_description`; reset uses it). Verified: **0 unregistered non-`_` columns remain** (the exact
set emdash would flag), site still renders (rich demo + unedited), all 207 snapshots intact. Cache/version `2455eadf`.
**Lesson: any internal ec_ column that isn't a registered editable field MUST be `_`-prefixed, or emdash rejects saves.**

#### Earlier: Description box PRE-FILLED with the MLS text + "track until edited"
Vince: "I see description — but it should have the existing/default value from the listing so I can edit." Right — the
box was blank (override NULL). Now `ec_listings.description` is **pre-filled with the MLS remarks**, and a hidden
`mls_description` snapshot column drives **track-until-edited**:
- **New/unedited listing:** `description == mls_description == MLS remarks` → box shows the MLS text; every sync keeps it
  following the feed (so unedited descriptions never go stale).
- **Once edited** (admin or inline): `description` diverges from `mls_description` → the sync's `ON CONFLICT DO UPDATE`
  uses `description = CASE WHEN description IS mls_description THEN <new MLS> ELSE <keep owner text> END`, so the owner
  copy is preserved while `mls_description` still refreshes.
- **Reset** (inline "Reset to MLS", or an empty save) sets `description = mls_description` → tracking resumes.
- **`mls_description` is NOT a registered field** (hidden internal column) — the admin only shows the editable
  `Description`. `lib/listings.ts`: `getOverride` returns `{note, description, mlsDescription, isOverride}`; `bySlug`
  effective = `description ?? mls`; `descriptionOverride` = only when `description !== mls_description`. Inline editor's
  "✎ Custom" flag now keys on `isOverride` (not mere presence, since it's always populated).
- Applied to `mirror-listings.mjs` + both sync files; pre-filled all 206 existing listings (1 has no MLS remarks).
- **Verified (all PASS):** unedited listing box pre-filled + effective==MLS + no override flag; 1205 override differs;
  admin-style edit → shows custom + flagged; **ran the real mirror → edited (321 Ski Way test + 1205) preserved as
  custom, MLS still refreshed**; reset returns to tracking. Cache/version `0fc380ec`.

### 2026-08-13 — FIX: admin "save failed — unknown field on collection" (missing `title` field)
Vince tried editing a Neighborhood in `/_emdash/admin` → **"save failed. Unknown field on collection neighborhoods."**
Root cause: emdash's save validator (`validation-BsVUJfsP.mjs` `validateContentData`) builds `knownFields` from the
collection's registered `_emdash_fields` and **rejects any submitted key not in that set**. emdash's editor ALWAYS
submits a `title` value, but my directly-registered collections (via `push-collections.mjs` / `mirror-listings.mjs`)
**never registered `title`** as a field (I'd treated it as "base column only"). So every save failed. The default
`pages`/`posts` collections DO register `title` (`type=string, column_type=TEXT, required=1, sort_order=0`) — that's
the template. Field *types* were fine (`string`/`text` are valid; defaults use them).
- **Fix (permanent, in both tools):** register `title` first on every collection (skip it in the field loop so it's
  never double-registered; it maps to the base `title` column — no duplicate ec_ column). Also set the `listings`
  collection `supports` to `["revisions"]` (was `[]`, unlike the working collections).
- **Re-applied to live D1:** `node seed/push-collections.mjs` (homepage/page_content/neighborhoods) +
  `node seed/mirror-listings.mjs` (listings).
- **Verified deterministically vs emdash's real validation:** for all 4 collections — `title` registered ✓, every
  registered field resolves to an ec_ column ✓, and the exact `knownFields` check (editor submits `{title,...fields}`)
  passes with **0 unknown fields** ✓ → all SAVEABLE. **Could NOT click Save in the authed admin myself** (browser
  locked to Vince's passkey session), so **Vince must retry** the neighborhood edit to confirm end-to-end. **The admin
  React app caches the schema — hard-refresh `/_emdash/admin` first** so it re-reads the new field registration.
- **Listings caveat (unchanged):** the `listings` collection is a **browse mirror** — its MLS fields (price/beds/…) are
  rebuilt from the feed every sync, so editing them in the admin is overwritten and won't reflect on the site. The
  editable-and-persistent listing content is the **description override + owner note**, edited **inline on the listing
  page** (survives sync). If Vince wants those editable from the admin too, it needs a bigger refactor (make the site
  read overrides from ec_listings + preserve those columns across the sync mirror) — flagged, not yet done.

### 2026-08-13 — Editable listing DESCRIPTIONS (owner override, survives sync)
Vince: "I can't edit the description" (the MLS `PublicRemarks`, e.g. /homes/reno-nv/1205-douglas-fir-drive). Right —
it's fed from Trestle and re-synced daily, so there was no edit path. Fixed with the SAME override pattern as notes.
- **Storage:** added a `description` column to the `listing_notes` table (now the per-listing OVERRIDE store: `note`
  + `description`, keyed by listing id). Survives every sync (sync never writes this table). Row auto-deletes when both
  columns are null.
- **Behavior:** a saved description **REPLACES** the MLS remarks on the listing page; an **empty save reverts** to the
  live MLS text ("Reset to MLS" button). `lib/listings.ts` `bySlug` now returns `listing.description` (effective =
  override||MLS), `descriptionOverride` (the override or null), and `mlsDescription` (original) so the editor can show
  a "✎ Custom description" flag + reset.
- **`lib/listings.ts`:** `getOverride`→`{note,description}`, `setNote`/`setDescription` (per-column upsert via a shared
  `setField`; empty clears + drops empty rows). `getNote` now delegates to `getOverride`.
- **API `/api/listing-note.ts`** generalized: POST body `{slug, note?, description?}` updates whichever field(s) are
  sent (still **401 unless `locals.user`**); GET returns `{note, description}`. Backward-compatible with the note-only
  callers.
- **Detail page** (`detail-page.html`): the description `<p>` is now an editable `.prop-desc` block — read-only text for
  visitors; when admin, an **Edit description → textarea → Save / Cancel / Reset to MLS** editor (`saveDesc`/`resetDesc`
  → POST `{slug, description}`). Renders line breaks via `noteToHtml`.
- **Verified (programmatic, all PASS):** set override → effective desc == override, `mlsDescription` preserved, anon
  `canEdit:false`; unauth POST → **401**; override **survived** a delete+reinsert sync-sim; empty save **reverts to MLS**
  + clears the row; deployed page has `saveDesc`/`resetDesc`/`prop-desc` editor. Cache/version `7f736bf3`.
- **⚠️ Tradeoff to know:** an override is a REPLACEMENT — once set, later MLS remark changes won't show until you "Reset
  to MLS". (Notes are additive; descriptions replace.)
- **NOT visually confirmed by me** (browser locked to Vince's session). **DEMO left live:** /homes/reno-nv/
  1205-douglas-fir-drive has a seeded description override ("…[Grant's edited copy]") — Vince (logged in) will see the
  custom text + "Edit description" + "Reset to MLS". Reset it to restore the MLS remarks.

### 2026-08-13 — Listings now BROWSABLE in the emdash backend (mirror collection)
Vince: "I don't see [the properties] on the backend." Right — listings live in the synced `listings` table, NOT an
emdash collection, so they never showed in `/_emdash/admin`. Fixed by **mirroring** them into an emdash `listings`
collection (his earlier "listings as custom post types" idea), read-only by nature.
- **`emdash/seed/mirror-listings.mjs`** (new, reusable) registers a `listings` collection (`_emdash_collections` +
  15 `_emdash_fields`, `url_pattern=NULL` so it's **backend-only** — the public `/homes/:slug` route is untouched) and
  rebuilds `ec_listings` from `listings LEFT JOIN listing_notes`. `title`=address, `status`='published' (so they show,
  not as drafts), MLS status → custom `mls_status` field, price/sqft display-formatted, `owner_note` surfaced from the
  overlay. Full replace (removed listings drop out). Run: `CF_API_TOKEN=<cameron> node seed/mirror-listings.mjs`.
- **Populated now: 206→207 entries, all published**, browsable in admin (address as title, price/beds/baths/MLS
  status/slug/note per row). **NOT visually confirmed in the admin UI** (browser locked to Vince's session) — Vince:
  refresh `/_emdash/admin`, you should see a **Listings** collection with ~207 entries.
- **MLS fields are NOT hand-editable** — they're refreshed from the feed every sync (the MLS is source of truth). The
  ONE editable overlay is the per-listing "Note From Grant" (edit inline on the detail page; it shows here as
  `owner_note` for reference). Editing MLS fields in admin would be overwritten on the next sync — expected.
- **Stays fresh automatically:** added a non-fatal `mirrorEmdashListings()` step to BOTH sync paths — `trestle-test/
  vercel/api/sync.js` (the daily-cron host, redeployed) and `cf-worker/sync/sync.mjs` (manual). Runs after the
  `listings` write, full-rebuilds `ec_listings`. **Verified end-to-end:** triggered a real sync →
  `{listings:207, photos:7005, mirrored:207}`; `ec_listings`=207; and the 777 Rodeo Drive owner note **survived the
  real sync** (still in `listing_notes`, still in the mirror, still served by the detail API). Non-fatal by design — a
  mirror error never breaks the core sync.
- **Note:** `mirror-listings.mjs` must be run ONCE to register the collection/table (done). The sync steps only keep
  ROWS fresh (they assume the table exists). If the D1 is ever rebuilt from scratch, run mirror-listings.mjs again.

### 2026-08-13 — Contact form backend DONE (D1 + Resend), all forms wired
Every inquiry form now saves to D1 **and** emails via Resend. Modeled on the Ontario/onePHG handler.
- **`src/pages/api/contact.ts`** — POST: honeypot (`website`), optional Turnstile (fail-open, only enforced if a
  secret+token present — none set yet), saves to D1 `contact_submissions` (id,name,email,phone,extra,message,
  created_at), emails via Resend. **Email is best-effort — if Resend fails the lead is still in D1.** GET → 405,
  empty/invalid → 400 JSON, valid → `{ok:true}` (AJAX) or 303 (native). Accepts JSON or FormData; returns JSON when
  `Content-Type` OR `Accept` is json.
- **Sender:** `Grant C. Meyer Homes <noreply@bidview.net>` (bidview.net verified on Resend). **Reply-To = the
  visitor** (Grant replies straight to them). **BCC `local@bidviewmarketing.com`** (hidden monitoring copy).
- **Resend key = worker SECRET `RESEND_API_KEY`** (set via `wrangler secret put`, value = the shared bidview key
  the shared bidview.net-verified key, same one Ontario uses — see `~/.claude/credentials/resend.md`). NOT in wrangler.jsonc.
- **⚠️ LEAD DESTINATION IS A PLACEHOLDER.** `LEAD_TO` is a wrangler.jsonc **var**, currently
  `local@bidviewmarketing.com` (bidview monitoring, so nothing is lost). **Vince must SWAP it for Grant's real inbox**
  once confirmed, then redeploy. The prototype showed `grant@meyerhomes.com` but that's a design placeholder — not
  confirmed real. (Handler falls back to the monitoring address if the var is unset.)
- **Forms wired (2):** `/contact/` (`contact.astro` — `action="/api/contact"`, honeypot, AJAX submit → stays on page,
  shows "✓ Thanks — Grant will be in touch"); the listing **detail page** "Schedule a Private Showing" form
  (`detail-page.html` — was totally dead, no name attrs / no handler; now `submitListingInquiry()` POSTs to
  `/api/contact` with `reason="Listing inquiry: <address>"` so Grant sees which property). The homepage/community/
  neighborhood "INQUIRE NOW" CTAs all just link to `/contact/` (no form of their own) — covered.
- **Verified end-to-end (all PASS):** GET→405; empty POST→400; honeypot POST→200 `{ok:true}` **not saved** (0 rows);
  valid POST→200 `{ok:true}` + **row saved to D1** (name/email/phone/extra/message correct) + **no "Resend send
  failed" in worker tail** (Resend accepted the send). All QA rows deleted from D1. `hasDB:true, hasResend:true`
  confirmed via a temporary `?debug=1` path (since removed).
- **GOTCHA fixed:** first cut saved 0 rows silently — an `undefined` bind param (missing phone) threw a swallowed
  `D1_TYPE_ERROR`. Fix: guard every bind value with `|| ""`. The catch now also logs `err.message`.
- **Turnstile NOT added** (no spam yet; the estate sites only added it after a spam flood). The handler already
  supports it — set `TURNSTILE_SECRET` secret + add the widget + sitekey to the forms if spam appears.
- Cache/version `0bae9347`.

**STILL OPEN (Phase 2 follow-ups, in priority order):**
1. **Set `LEAD_TO` to Grant's real email** (currently the bidview monitoring inbox) — needs Grant's address from Vince,
   then `npx wrangler deploy`. One-line change in `wrangler.jsonc` vars. **← trivial, just needs the address.**
3. **GitHub Actions incremental sync** — Trestle `ModificationTimestamp` incremental poll → D1 (deferred until pages
   done — pages are now done). Currently sync is the Vercel daily cron (`/api/sync`, 15:00 UTC) only.
4. **Community section copy → editable** — the 9-section community page text (things-to-do, history, schools, living-
   here) is still static constants in `community.astro`. Wire to a `community` singleton collection if the client
   wants to edit it (they asked for "text on other pages" editable — neighborhoods done, community body not yet).
5. **Blog** — scope TBD (client wants blog posts; emdash `posts` collection is available).
6. **Placeholders needing Grant** (unchanged): 2 things-to-do "Grant's picks", school names/ratings, neighborhood
   avg-price/trend accuracy, Crystal Bay stats, IVGID fee, hero/history photos (Unsplash placeholders).

**Vince still needs to complete the passkey at `/_emdash/admin/setup`** — NOTE: Vince reported (2026-08-12) he is
already logged into the backend with a passkey, so inline editing should light up on all wired pages/fields.

## ▶ emdash/Astro REBUILD — Phase 1 DONE (2026-08-07): skeleton live on Cloudflare
**emdash project scaffolded + deployed:** `grant-meyer/emdash/` (Astro 6 + emdash 0.1, cloudflare `starter`
template). **Worker `gcm-homes-emdash` → `https://gcm-homes-emdash.cameron-239.workers.dev`** (Cameron acct
`239e9d…`). Admin UI renders (setup wizard at `/_emdash/admin/setup`); `@astrojs/react` present so no blank-admin
gotcha. This is a SEPARATE worker from the live prototype `gcm-homes` — both coexist during the rebuild; cut over
the domain to the emdash worker when Phase 2+ is done.
- **Reuses D1 `gcm-homes-db`** (id `614044b7…`, binding `DB`) — emdash collections (`_emdash_*`/`ec_*`) live in the
  SAME database as the Trestle-synced `listings`/`listing_photos`/`sync_meta` tables. The hybrid model, one D1.
- **R2 `gcm-homes-media`** (binding `MEDIA`), created on Cameron. Worker Loader `LOADER` + 1-min cron (emdash defaults).
- **Install quirk:** `npm install --ignore-scripts --legacy-peer-deps` (peer-dep conflict on wrangler; `--ignore-scripts`
  skips the Windows native build). **Deploy:** `cd emdash && CLOUDFLARE_API_TOKEN=<cameron>
  CLOUDFLARE_ACCOUNT_ID=239e9d… npx wrangler deploy`.
- **▶ NEXT (needs Vince):** complete the setup wizard at `/_emdash/admin/setup` — the Account step creates the admin
  user via **passkey** (WebAuthn), which needs Vince's device; an agent can't do it. After that: Phase 2 = port the
  content pages into Astro with inline-editable emdash fields (see `EMDASH-REBUILD-PLAN.md`).

## ▶ NEXT MAJOR PHASE — emdash/Astro rebuild (planned 2026-08-07)
**Decision made:** rebuild the front-end in **emdash/Astro** so the client can edit page text; **listings stay on
the Trestle→D1 replication** we built (they are NOT CMS-managed). Full plan + content model + phased tasks:
**`EMDASH-REBUILD-PLAN.md`**. **Confirmed 2026-08-07: ALL text content is emdash-managed** — homepage, all content
pages (Buyers/Sellers/Community/Concierge/About), neighborhood copy, contact details, site settings + blog (scope
TBD). Only live MLS listings + map geometry stay auto/read-only. The current React-CDN prototype is the DESIGN
REFERENCE, not the foundation.

## ✅ NOW ON CLOUDFLARE (2026-08-07) — Path B (D1 replication) is LIVE
**Site runs on Cloudflare: `https://gcm-homes.cameron-239.workers.dev`** — Worker serves from **D1**, never calls
Trestle, so it never hits the WAF that blocks CF (re-verified 2026-08-07: direct CF→Trestle still 403). A sync job on
Vercel (allowed host) replicates the feed into D1. Both stagings coexist: **CF (`gcm-homes`)** = the real target;
**Vercel (`gcm-homes-staging.vercel.app`)** = still up, and now also hosts the sync engine.

**Architecture:** Vercel `/api/sync` (Trestle → D1) → **CF D1 `gcm-homes-db`** → **CF Worker `gcm-homes`** serves
`/api/*` from D1 + the static SPA. Browser fetches listing photos directly from Trestle (signed MediaURLs, not
WAF-blocked). D1 held **208 listings + 7094 photos** at cutover.

**CF resources (Cameron acct `239e9d015c7a3a39cdc2e9400312f553`):**
- D1 `gcm-homes-db` id `614044b7-3e0c-41ee-ac78-7805cbab6d99` — tables `listings`, `listing_photos`, `sync_meta`.
- Worker `gcm-homes` (`trestle-test/cf-worker/`, binding `DB`). Deploy: `cd cf-worker && CLOUDFLARE_API_TOKEN=<cameron>
  CLOUDFLARE_ACCOUNT_ID=239e9d… npx wrangler deploy`.

**Sync (keeps D1 fresh):**
- **Endpoint** `trestle-test/vercel/api/sync.js` → `https://gcm-homes-staging.vercel.app/api/sync`, protected by
  `CRON_SECRET` (in `~/.claude/credentials/trestle-api.md`). Vercel Cron runs it **daily 15:00 UTC**
  (Hobby tier = daily max; for 15-min freshness use a GitHub Action or upgrade Vercel to Pro).
- **Manual/local:** `cd cf-worker && CF_API_TOKEN=<cameron> node sync/sync.mjs` (force IPv4), or
  `curl -H "Authorization: Bearer <CRON_SECRET>" https://gcm-homes-staging.vercel.app/api/sync`.
- Freshness check: `GET https://gcm-homes.cameron-239.workers.dev/api/health` → `{last_synced_at,count}`.

**Worker gotchas (cost real debugging):**
- **`assets.html_handling` default `auto-trailing-slash` 301s `/index.html`→`/`** — when the worker serves
  `/index.html` that redirect loops (`ERR_TOO_MANY_REDIRECTS`). Fix: `"html_handling":"none"`,
  `"not_found_handling":"none"` in wrangler.jsonc; worker owns all routing + serves explicit shells.
- **301s cache hard in the browser** — the first (broken) deploy's 301 loop stuck in Chrome; verify with a
  cache-bust query (`?fresh=1`) or Node fetch, not a plain browser reload.
- **D1 caps bound params at 100/query** — the sync inline-escapes values (batched by row count + 90KB SQL-text cap)
  instead of parameterized multi-row inserts.
- **Git Bash mangles URL paths** in curl args (`/api/...` → `C:/Program Files/Git/api/...`) — verify API routes
  with Node fetch, not bash curl.

## ▶ (Legacy) Vercel staging — still live, now the sync host
Working tree: `trestle-test/demo/` (edit here) → synced to BOTH `trestle-test/vercel/public/` (Vercel) AND
`trestle-test/cf-worker/public/` (Cloudflare) → deploy each. CLI = `vince-8965` (Vercel), Cameron token (CF).

**Done today (all live + verified):**
- Merged Liz's two design pieces into our site (ours has the live Trestle data; hers was design-only): the
  **hero dusk→night overlay + 2 hero CTAs**, and the **full Community Guide page**.
- **Community map = Liz's Leaflet polygon build** (her `/map/` iframe, 16 traced GeoJSON polygons, Map/Sat/Terrain
  toggle). Replaced my earlier static-image+pins version. Popup "Explore" → sub-page via postMessage.
- **Neighborhood sub-pages show "Homes for Sale in <area>"** — live Trestle listings matched by **point-in-polygon**
  (feed has no subdivision field). Swept all 15 areas: every one renders, 177 listings matched, 0 broken imgs, 0
  console errors. Counts: central 43, ski-way 22, championship-golf 16 … apollo 1.

**NEXT / OPEN (tomorrow):**
1. **▶ MOVE TO CLOUDFLARE — Vince chose Path B (D1 replication). Build this next.** See the plan below.
2. **ClickUp task `868gb3q2a` "Build the Staging Site"** — Vince said **hold the comment** (don't post yet). When
   he OKs: comment the staging URL + what's built + Grant placeholders. Liz already dropped both staging URLs there.
3. **Contact form still sends nothing** — front-end only, fakes "Grant will be in touch." Wire to Resend (like the
   onePHG sites) before this goes in front of anyone.
4. **[PLACEHOLDER] content needs Grant** before publishing: the 2 "Grant's picks", school names/ratings, every
   neighborhood's avg price + inventory trend, Crystal Bay's "Grant's Take" + stats, IVGID fee. Hero/things-to-do/
   history photos are Unsplash placeholders (swap for Grant's photography).
5. Longer-term: this is still the demo/prototype tree, not the eventual emdash/Astro build.

### ▶ PATH B PLAN — replicate Trestle → Cloudflare D1, serve from Cloudflare (chosen 2026-08-06)
**Why:** Trestle's Imperva WAF blocks Cloudflare Workers (re-verified 2026-08-06: CF worker `/api/listings` → **403**,
Vercel → **200**). The *site* can serve from Cloudflare fine; only the CF→Trestle *call* is blocked. So a sync job on
a non-blocked host writes the feed into **CF D1 (+ R2)**, and the Worker serves from D1 and never calls Trestle →
never hits the WAF. Contractually fine — the Trestle product's Intended Access Pattern has **Replication** checked.
Billing actually improves: a few Trestle queries per sync, not per cache-window.

**Steps (execute in order):**
1. **CF resources** on Cameron's account `239e9d015c7a3a39cdc2e9400312f553`: `wrangler d1 create gcm-homes-db`,
   `wrangler r2 bucket create gcm-homes-media` (R2 = phase 2, only if MediaURLs expire — verify first). Reuse shared
   KV `028dfa4da881449cb1fcfb8ae46b6e2e` if needed.
2. **D1 schema:** `listings` (all feed fields — see the object built in `vercel/lib/trestle.js fetchAllActive()`:
   id/address/city/state/zip/price/beds/baths/sqft/lotAcres/yearBuilt/type/subType/category/status/lat/lng/view/
   waterfront/dom/photosCount/agent/office/updated/photo/slug) + `listing_photos`(listing_key,ord,url) for detail
   galleries + `sync_meta`(last_synced_at,count).
3. **Sync job** = port `vercel/lib/trestle.js` fetch logic → upsert into D1 via the D1 REST API (Cameron `cfat_`
   token). Runs on a **non-blocked host — recommend Vercel Cron** (we're already on Vercel): add `/api/sync` +
   `vercel.json` `crons` every 15–30 min. (A CF Cron trigger will NOT work — same blocked egress.)
4. **Rewrite `cf-worker/worker.js`** to read from D1 (drop the direct Trestle calls). `/api/listings`,
   `/api/listing-by-slug/:city/:address`, `/api/listing/:key` all served from D1. Keep the edge-cache layer + the
   `slug` logic + `categoryOf()`. The browser JS already calls these paths — no front-end change.
5. **Static assets** (HTML/JS/CSS + `map/`): copy `demo/` → `cf-worker/public/` (existing flow), served by the
   worker's ASSETS binding. `run_worker_first: true` already set so API routes win.
6. **Images:** phase 1 hot-link Trestle `MediaURL`s (they render from the browser). **First verify whether they
   expire** (signed URLs may have a TTL) — if they do, mirror to R2 during sync. This is the one unknown to test.
7. **Cut over:** deploy worker to Cameron CF; bind custom domain when Grant's ready. Vercel stays as the sync host
   (or move sync to a VPS later).

**Open decisions for tomorrow:** sync host (Vercel Cron recommended); refresh interval (15 vs 30 min); MediaURL
expiry test → hot-link vs R2 mirror. **The Vercel staging stays up during the build** as the working reference.
**(Optional, parallel) Path A ticket** to `trestlesupport@cotality.com` (incident
`1129000630050274626-38748860011057097`, needs office IP + Liz) — if Cotality allowlists CF, the existing worker
just works; harmless to send alongside Path B.

## ✅ WORKAROUND FOUND (2026-07-17) — Vercel is NOT blocked; Cloudflare is
**Trestle's WAF blocks Cloudflare but allows Vercel.** Proven, not assumed:
- **Vercel** (`iad1`, egress `184.73.30.219`, AWS us-east-1): token **200 in 169ms**, OData **200**, 210 active listings.
- **Cloudflare Workers** (egress `172.70.208.90`): **403** Imperva block page, 5/5 tries.
- ⇒ **Temporary staging is LIVE on Vercel: https://gcm-homes-staging.vercel.app**
  (`/listings.html`, `/homes/:city/:address`, `/api/listings`, `/api/probe`). Fully working with live production data.
- `GET /api/probe` re-tests the WAF from the host at any time and echoes the egress IP + Incapsula incident ID —
  run it first if the feed ever 403s again.
- Source: `trestle-test/vercel/` (`lib/trestle.js` is a port of `cf-worker/worker.js`; `api/*.js` are the routes).
  Deploy: `cd trestle-test/vercel && npx vercel deploy --prod --yes` (CLI logged in as `vince-8965`).
- **Gotcha:** Vercel's `[...slug].js` catch-all did NOT work here (1 segment → empty param, 2 segments → 404).
  Replaced with `api/listing-by-slug.js` + a `vercel.json` rewrite packing the 2 segments into `?slug=`. Single
  `[key].js` params work fine.
- **Still worth doing:** ticket `trestlesupport@cotality.com` if we want Cloudflare unblocked (draft + incident ID below),
  since the rest of the emdash estate is on Cloudflare. Vercel is the temporary staging home meanwhile.

## 🚨 BLOCKER (2026-07-17) — Trestle's WAF blocks Cloudflare IPs
**Cloudflare Workers cannot reach the Trestle API.** Imperva/Incapsula returns a 403 block page
on the OAuth token request from CF egress IPs (e.g. `172.70.208.90`).
Incident ID `1129000630050274626-38748860011057097`. Consistent (5/5 tries), **not** credential-related
(the block happens pre-auth at the token endpoint, so any credential from a CF IP fails).
Adding a `User-Agent` did **not** help. The same credentials work fine from Vince's local IP.
- ⇒ The live demo `trestle-test.cameron-239.workers.dev` shows "Listings didn't load".
  This was already broken before the 2026-07-17 work — any CF→Trestle call 403s, regardless of credential.
  (CLAUDE.md previously claimed CF IPs were clean as of 2026-05-25; that is no longer true.)
- **Support contact:** `trestlesupport@cotality.com` (verified — mailto link on
  `trestle-documentation.corelogic.com`). Docs mention nothing about IP allowlisting.
- **Fallback if support won't allowlist:** sync the feed to D1 from a non-Cloudflare host, serve from D1.
  This is contractually fine — the product's Intended Access Pattern has **Replication** checked
  ("I will be copying Trestle data down to a local data store"), for both Data and Media.
  Note a CF **Cron trigger won't work** — same blocked egress IPs.

## Trestle PRODUCTION feed (live since 2026-07-13)
- Product **"Production API"** (id `12518`), feed **IDX Plus – WebAPI**, status *In Production*, 4 Party, **Approved 7/13/2026**.
- **Billed** — "Credit Card via Trestle", fees commence on effective date. Unlike the sandbox, every query costs money → always cache.
- Product record declares **URL/Location `vercel.com`** and description *"Production API for grants website"* —
  someone (Cameron?) registered Vercel as the host on 7/13. **Worth confirming who + what the hosting plan is.**
- Credentials in `~/.claude/credentials/trestle-api.md`. **0 credential slots remain** (2 of 2 used):
  - `trestle_...20260709064338` (7/13) — pre-existing, secret unknown, owner unconfirmed. **Don't RESET/DELETE without asking.**
  - `trestle_...20260716092918` (7/17) — ours. Secrets are shown **once** at creation, never again.
- Feed contents (verified 2026-07-17): **210 active**, 168 Incline Village, 8 Crystal Bay, 14 Reno/"Town out of Area",
  rest Kings Beach/Zephyr Cove/Stateline/Glenbrook/Tahoma/Carson. Prices $525–$125M. **All 210 have Lat/Lng and photos** (≤50 each).
  Photo `MediaURL`s are signed and hot-linkable from the browser with no auth.

### Feed data quirks (bit us — don't re-learn these)
- **`PropertySubType` lies about Land:** raw Land parcels carry `subType: "SingleFamilyResidence"`, and leases carry
  `MultiFamily`/`Commercial`. Filtering on subType files vacant land under Single Family. ⇒ derive a `category` from
  `PropertyType` FIRST (see `categoryOf()` in worker.js / `category_of()` in server.py), then refine with subType.
- **`SubdivisionName` is null on all 210** → no neighbourhood filter is possible from that field.
- **`WaterfrontYN`** is `true` on only 7, `null` (not `false`) on the rest → usable as an opt-in filter only.
- **The $525 listing is a `CommercialSale`**, not a lease — 100 sqft at 333 Village Boulevard. Almost certainly a monthly
  commercial rent miscategorised in the MLS. Displayed as-is ($525) because the feed says sale; **do not invent a `/mo`**.
  The 3 real `ResidentialLease` rows DO render `/mo`.
- `City` is null on ~1 listing → slug falls back to `lake-tahoe`.
- Listing counts drift live (211 → 210 within an hour) — that's real, not a pagination bug.
- **Media `in (...)` batching:** Trestle accepts ≥60 keys per `ResourceRecordKey in (...)`; code uses 50 for headroom.

## Community Guide page + hero overlay (2026-08-06) — from Liz's handoff
Two parallel staging sites existed: **Liz's** `grant-meyer-homes.vercel.app` (design-only: hero CSS overlay +
Community page, NO live data) and **ours** `gcm-homes-staging.vercel.app` (live Trestle listings, real routing).
Merged Liz's two design pieces INTO ours (ours is the base — it has the data).

- **Hero overlay grafted** onto the homepage: her ambient dusk→night cycle — 3 extra layers `hero__dusk` /
  `hero__night` / `hero__stars` (opacity keyframes, 36s loop) above the base photo + veil. Fixes our washed-out
  daytime hero where the white headline was hard to read. Added the 2 hero CTAs she had and we lacked:
  **EXPLORE TAHOE HOMES → /listings/**, **WHAT IS YOUR HOME WORTH → /contact/**. CSS in `styles.css`
  (`.hero__dusk/night/stars` + keyframes + `prefers-reduced-motion` hold), markup in `js/home.jsx`.
- **Community Guide page built** (`js/community.jsx` + `community.css`, loaded only by index.html): 9 sections —
  hero, lake-facts strip, **interactive 15-pin neighborhood map**, things-to-do (6 cards), schools, history
  (3 eras), living-here accordion, **featured properties (LIVE from Trestle, top 3)**, contact. Replaces the old
  generic 3-card `ContentPage` placeholder at `/community/`.
- **Neighborhood sub-pages**: `/neighborhood/<slug>/` — Crystal Bay has bespoke copy, the other 14 use a generic
  fallback template. `NeighborhoodPage` in community.jsx. Every map pin + "Learn More" links here.
- **Map = Liz's Leaflet polygon build (2026-08-06, replaced the static-image+pins version).** Her self-contained
  Leaflet app lives at `public/map/` (`index.html` + `neighborhoods-data.js` = `window.NEIGHBORHOODS` GeoJSON,
  **16 traced polygons**), embedded as an **iframe** (`/map/`) in the neighborhood section. Map/Satellite/Terrain
  toggle (CARTO Voyager + Esri imagery/topo, no API key), per-area popups with a description + "~N single-family
  homes" + "Explore →". Clicking Explore `postMessage`s `{type:"gotoNeighborhood",slug}` up to the parent React
  page → `navigate("neighborhood",{param:slug})`. Below the map, a 15-card grid is the mobile/no-JS fallback.
  Central North + Central South are two polygons but one guide (`areaToSlug` collapses them → `central`). **Slugs in
  community.jsx match her map's `areaToSlug` output** (note `championship-golf-course` / `mountain-golf-course`, not
  the shorter forms). Files copied verbatim from her `grant-meyer-homes.vercel.app/map/`.
- **Neighborhood sub-pages now show "Homes for Sale in <area>" — LIVE from Trestle, matched by polygon.** The feed
  has no subdivision field (`SubdivisionName` null on all 210), so listings are matched to a neighborhood by
  **point-in-polygon** on each listing's lat/lng against the traced GeoJSON. Parent-side copy of the polygons =
  `js/neighborhoods-geo.js` (`window.NB_GEO`, global renamed from `NEIGHBORHOODS` to avoid colliding with the map
  iframe's). Helpers + `NeighborhoodListings` component in `community.jsx`. **177/209 geo-listings match** an area
  (the 32 unmatched are correctly the Reno/Carson/Kings Beach outliers). Live counts e.g. central 43, ski-way 22,
  championship-golf 16, lakefront 4, apollo 1. Shows up to 6 cards + "SEE ALL N HOMES" → /listings/; graceful empty
  state ("Ask Grant what's available") when 0. `loadAllListings()` memoises one feed fetch across sub-pages.
- **SPA routing refactored** (`js/app.jsx`): route state is now `{page, param}` (was a bare string) so
  `/neighborhood/<slug>/` carries the slug. `routeFromPath` matches it; `navigate("neighborhood", {param})` builds
  the URL. `NotFound` is now window-assigned (used cross-script by community.jsx). `vercel.json` has the
  `/neighborhood/:slug` redirect (→ trailing slash) + rewrite (→ /).
- **PLACEHOLDERS (Liz flagged, need Grant before publishing):** the 2 "Grant's picks" in things-to-do, all school
  names/ratings, every neighborhood's avg price + inventory trend, Crystal Bay's "Grant's Take" + stats, the IVGID
  fee. Copy is verbatim from her spec; stand-ins are in place.
- **Images:** hero/things-to-do/history use tasteful Unsplash placeholders (the zip only bundled the map image);
  featured properties are real. Swap for Grant's photography when available.
- **Verified live:** `/community/` + `/neighborhood/crystal-bay/` + `/neighborhood/apollo/` all 200 on direct load,
  15 pins, map + panel + chips + Learn More all work, back button works, 0 broken images, 0 console errors, featured
  cards pull live Trestle. Deploy = same `vercel deploy --prod` flow.

## Site wiring (2026-07-17) — whole site, real URLs, live data

**Every page now has a real URL and all links resolve.** Verified live on Vercel.

| URL | Serves | Data |
|---|---|---|
| `/` | `index.html` (React SPA) | 3 featured listings from the live feed |
| `/buyers` `/sellers` `/community` `/concierge` `/about` | SPA `ContentPage` | static copy |
| `/contact` | SPA home + auto-scrolls to enquiry form | — |
| `/listings` | `listings.html` | live: search + filters + map, 210 listings |
| `/homes/:city/:address` | `listing.html` | live detail + photos |
| `/api/listings`, `/api/listing-by-slug/:city/:address`, `/api/listing/:key`, `/api/probe` | serverless | Trestle |

### What was broken (found 2026-07-17)
1. **The SPA had NO URL routing** — every route rendered at `/` via React state. `/buyers`, `/about` etc **404'd on
   direct visit**; nothing was linkable, shareable, bookmarkable or indexable. Fixed with History API routing in
   `js/app.jsx` (`PAGE_PATHS` + `pageFromPath` + `popstate`) + explicit `vercel.json` rewrites.
2. **A whole fake sub-site was reachable from the footer.** "Search Listings" → `js/listings.jsx` → 6 **invented**
   properties ("1056 Lakeshore Boulevard — $10,850,000", "701 Cristina Drive — $4,675,000"…) presented as real
   inventory. Worse, `js/listing.jsx` did `LISTING_DATA[id] || LISTING_DATA["1056"]`, so **any** unknown id silently
   rendered the fake $10.85M home. **Retired to `demo/_retired/`** (see its README) and unloaded from `index.html`.
   All listings now come from Trestle.
3. **23 dead `href="#"` links** (VIEW MARKET INTELLIGENCE, LEARN MORE, 3× READ ARTICLE, 4 socials, 14 footer links).
   Removed per Vince: keep only links with content behind them. Footer rebuilt to Properties / Tahoe / About + MLS
   attribution. **Now 0 dead links sitewide.**
4. **`listings.html` nav pointed at `/#neighborhoods`, `/#insights`, `/#about`, `/#contact`** — anchors that don't
   exist in the SPA, so the whole nav was dead from the listings page. Repointed to the real URLs.
5. Homepage featured cards were fine (`PropCard` checks `p.live` → `/homes/:slug`); the fake path was only reachable
   via the footer. (I initially mis-called this as broken — verified it wasn't.)

### Routing gotchas (Vercel) — all three cost real debugging time
- **`cleanUrls: true` breaks `destination: "/index.html"`** — cleanUrls maps `index.html`→`/`, so rewrites to
  `/index.html` 404. Use `destination: "/"`. (cleanUrls is also why `/listings` works with no rewrite: it serves
  `listings.html` automatically.)
- **Canonical URL form is WITH a trailing slash**, enforced by explicit `redirects` in `vercel.json`
  (`/about` → **308** → `/about/`), incl. `/homes/:city/:address` → `/homes/:city/:address/`.
  `rewrites` then match only the slash form. Redirects run BEFORE rewrites, and sources are exact
  (`/about` does not match `/about/`), so there's no loop — verified hop-by-hop. **`/api/*` is deliberately NOT
  redirected**; API routes stay slash-free.
- **DO NOT set `"trailingSlash": true`** — it silently broke **8 routes** here (`/buyers/`, `/about/`, `/homes/…/`
  and the `/api/listing-by-slug/:city/:address` rewrite all 404'd) by mangling rewrite *source* matching. The explicit
  redirect list above does the same job predictably.
- `vercel.json` rejects a `"//"` comment key — schema validation fails the deploy. Keep rationale here instead.
- **Trailing slashes REQUIRE absolute asset paths.** `index.html` used relative `src="js/app.jsx"` / `href="styles.css"`,
  which at `/about/` resolve to `/about/js/app.jsx` → **404 → blank white page, SPA never boots**. All script/CSS/asset
  refs are now absolute (`/js/…`, `/styles.css`, `/assets/…` in `js/*.jsx` + `styles.css`). Never reintroduce a relative
  path in a page served at a nested URL.
- Unknown URLs return **Vercel's default 404** (correct status, unbranded). The SPA's `NotFound` component is a guard
  for any future rewrite added without a `PAGE_PATHS` entry. A branded `public/404.html` is still worth adding.

### Nav (must stay consistent — 3 copies, keep in sync)
Same items + same order + same hrefs on every page type:
**Listings | Buyers | Sellers | The Community | Concierge | About** + a Contact CTA button
(the SPA labels its CTA "INQUIRE NOW"; the static pages use "Contact").
Defined in **three places** — `js/chrome.jsx` (SPA), `listings.html`, `listing.html`. Change one → change all three.
(`listing.html` previously had only `← All Listings / The Community / About Grant / Contact`; "Back to All Listings"
still lives in the back-bar under the hero.)

### Logo (must stay consistent)
All three page types use the **same asset at the same size**: `/assets/logo.png`, `height: 60px`.
- SPA: `styles.css` `.nav__logo img`; transparent nav → `filter: brightness(0) invert(1)`.
- `listings.html`: solid cream nav → full-colour logo.
- `listing.html`: nav is transparent over the hero → logo inverted to white, `nav.scrolled .nav-logo img { filter: none }`
  restores full colour once the cream background fades in.
(`listings.html`/`listing.html` previously rendered the wordmark as **text**, not the logo — that's why they looked
different from the homepage. `assets/logo-white.png` exists but is unused; the CSS filter covers the dark state.)

## Listings page (built 2026-07-17)
`trestle-test/demo/listings.html` — complete search UI, **verified working end-to-end against the production feed
on localhost** (blocked on Cloudflare only by the WAF above).
- Search (address/city/ZIP/type, multi-token AND), filters (price min/max, beds, baths, category, city, waterfront),
  sort (featured/price/newest/largest), Leaflet+CARTO map with price pins + clustering + popups, two-way card↔pin hover
  sync, "search as I move the map", mobile map/list toggle, skeletons, empty state, MLS attribution.
- **Map default:** unfiltered → fixed Tahoe basin view (`setView(TAHOE, 11)`), NOT fitBounds — the feed reaches
  Reno/Fernley/Yerington and fitting all of it frames empty desert. Once filtered → fitBounds to results.
- Worker/server fetch **all** listings once + cache (15 min TTL) → the browser filters locally. One upstream call per
  TTL regardless of traffic — important because the feed is billed.
- Local dev: `cd trestle-test/demo && python server.py` → http://localhost:8766/listings.html (mirrors worker.js,
  in-memory 15-min cache, forces IPv4).

## Current Status (2026-07-17)
Demo is deployed on Cloudflare with the full design + SEO URLs, but **its API calls are 403-blocked by
Trestle's WAF** (see BLOCKER above) — the live URL currently renders "Listings didn't load".
Everything works against the production feed **locally** (`python server.py`).

### Live Staging URL
**https://trestle-test.cameron-239.workers.dev** — ⚠️ listings API blocked, see BLOCKER
Worker version `eaaff78b-539f-4dec-9d40-78f6a6c68a45` (2026-07-17).

| Page | URL |
|---|---|
| Homepage | `/` |
| All Listings | `/listings.html` |
| Listing Detail (SEO) | `/homes/incline-village-nv/940-miners-ridge-court` |

### Demo File Structure
```
trestle-test/
  demo/                     ← local dev files
    server.py               ← local Python proxy server (port 8766)
    index.html              ← homepage (React/Babel, design handoff)
    listings.html           ← listings grid page
    listing.html            ← listing detail page
    styles.css              ← design CSS
    js/                     ← React component JSX files
      home.jsx              ← modified: fetches live listings from API
      app.jsx, chrome.jsx, listing.jsx, listings.jsx, etc.
    assets/                 ← images, logos, design assets
  cf-worker/                ← Cloudflare Worker (deployed)
    worker.js               ← API proxy + static asset serving + SEO URL routing
    wrangler.jsonc          ← CF config (name: trestle-test, assets binding)
    public/                 ← copy of demo/ files served as static assets
```

### Running Locally
```
cd trestle-test/demo
python server.py
# Opens at http://localhost:8766/
```
Local server handles both API proxy (Trestle OAuth) and static file serving.
API uses relative URLs (`""`) so same code works locally and on Cloudflare.

### Deploying to Cloudflare
```
# 1. Copy updated demo files to cf-worker/public/
# (PowerShell)
$src = "trestle-test\demo"; $dst = "trestle-test\cf-worker\public"
Copy-Item "$src\index.html","$src\listings.html","$src\listing.html","$src\styles.css" $dst -Force
Copy-Item -Path "$src\js","$src\assets" -Destination $dst -Recurse -Force

# 2. Deploy
cd trestle-test/cf-worker
npx wrangler deploy
```

### SEO URL Architecture
- Listings include a `slug` field: `incline-village-nv/940-miners-ridge-court`
- CF Worker routes `/homes/:city/:address` → serves `listing.html`
- `listing.html` reads `window.location.pathname`, calls `/api/listing-by-slug/:city/:address`
- Worker resolves slug by fetching all listings, matching, then fetching full detail
- `run_worker_first: true` in wrangler.jsonc ensures Worker handles API routes before CF Static Assets intercepts them

### How Listings Auto-Update
The site is fully dynamic — **no manual updates needed**. Listings are fetched from Trestle and **cached for 15 min**
(Cloudflare Cache API in the Worker; in-memory in `server.py`), then all search/filter/map work happens in the browser
over that payload. New Trestle listings appear within one cache window. **The cache is not optional** — the production
feed is billed per query, so it must not be hit per page load. Bump `CACHE_VERSION` in `worker.js` to invalidate.

## Design Handoff
- Location: `design/GCM Homes-handoff/gcm-homes/project/`
- Source: Claude Design (claude.ai/design) — exported as HTML/CSS/React prototype
- To preview: `python -m http.server 8765` from the `project/` folder, open `http://localhost:8765`
- Tech: React 18 (CDN) + Babel standalone + vanilla CSS — no build step
- Pages: Home (10 sections), Listing detail, Listings grid, Content/blog pages
- Features: A/B variant tweaks panel, interactive micro-map, Matterport toggle

## Trestle MLS API

### Credentials
- Stored in: `~/.claude/credentials/trestle-api.md`
- Environment: **PRODUCTION (IDX Plus, billed) since 2026-07-13** + the original test/sandbox feeds.
  See "Trestle PRODUCTION feed" above. The demo now uses the production credential.

### Endpoints (confirmed working 2026-05-21)
- Token: `https://api.cotality.com/trestle/oidc/connect/token`
- OData base: `https://api.cotality.com/trestle/odata/`
- Auth: OAuth 2.0 client_credentials, scope `api`, token lasts 8 hours
- Portal: `https://trestle.corelogic.com`

### Test Script
- Location: `trestle-test/test_trestle.py`
- Run: `cd trestle-test && python test_trestle.py`

### Two credentials — use the right one
There are **two** Trestle Managed Feeds under the Test API product:

| Feed | Client ID | Password | Use |
|---|---|---|---|
| Back Office for Technology Providers - WebAPI | `trestle_BlueSpacesLLCTestAPI20260503023208` | `<in ~/.claude/credentials/trestle-api.md>` | Admin/metadata only — NO listing data |
| **Sample Data Feed - WebAPI** | `trestle_BlueSpacesLLCTestAPI20260503023256` | `<in ~/.claude/credentials/trestle-api.md>` | ✅ This is the one with actual listing data |

### Trestle portal account
- URL: `https://trestle.corelogic.com`
- Login: `liz@bidviewmarketing.com`
- Password: stored in `~/.claude/credentials/trestle-api.md`
- Logged in as: Liz Wright

### Connection status (confirmed via portal 2026-05-21)
- MLO: **Incline Village Realtors®, Incline Village, NV** — **Approved as of 5/12/2026**
- Originating ID: **INCLINE**
- Data Feed: Sample Data Feed — WebAPI
- Contract Type: 2 Party
- Trestle URL: `https://api.cotality.com/trestle/odata`

### Status (2026-07-17)
- **Production credential: WORKING from local** — 210 active listings w/ photos + geo. Verified 2026-07-17.
- Sample Data Feed credential (256): still valid (sandbox, free).
- ⚠️ **Incapsula WAF blocks Cloudflare Worker IPs again** — see BLOCKER at the top of this file.
  (The 2026-05-25 note "CF Worker IPs are clean" is NO LONGER TRUE.)
- Direct local Python access works fine (force IPv4 — this box hangs on IPv6).

### Available Resources
Property, Office, Member, Media, OpenHouse, CustomProperty, PropertyRooms,
PropertyUnitTypes, Teams, TeamMembers, Field, Lookup, Model,
PropertyGreenVerification, Building, HistoryTransactional, DataSystem, Enumeration
