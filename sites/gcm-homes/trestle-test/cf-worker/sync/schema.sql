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
  updated       TEXT                -- ModificationTimestamp
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

CREATE TABLE IF NOT EXISTS sync_meta (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  last_synced_at TEXT,
  count          INTEGER
);
