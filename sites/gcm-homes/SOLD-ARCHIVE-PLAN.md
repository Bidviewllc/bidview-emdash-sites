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
under contract. See open question 1.

## Design

### 1. `listing_archive` table (never deleted)

One row per `ListingKey`. It holds a snapshot of the MLS columns as last seen plus:

- `parcel_number`, `first_seen_at`, `last_seen_at`, `feed_status` (last StandardStatus seen)
- `archive_status`: `active` | `under_contract` | `sold` | `off_market`
- `close_price`, `close_date`, `off_market_date`
- `list_agent_mls_id`, `buyer_agent_mls_id`, `co_list_agent_mls_id`, `co_buyer_agent_mls_id` (+ names/offices)
- `owner_snapshot` (JSON): headline, description, owner_note, note_image, tour_url, featured, hidden, copied from
  `ec_listings` just before that row is deleted
- photos are in their own tables (section 4), not on this row

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

### 4. Photos: keep all of them, under our control

**Decision (Liz, 2026-09-28): keep every photo, subject to the license check in open question 3.** Cost doesn't limit
us: at 10,000 listings × 34 photos × 217 KB (measured on the current feed) it's **~74 GB, about $1/month** on R2 (first
10 GB free, no egress charge). Even 50 photos × 500 KB is ~250 GB, about $3.60/month.

**Storage: one copy per unique image.** Each photo is saved to the existing R2 bucket `gcm-homes-media` (binding
`MEDIA`, never used so far) under a hash of its bytes, `photos/<sha256>.jpg`. A relist that reuses the same photos
stores nothing new. (Re-edited or re-shot photos are new images and get their own copy.)

**Tables:**
- `listing_photo`: `(listing_key, photo_hash, mls_order, source)`. `source` is `mls` or `owner`. The sync writes
  the `mls` rows; Grant's uploads are `owner` rows.
- `photo_decision`: owner-controlled and **never written by the sync**, like the `ec_listings` owner columns.
  `(parcel_number, photo_hash, action, sort_order)`, with `action` one of `hide` | `delete` | `main`.
  - **hide**: off the site, still stored.
  - **delete**: removed from R2, and the hash is remembered, so the sync never re-adds it even if Trestle sends it again.
  - **main** / `sort_order`: pick the lead photo and reorder the gallery.
  These are keyed by parcel + hash rather than listing key, so a decision still applies after a relist.

**Which photos the site shows:**
- **Active listing:** the gallery comes from *our* tables, not Trestle's live list. That's what makes hide/delete/reorder
  stick: today `listing_photos` is rewritten every sync, so a deletion made there would come back 2 hours later.
- **Relist ("newest photos win"):** the site groups listings by `ParcelNumber` and shows only the current listing's
  photos. Earlier listings' photos are marked superseded and hidden. Optional rule: delete superseded photos N days
  after a relist (Liz to decide N, or keep them).
- **Closed / off-market:** the **main photo only** in public. The rest stay stored for internal use. This is one
  setting, so it can change once the license question is answered.

**Where Grant manages them:** the emdash admin has no screen for a synced photo gallery, so it goes **inline on the
listing page**, gated on a logged-in admin like the Note From Grant editor. Each photo gets Hide / Delete / Make main,
the gallery can be dragged to reorder, and an Upload button adds his own photos and video. Visitors never see the
controls.

**Grant's own photography and video** (uploaded through us) is ours and is always kept and shown in full.

**First fill:** about 340,000 photo downloads for 10,000 listings. We don't know yet whether Trestle media downloads
count toward the 4,800/hour quota. If they do, the backfill runs over ~3 days of sync runs. Test that with a small
batch first. After the backfill, each new listing is only ~34 downloads.

### 5. Recently Sold by Grant (`/sold/`)

`listing_archive` where `archive_status = 'sold'` and any of the four agent-ID columns = `meyergra111`, newest
close first. **Backfill once** with a single query:
`StandardStatus eq 'Closed' and (ListAgentMlsId eq 'meyergra111' or BuyerAgentMlsId eq 'meyergra111' or …Co… )`,
which pulls his sales back to 2011 in one go. Cards show the kept photo, address, close date and a "Represented the
buyer / seller" label. Owner fields from `owner_snapshot` can power a short story per sale.

Other agents' sold data stays **internal** (market stats, neighborhood trends) until we confirm the Incline Village
MLS IDX display rules allow publishing it.

### 6. Owner checkboxes (in PR #158)

- **Featured listing**: leads the home carousel, community row and blog sidebar pick.
- **Hide from search**: removed from `/listings/`, the sitemap, featured rows, neighborhood pages and random section
  photos. The detail page still opens by direct link, with `noindex`.
Both are `ec_listings` owner columns that the sync never writes. The archive keeps them in `owner_snapshot`.

## Stages and estimates

| # | Stage | Who | Estimate |
|---|---|---|---|
| 1 | `listing_archive` table + sync upsert + owner snapshot before delete | Vince | 3–4 h |
| 2 | "What changed" follow-up query (sold / under contract / off-market) | Vince | 2–3 h |
| 3 | Photo copy to R2 (all photos, hashed / de-duplicated) + `listing_photo` table | Vince | 4–6 h |
| 4 | Site serves galleries from our tables: relist grouping, closed = main photo only | Vince or Liz/Claude | 3–4 h |
| 5 | `photo_decision` table + inline photo manager on the listing page (hide / delete / main / reorder / upload) | Liz/Claude | 6–8 h |
| 6 | "Previous listings of this property" reference field in the admin | Vince or Liz/Claude | 2–3 h |
| 7 | One-time backfill of Grant's past sales (+ their photos) | Vince | 1–2 h |
| 8 | `/sold/` Recently Sold by Grant page | Liz/Claude | 4–6 h |
| 9 | After-action report per sale | later | — |

Stage 1 is the urgent one. Until it ships, every sync keeps deleting history.

## Open questions

1. **Under contract / pending:** show them on the site with a badge (common on agent sites), or keep them archived only?
   Today they vanish from the site the moment they go under contract.
2. After a relist, keep the superseded photos forever, or delete them after N days?
3. **License check before building stage 3.** Ask the MLS (feed `OriginatingSystemName` = `INCLINE`) or Trestle
   support: (a) Can we keep listing photos after a listing closes or goes off-market, for internal use? (b) Can we show
   the main photo of a sold listing publicly? (c) Can other agents' sold listings be shown publicly at all, or only
   internally? The photos are the photographer's/listing agent's, licensed to us through IDX, and many IDX agreements
   require off-market listings to come down within a set time. Grant's own listings are the safe case either way.
4. `_trestle_probe` in D1 still holds the two probe responses. Drop it once this plan is agreed.
