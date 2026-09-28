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
- `photo_keys` (JSON): R2 keys of the kept photos (below)

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

### 4. Photos: keep a few, host Grant's own

- **From Trestle:** keep the **primary photo plus 2 more** per listing (default: MLS order 2 and 3 until Liz names
  the "particular places" they're for). Copy them into the existing R2 bucket `gcm-homes-media` (binding `MEDIA`,
  never used so far) at `listings/<ListingKey>/<n>.jpg` when a listing is first seen, so they survive a close.
- **Grant's own photography and video** go up through the emdash admin (emdash media is already R2-backed), and
  are always kept in full.
- Storage at 10,000 listings: 3 photos × ~500 KB ≈ **15 GB, about $0.08/month** on R2 (first 10 GB free, no egress
  charge). Primary photo only ≈ 5 GB, which is free. Keeping every photo (~34 per listing) would be ~74 GB; we're not
  doing that.

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
| 3 | Photo copy to R2 (primary + 2) | Vince | 3–4 h |
| 4 | "Previous listings of this property" reference field in the admin | Vince or Liz/Claude | 2–3 h |
| 5 | One-time backfill of Grant's past sales | Vince | 1–2 h |
| 6 | `/sold/` Recently Sold by Grant page | Liz/Claude | 4–6 h |
| 7 | After-action report per sale | later | — |

Stage 1 is the urgent one. Until it ships, every sync keeps deleting history.

## Open questions

1. **Under contract / pending:** show them on the site with a badge (common on agent sites), or keep them archived only?
   Today they vanish from the site the moment they go under contract.
2. Which 2 extra photos, and for which "particular places"?
3. Can other agents' sold listings ever be shown publicly (Incline Village MLS IDX rules), or internal only?
4. `_trestle_probe` in D1 still holds the two probe responses. Drop it once this plan is agreed.
