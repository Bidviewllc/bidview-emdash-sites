-- Grant C. Meyer Homes — Cloudflare D1 schema (Path B: Trestle replication).
-- The Worker serves everything from these tables and never calls Trestle, so it
-- never hits Trestle's WAF (which blocks Cloudflare egress). A sync job on a
-- non-blocked host (Vercel/local) refreshes them on a schedule.

CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,   -- Trestle ListingKey
  slug          TEXT,               -- city-state/address
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT,
  price         REAL,
  beds          INTEGER,
  baths         INTEGER,
  baths_full    INTEGER,
  baths_half    INTEGER,
  sqft          REAL,
  lot_acres     REAL,
  year_built    INTEGER,
  garage        INTEGER,
  type          TEXT,
  sub_type      TEXT,
  category      TEXT,               -- derived, non-overlapping (categoryOf)
  status        TEXT,
  lat           REAL,
  lng           REAL,
  view          TEXT,
  waterfront    INTEGER,            -- 0/1
  dom           INTEGER,
  photos_count  INTEGER,
  agent         TEXT,
  office        TEXT,
  taxes         REAL,
  hoa_fee       REAL,
  heating       TEXT,
  cooling       TEXT,
  parking       TEXT,
  appliances    TEXT,
  description   TEXT,               -- PublicRemarks
  photo         TEXT,               -- primary MediaURL (Order 1)
  updated       TEXT,               -- ModificationTimestamp
  -- Added 2026-08-19 (Liz's field request). These went into the live DB by
  -- ALTER TABLE and were never backfilled here, so a database rebuilt from this
  -- file alone used to break the sync on its first insert. Recorded 2026-09-10.
  flooring           TEXT,
  fireplaces         INTEGER,
  fireplace_yn       INTEGER,          -- 0/1
  fireplace_features TEXT,
  roof               TEXT,
  utilities          TEXT,
  pool_features      TEXT,
  listing_date       TEXT,             -- ListingContractDate (100% populated)
  hoa_frequency      TEXT,
  tour_url_mls       TEXT,             -- VirtualTourURLUnbranded
  mls_number         TEXT,             -- ListingId
  stories            INTEGER,
  arch_style         TEXT,
  construction       TEXT,
  lot_features       TEXT,
  condition          TEXT,
  lot_sqft           INTEGER,          -- derived: LotSizeAcres * 43560
  -- Added 2026-09-10: total days across relists (DaysOnMarket resets on a new
  -- listing contract, this does not). Like dom, the feed freezes it at
  -- ModificationTimestamp -- both are recomputed live in lib/listings.ts.
  cum_dom            INTEGER
);
CREATE INDEX IF NOT EXISTS idx_listings_slug   ON listings(slug);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

-- Full photo galleries for the detail pages (browser fetches the URLs directly
-- from Trestle, which is not WAF-blocked; only server-side CF egress is).
CREATE TABLE IF NOT EXISTS listing_photos (
  listing_key TEXT NOT NULL,
  ord         INTEGER NOT NULL,
  url         TEXT NOT NULL,
  PRIMARY KEY (listing_key, ord)
);
CREATE INDEX IF NOT EXISTS idx_photos_key ON listing_photos(listing_key);

-- Sold / off-market archive (2026-11-03). Created and extended by sync.mjs itself
-- (ensureSchema), so this is documentation: every `listings` column, plus the
-- columns below. Nothing ever deletes from it. See sites/gcm-homes/SOLD-ARCHIVE-PLAN.md.
--   parcel_number, list_agent_id, buyer_agent_id, co_list_agent_id, co_buyer_agent_id,
--   buyer_agent, buyer_office,
--   feed_status      -- last StandardStatus the feed reported
--   archive_status   -- active | under_contract | sold | off_market | unknown
--   close_price REAL, close_date, off_market_date, contract_date,
--   first_seen_at, last_seen_at,
--   owner_snapshot   -- JSON of Grant's ec_listings fields, copied as the row departs
--   main_photo_url   -- the lead MLS photo URL, so a sold listing still has a picture
--   source           -- sync | backfill
-- Indexes: archive_status, slug, parcel_number, close_date.

CREATE TABLE IF NOT EXISTS sync_meta (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  last_synced_at TEXT,
  count          INTEGER
);
