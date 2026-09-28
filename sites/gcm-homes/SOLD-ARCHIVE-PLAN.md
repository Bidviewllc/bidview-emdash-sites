# GCM Homes: sold and off-market listing archive (plan)

**Status:** proposal for Vince to review. Nothing below is built yet except the two owner checkboxes in PR #158.
**Owner of the sync code:** Vince (`trestle-test/cf-worker/sync/sync.mjs`). This plan changes that file, so it needs his sign-off.
**Decisions below are Liz's (2026-09-28).**

## Why

Every sync deletes a listing the moment it leaves the active feed, along with any owner edits on it (`ec_listings`
row: headline, description, Note From Grant, 3D tour, the new Featured/Hidden ticks). It has already happened: between
2026-09-25 and 2026-09-28 a listing with a custom description left the feed and its description is gone. We want:

1. A permanent record of every listing we have ever synced: sold, pending, and off-market.
2. A public **Recently Sold by Grant** page (his buyer-side and seller-side deals), plus internal use.
3. Grant's past edits available to reuse if a property comes back on the market.

## What the feed actually gives us (two probes, 2026-09-25 and 2026-09-28)

Both probes made one billed query each, ran on a throwaway Actions branch, and wrote their output to D1
`_trestle_probe`, not to the log. **This repo is public, so Actions logs are public. Never print MLS data there.**

| Question | Answer |
|---|---|
| Closed (sold) records? | **Yes.** One address returned 29 Closed records going back to **2011**, each with `ClosePrice`, `CloseDate`, `OffMarketDate`, list + buyer agent/office and `ParcelNumber`. |
| Photos on old sales? | **Yes.** `$expand=Media` returns the full set, and a 2012 photo still downloads (older photos are smaller). |
| Expired / Withdrawn / Canceled? | **No.** Everything that is neither Active nor Closed is 51 records: `ActiveUnderContract` (39) and `Pending` (12). No expired, withdrawn, canceled or hold records at all. |
| Relists | New `ListingKey` each time, **same `ParcelNumber`**, so group history by parcel. |
| Grant's agent ID | `ListAgentMlsId` / `BuyerAgentMlsId` = **`meyergra111`** |
| Cost | Flat. Liz confirmed there are no per-query charges on the IDX Plus WebAPI plan. The limit is a quota: **4,800 queries/hour, 160/minute** (response headers). |

**So "off-market" has to be inferred.** A listing that drops out of the Active pull and is not Pending/Under Contract
or Closed was expired, withdrawn or canceled. The feed does not say which.

Side finding: the sync pulls `StandardStatus eq 'Active'` only, so a home disappears from the site the moment it goes
under contract. Decision: pull those too and show them with a status badge (section 7).

## Design

### 1. `listing_archive` table (never deleted)

One row per `ListingKey`. It holds a snapshot of the MLS columns as last seen plus:

- `parcel_number`, `first_seen_at`, `last_seen_at`, `feed_status` (last StandardStatus seen)
- `archive_status`: `active` | `under_contract` | `sold` | `off_market`
- `close_price`, `close_date`, `off_market_date`
- `list_agent_mls_id`, `buyer_agent_mls_id`, `co_list_agent_mls_id`, `co_buyer_agent_mls_id` (+ names/offices)
- `owner_snapshot` (JSON): headline, description, owner_note, note_image, tour_url, featured, hidden, copied from
  `ec_listings` just before that row is deleted
- `main_photo_key`: R2 key of the stored main photo (section 4)

Size: roughly 10 KB/row, so 10,000 listings is ~100 MB in D1. That's fine.

### 2. Sync changes (`sync.mjs`)

1. Upsert every fetched listing into `listing_archive` (MLS columns + `last_seen_at`). Never delete.
2. **Before** `DELETE FROM ec_listings WHERE id NOT IN (...)`, copy each departing row's owner fields into
   `listing_archive.owner_snapshot`.
3. **Work out what changed** for archive rows that are `active`/`under_contract` but missing from this pull: one
   extra query, `ListingKey in (...)` with no status filter (it batches under the URL limit).
   - Comes back `Closed` → `sold`, with close price/date and buyer side.
   - Comes back `Pending`/`ActiveUnderContract` → `under_contract`.
   - Not returned → `off_market` (expired/withdrawn/canceled; unknown which), `off_market_date` = today.
   This is one or two extra queries per run, well inside the quota.

### 3. Relists: show, never auto-copy

When a new `ListingKey` arrives with a `ParcelNumber` already in the archive, **nothing is carried over.** Grant may not
be the agent this time, so his earlier copy must never appear on the new listing by itself. Instead, the sync fills a
read-only reference field in the admin, **"Previous listings of this property"**: each earlier listing's date,
status, and Grant's headline/description/note from `owner_snapshot`. He copies what he wants into the live fields.
(It's an MLS-style field: the sync rewrites it every run, and admin edits to it are discarded.)

### 4. Photos: use Trestle's, keep only the main photo

**Decision (Liz, 2026-09-28): don't copy MLS galleries.** Active listings keep showing Trestle's photos exactly as
today, and a relist brings its own new photos automatically. The **only** MLS image we store is each listing's
**main photo**, so a sold or off-market record still has a picture after Trestle stops returning the listing.

Why not store everything, even though it would only be ~$1/month (10,000 listings × 34 photos × 217 KB ≈ 74 GB):
we won't show full galleries for closed listings; relists replace the photos anyway; a stored copy goes stale when
the listing agent swaps a photo; and holding full galleries after close is the riskiest part legally. (One photo per
closed listing is fine; see Decisions.)

**The main photo.** The Media record with `PreferredPhotoYN = true`, falling back to `Order = 1`. That's the same
image the cards already use (`listings.photo`).
- **When:** the sync copies it into the existing R2 bucket `gcm-homes-media` (binding `MEDIA`, never used so far) when
  a listing is first seen, and again whenever its `MediaKey` changes. It has to happen while the listing is live,
  because an expired or withdrawn listing disappears from the feed with no warning (section 2).
- **Where:** `listings/<ListingKey>/main.jpg`, with the key saved on the `listing_archive` row (`main_photo_key`).
- **Size:** 10,000 × ~217 KB ≈ **2 GB, which fits inside R2's free 10 GB.** The one-time backfill is about 10,000
  downloads.

**Which photos the site shows:**
- **Active listing:** Trestle's full gallery (unchanged), with Grant's photo decisions applied (below).
- **Relist:** the new listing's Trestle photos. Nothing to de-duplicate, because we don't keep old galleries.
- **Sold / off-market:** the stored main photo only.

**Photo control on active listings, without storing copies.** Trestle gives every photo a permanent `MediaKey`, so a
small owner table, `photo_decision (media_key, action, sort_order)`, is enough. The sync never writes it, just like
the `ec_listings` owner columns. Actions: **hide** (off the site; for an MLS photo this is our "delete", since we
can't delete Trestle's copy), **main** (pick the lead photo) and **reorder**. The site applies these on top of
Trestle's live list. Each Media record also carries MLS permission fields (`Permission`, `ListingPermission`,
`MediaStatus`, `InternetEntireListingDisplayYN`); the site should honor those live, which is another reason not to
keep copies.

**Where Grant manages them:** inline on the listing page, gated on a logged-in admin like the Note From Grant editor.
Each photo gets Hide / Make main, and the gallery can be dragged to reorder. Visitors never see the controls.

**Grant's own listings:** his photographer's images and video are his to use, so they go up through the emdash admin
(already R2-backed) and are kept in full. A per-listing option, **"Use my photos instead of the MLS photos"**, swaps the
gallery. These are also what the Recently Sold by Grant page shows, in full, since we have the rights.

### 5. Recently Sold by Grant (`/sold/`)

`listing_archive` where `archive_status = 'sold'` and any of the four agent-ID columns = `meyergra111`, newest
close first. **Backfill once** with a single query:
`StandardStatus eq 'Closed' and (ListAgentMlsId eq 'meyergra111' or BuyerAgentMlsId eq 'meyergra111' or …Co… )`,
which pulls his sales back to 2011 in one go. Cards show his own uploaded photos if we have them, else the stored main photo, address, close date and a "Represented the
buyer / seller" label. Owner fields from `owner_snapshot` can power a short story per sale.

The backfill query returns `Media` for closed listings (28 of 29 in the probe), so **every past sale gets its MLS main
photo** at backfill time. Grant's photographer images replace those over time, uploaded as we go.

Other agents' sold listings can be shown publicly too, with the Sold badge and the main photo only (Decisions).

### 6. Owner checkboxes (in PR #158)

- **Featured listing**: leads the home carousel, community row and blog sidebar pick.
- **Hide from search**: removed from `/listings/`, the sitemap, featured rows, neighborhood pages and random section
  photos. The detail page still opens by direct link, with `noindex`.
Both are `ec_listings` owner columns that the sync never writes. The archive keeps them in `owner_snapshot`.

### 7. Status badges

Every listing card and detail page shows one badge: **On market**, **Under contract**, **Pending** or **Sold**.

- **Sync:** pull `StandardStatus in ('Active','ActiveUnderContract','Pending')` instead of `Active` only (51 extra
  records today), so a home stays on the site when it goes under contract. The badge comes from `StandardStatus`,
  mapped to Liz's labels (the MLS says "Contingent" for ActiveUnderContract).
- **Sold:** the detail page stays live after close, with the Sold badge, close date/price and the stored main photo
  only. Its data comes from `listing_archive`.
- **Off-market** (expired/withdrawn): no public badge or page. It stays in the archive for internal use, and its URL
  returns 410 Gone so search engines drop it.
- Featured rows (home, community, blog sidebar) default to On market only. Tick-to-feature can still pull in an Under
  contract or Sold listing if Grant wants to show one off.

## Stages and estimates

| # | Stage | Who | Estimate |
|---|---|---|---|
| 1 | `listing_archive` table + sync upsert + owner snapshot before delete | Vince | 3–4 h |
| 2 | "What changed" follow-up query (sold / under contract / off-market) | Vince | 2–3 h |
| 3 | Sync pulls Under contract + Pending too (status filter, `status` column) | Vince | 1–2 h |
| 4 | Copy each listing's main photo to R2 (first seen + on change) + one-time backfill | Vince | 2–3 h |
| 5 | Status badges on cards + detail page; sold pages stay live (main photo only); off-market → 410; "Sold" search filter (off by default) | Liz/Claude | 4–5 h |
| 6 | `photo_decision` table + inline photo controls on the listing page (hide / main / reorder) | Liz/Claude | 4–5 h |
| 7 | Grant's own photos/video per listing + "use my photos instead of the MLS photos" | Liz/Claude | 3–4 h |
| 8 | "Previous listings of this property" reference field in the admin | Vince or Liz/Claude | 2–3 h |
| 9 | One-time backfill of Grant's past sales (data + main photo) | Vince | 1–2 h |
| 10 | `/sold/` Recently Sold by Grant page | Liz/Claude | 4–6 h |
| 11 | After-action report per sale | later | — |

Stage 1 is the urgent one. Until it ships, every sync keeps deleting history.

## Decisions (Liz, 2026-09-28)

1. **Status badges:** show On market / Under contract / Pending / Sold (section 7). The sync starts pulling
   under-contract and pending listings.
2. **Grant's past sales:** the backfill brings in the data plus the MLS main photo. His photographer's images get
   uploaded over time, as we go.
3. **Showing sold listings:** fine to show publicly with one image, the way Zillow keeps old listings up. We're not
   asking the MLS first. If the MLS ever objects, **Hide from search** (section 6) pulls a listing off every list and search in one click.
Taking its page fully offline (410) would be a small addition.

4. **Sold in the main search:** `/listings/` gets a **Sold** status filter that is **always off by default**. Buyers
   see on-market homes first and can opt in to sold ones. Sold listings also appear on `/sold/` and their own pages.

## Still open

1. `_trestle_probe` in D1 still holds the two probe responses. Drop it once this plan is agreed.
