# Automated Google Reviews Sync (reviews-sync)

Status: draft for review · 2026-10-13 · Owner: Vince

## Goal

Keep Google reviews current on the EmDash sites with no one running a script and nothing depending on a laptop. Everything runs on Cloudflare. First sites: New Leaf Hearing Care, Ontario Hearing, Duet Audiology. The same mechanism must carry over to the Entheos/Bidview template, so nothing here may assume a particular practice.

## Today (read from the code on `main` and the Ontario branch)

| Site | Script | Output | Place ID(s) | Update needs |
| --- | --- | --- | --- | --- |
| New Leaf | `scripts/sync-reviews.mjs` | D1 tables `reviews`, `review_meta`, plus a build-time `src/reviews/reviews.json` | Arvada `ChIJB_NQqgeJa4cRS2-mBlxuxKE`, Littleton `ChIJf-CBToGBbIcRScDxPPAH700` | rebuild and deploy |
| Ontario | `scripts/fetch-google-reviews.mjs` (branch `codex/ontario-google-reviews`) | `src/data/reviews.json` | one office (Brighton): `ChIJq-Dls6fK1okRjkByx9QR3n8`; four city pages split that one listing's reviews | rebuild and deploy |
| Duet | `scripts/fetch-google-reviews.mjs` | `src/data/google-reviews.json` | `ChIJ1foTYNnqD4gRYzWwaQPCG_Q` | rebuild and deploy |

Problems: runs by hand; DataForSEO login is read from `~/.claude/credentials/apis.md` and a Cloudflare token from a path on one machine; every update needs a rebuild and deploy; three different data shapes.

D1 databases (Cameron's Cloudflare account `239e9d015c7a3a39cdc2e9400312f553`):
- New Leaf `6228c322-f3ea-4a88-9994-c32e2f3be379`
- Ontario `3e408b59-75b2-4b13-aa9e-a41e17ff678c`
- Duet `8cb09fcd-352f-4bdc-8190-cd9363341326`

## Design

### 1. One Worker: `reviews-sync`
A single Cloudflare Worker with cron triggers and one D1 binding per site database. A config file lists sites and their locations (`site`, `location_key`, `place_id`, `expected_title`). Adding a client or a template site is a config entry, not new code. No cron lives inside any site, because New Leaf and Duet have no worker file of their own.

### 2. Secrets
`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` and `SLACK_ALERTS_WEBHOOK` are Worker secrets. No file on any machine is read.

### 3. Schedule (weekly, so DataForSEO usage stays low)
- Sunday 13:00 UTC: post one reviews task per location. This is the only paid pull.
- Sunday, every 20 minutes until 17:00 UTC: check each pending task and write results when ready. Nothing new is posted.
- Monday 13:00 UTC: one catch-up check, then a Slack alert if any task is still pending.

State is kept in a `review_jobs` table in each site's D1 (`location_key`, `task_id`, `posted_at`, `status`). A location is posted only if it has no pending job and its last good sync is more than 6 days old, so a retry can never double-post.

### 4. Data and write safety
Reuse New Leaf's tables `reviews` and `review_meta`, add a `hidden INTEGER DEFAULT 0` column to `reviews`, and create `review_jobs`.
- Upsert by `review_id`. The upsert never touches `hidden`.
- Never write an empty or failed pull over existing data.
- Compare the returned `title` and `place_id` with the configured expected values. On a mismatch, write nothing and alert Slack. This guards against the wrong-listing case seen with Audio Help Stamford.
- Hidden reviews stay in the table, so the next sync cannot bring them back.

### 5. Sites read D1 at render
Each site gets a small shared reader that returns `{ rating, count, reviews[] }` for a location, excluding hidden reviews, and replaces the JSON imports. The trust-strip rating and count come from Google's own totals in `review_meta`, never from the displayed set, so hiding a review or a minimum-star filter cannot change them. Each site first seeds D1 from its current JSON. If D1 is empty or unreadable, the page falls back to the committed JSON, so rollout cannot blank a page.

### 6. Freshness without cache purges
Cameron's Cloudflare token cannot purge cache and the New Leaf zone cache ignores query strings. Review pages therefore get a short edge lifetime of about one hour. Ontario's worker needs the review paths exempted from the global `CACHE_VERSION` cache.

### 7. Template reuse
The Worker, the config shape, the tables and the reader helper are written site-neutral so the Entheos/Bidview template can adopt them. This spec is the default for the template's reviews feature. Admin controls for the template (Place ID, minimum rating, hide a review) are out of scope for this first build.

## Out of scope
- AggregateRating schema for the practice's own reviews. It stays off.
- A reviews admin screen in EmDash.
- Other review sources.

## Open items (checked 2026-10-13)
1. **Cost:** DataForSEO bills Google Reviews per 10 reviews returned, standard queue about $0.00075 per 10 (sources: dataforseo.com/pricing/business-data/google-reviews-api and docs.dataforseo.com/v3/reviews-google-task_post). Depth 50 is about $0.004 per location per pull, rounded up to the next block of 10. Whether `task_get` is billed is not stated on those pages and is still unconfirmed. Check the first invoice line after the first real Sunday.
2. **Cloudflare token:** reads work on the New Leaf, Ontario and Duet D1 databases (`SELECT 1` succeeded on each). Write access is proven only when the first seed runs.
3. **`pingback_url`:** not used in this version. Revisit only if the Sunday checks prove unreliable.
4. **Deploy order for New Leaf:** build with `npm run build:cloudflare` and `CF_DEPLOY=1`, or it ships a stale `dist/`.

## Testing
- Unit: normalise a DataForSEO response, upsert keeps `hidden`, mismatch is rejected, empty pull is ignored.
- Dry run against one location in a no-write mode, comparing the result with the current JSON.
- After deploy: confirm the Sunday post, collect and write in the Worker logs, and confirm a page shows a review added since the seed.
