-- Custom D1 tables for reviews, providers, and practices search index
-- These sit alongside emdash's own tables in the same D1 database

-- Reviews (22K rows from practices_google_reviews.csv)
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hh_id INTEGER NOT NULL,
    gmaps_place_id TEXT,
    stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
    text TEXT DEFAULT '',
    published_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_hh_id ON reviews(hh_id);
CREATE INDEX IF NOT EXISTS idx_reviews_stars ON reviews(stars);

-- Providers (~2.2K rows parsed from pipe-delimited field)
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hh_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    credential TEXT DEFAULT '',
    title TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_providers_hh_id ON providers(hh_id);

-- Practices search index (mirrors key fields from emdash practices collection for fast queries)
-- This is the table Astro pages query for search, state/city listings, and geo-distance
CREATE TABLE IF NOT EXISTS practices_search (
    hh_id INTEGER PRIMARY KEY,
    practice_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT DEFAULT '',
    city_slug TEXT DEFAULT '',
    state_code TEXT DEFAULT '',
    state_name TEXT DEFAULT '',
    state_slug TEXT DEFAULT '',
    address TEXT DEFAULT '',
    zip TEXT DEFAULT '',
    lat REAL,
    lng REAL,
    phone TEXT DEFAULT '',
    website TEXT DEFAULT '',
    rating REAL DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    practice_type TEXT DEFAULT '',
    specializations TEXT DEFAULT '',
    hearing_aid_brands TEXT DEFAULT '',
    insurance_plans TEXT DEFAULT '',
    services TEXT DEFAULT '',
    accepts_va TEXT DEFAULT '',
    hours_json TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    gmaps_url TEXT DEFAULT '',
    match_confidence REAL DEFAULT 1.0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ps_state ON practices_search(state_slug);
CREATE INDEX IF NOT EXISTS idx_ps_city ON practices_search(city_slug, state_slug);
CREATE INDEX IF NOT EXISTS idx_ps_rating ON practices_search(rating DESC);
CREATE INDEX IF NOT EXISTS idx_ps_type ON practices_search(practice_type);
CREATE INDEX IF NOT EXISTS idx_ps_slug ON practices_search(practice_slug);
CREATE INDEX IF NOT EXISTS idx_ps_active ON practices_search(is_active);
CREATE INDEX IF NOT EXISTS idx_ps_geo ON practices_search(lat, lng);
