# GCM Homes: one page per home (plan)

**Status (2026-11-06):** planned, not built. Branch `gcm-property-pages` (worktree `C:\Dev\bes-gcm-property`).
Decisions are Liz's, 2026-11-06. This replaces the "one record per MLS listing" design in
`SOLD-ARCHIVE-PLAN.md` (sections 1, 3, 5 and 7); the rest of that plan still stands.

## The problem

The sync makes one record per MLS listing number. A home gets a new listing number every time it is relisted, so
every sale or relist makes a new page, with the number glued onto the URL. Live D1, 2026-11-06:

- 571 Dale Drive has two sold pages: Jan 2024 (Grant on the buyer side, $2.75M) at `…/571-dale-drive-1045283889`,
  and Aug 2026 (Grant on the seller side, $9.6M) at `…/571-dale-drive`.
- 489 sold pages cover 435 homes (54 repeats). Some homes have three.
- 17 homes on the market today also have a separate sold page. 760 Rosewood Circle has three URLs. 400 Fairview
  #218 (Grant's, featured) also has a sold page under `incline-village-ca/`, an MLS typo.

The address can't be the key: the MLS spells it differently between listings ("745 Mays", "745 Mays Boulevard",
"745 MAYS Boulevard"; 17 homes have more than one spelling). **The parcel number (APN) is the same on every
listing of a home and is filled on every archive row**, so homes are grouped by parcel.

## Decisions (Liz, 2026-11-06)

1. **One page per home**, at one URL that never changes. Every old URL redirects (301) to it.
2. **One status per home**: On market, Under contract, Pending, Sold, Off market. The sync sets it from the MLS.
3. **Grant's content has an on/off switch.** On by default when Grant is the listing agent on the current listing;
   **off by default everywhere else**, including a home where he only represented the buyer. He can switch it on.
4. **`/sold/` shows one card per home**, not per sale (571 Dale Drive is one card, "2 sales with Grant").
5. **The edit page in the admin gets reorganized** into groups, with a read-only **listing history** panel.
6. **Listing-page compliance fixes** from the "Listing page legal/compliance disclosures" thread ship first, as
   their own small PR (stage 1 below).
7. Vince doesn't need to make any of this. Liz has push access and has written every sync change since October.
   The only things only Vince (or Cameron, as repo admin) can change are the GitHub Actions secrets (Trestle keys,
   Cloudflare token), the Trestle account itself and the old Vercel projects. None of them are touched here.

## Design

### Records

| Table | One row per | Written by | Notes |
|---|---|---|---|
| `listings` + `listing_photos` | live MLS listing | sync (rewritten every run) | unchanged; gains `parcel_number` |
| `listing_archive` | MLS listing number, ever | sync (never deleted) | unchanged; it becomes the **history** |
| `ec_listings` (admin "Listings") | **home (parcel)** | sync for MLS columns, Grant for the rest | id becomes `p-<parcel>`; rows are never deleted |
| `property_slugs` (new) | URL ever used | sync + migration | `slug → property id`, for redirects |

`ec_sold_listings` (admin "Sold Listings", PR #246) is folded into `ec_listings` and retired.

### What the sync changes

1. Every listing it pulls (live or backfill) is matched to its home by parcel. A new parcel gets a new `ec_listings`
   row; a known parcel updates the existing one. The **current listing** of a home is its newest listing number.
2. MLS columns on the home's row come from its current listing. The home's **status** comes from that listing:
   Active → On market, ActiveUnderContract → Under contract, Pending → Pending, Closed → Sold, dropped out of the
   feed without closing → Off market.
3. `ec_listings` rows are **never deleted** (today the sync deletes a row when its listing leaves the feed).
4. When a **new listing number** starts on a home, the sync resets the Grant's-content switch to its default
   (on if Grant is the listing agent, else off). His content itself is kept; only the switch resets.

### URLs

- Each home's URL is `/homes/<city-state>/<street>`, chosen once (from the newest listing at migration, or the first
  listing for a new home) and **never changed**, even if the MLS spells the address differently later.
- Every slug ever used for that home goes into `property_slugs` and answers with a 301 to the home's URL: the
  `-<listing number>` ones, the misspellings, the `incline-village-ca` one. The sitemap lists only the real URL.
- Off market: a home with a sale the site shows, or one Grant was ever on, keeps its page with the Off market badge.
  Any other off-market home answers 410 as today.

### The listing page

- Top of the page: status badge and the current listing's facts (or, when sold, the sale facts).
- New **Sale history** section: one line per listing number, newest first. Listed date and price, outcome (sold /
  off market / current), close date and price, listing brokerage, and Grant's side when he was on one.
- Grant's content (headline, custom description, Note From Grant with image and videos, floor plans, his 3D tour
  link) shows only while the switch is on. With it off, the page uses the MLS description, and a Matterport link
  from the MLS still plays.

### `/sold/` and `/listings/`

- `/sold/`: one card per home. Grant's homes first, newest close first; then other agents' sales at $5M+ in the last
  3 years (unchanged rule). A home Grant sold more than once says so on its card ("2 sales with Grant").
- `/listings/`: the Status filter (Sold off by default, decided 2026-09-28) reads the home's status.

### The admin edit page

EmDash 1.4 has no field groups. It orders fields by `sort_order`, and site plugins can add **editor panels**
(read-only Block Kit panels on a saved entry, per collection). The plan uses both:

| Group | Fields |
|---|---|
| 1. Status and visibility | Status (from the MLS, shown read-only), Show Grant's content on this page, Featured, Hide from search |
| 2. Grant's content | Headline, Description, Note From Grant (text, image, videos) |
| 3. Tours and floor plans | 3D Tour URL, 3D tour link from the MLS (reference), Interactive floor plan, Floor plan images |
| 4. From the MLS (reference only) | the ~30 MLS facts, moved out of the form into a read-only panel |
| Panel: Listing history | one line per listing number (same data as the page's Sale history), with Grant's saved headline/note from each, read-only |

Each label starts with its group name so the form scans in blocks even without visual headers. If a small field
widget can draw real group headings, add them; check while building.

### Migration (one time, on the live D1)

1. Back up `ec_listings`, `ec_sold_listings`, `listing_archive` (export to `TheCube-2/09-deliverables/`).
2. Build one `ec_listings` row per parcel. Where a home has Grant's edits on more than one old row, the newest
   listing's edits win; older ones stay in `listing_archive.owner_snapshot` and show in the history panel. List any
   such homes for Liz before running.
3. Fill `property_slugs` from every old slug, and set each home's switch per decision 3.
4. Drop the `ec_sold_listings` collection registration once nothing reads it.

## Stages

| # | Stage | Estimate |
|---|---|---|
| 1 | **Compliance fixes** (own PR, ships first; list below) | 3–4 h |
| 2 | Sync: parcel on `listings`, one `ec_listings` row per home, status, never delete, switch reset | 5–6 h |
| 3 | Migration script + dry run on a local copy of the D1, then live | 3–4 h |
| 4 | Routes: lookup by home, `property_slugs` 301s, off-market rule, sitemap | 3–4 h |
| 5 | Listing page: Sale history section, Grant's-content switch | 3 h |
| 6 | Admin: field order and labels, MLS facts panel, Listing history panel (site plugin) | 4–6 h |
| 7 | `/sold/` one card per home, `/listings/` status filter | 2–3 h |

Bump `CACHE_VERSION` when it ships. Merging to main doesn't deploy; deploy by hand with wrangler from main.

## Stage 1: compliance fixes

From the "Listing page legal/compliance disclosures" thread.

**Must fix**

| Item | Where it comes from | Fix |
|---|---|---|
| Listing brokerage isn't shown | `office` is in the data but never printed | "Listing courtesy of {agent}, {office}" under the price on the listing page, and a small line on every card |
| Demo note live on another broker's listing (777 Rodeo Drive, Christine Perry / Christie's Sereno) | a test note seeded 2026-08-13 | clear `ec_listings.owner_note` on id `1176128261` (it's the only note on a listing that isn't Grant's). The switch in this plan stops it happening again |
| Wrong agent when the agent field is blank | `listing.agent \|\| "Grant C. Meyer"` in `detail-page.html` (two places) | print the MLS agent or nothing; never fall back to Grant |

**Should add**

| Item | Fix |
|---|---|
| MLS number and source | "MLS # {mlsNumber} · Source: Incline Village Realtors® MLS" near the brokerage line |
| Last updated | "Listing information last updated {updated}" in the same block |
| Brokerage line in the footer is too faint | raise the footer disclaimer contrast (today `rgba(255,255,255,0.45)`) |
| Brokerage phone or email | add Coldwell Banker Select Real Estate's phone. **Need the number from Grant** |
| Equal Housing Opportunity | EHO logo and statement in the footer of every page |
| Baths show "3 BA" when the home has 2 full + 1 half | header and cards show `full + 0.5 × half` ("2.5 BA"); the details table shows "2 full / 1 half". 93 live listings have a half bath |
