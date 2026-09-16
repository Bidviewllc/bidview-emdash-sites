-- Website form submissions (price calculator + hearing wellness quiz).
-- Rows are written by src/lib/formSubmissions.ts before any email / ActiveCampaign
-- call. The same schema is also created lazily at runtime, so this file is the
-- record of the table, not a required manual step.
--
-- Apply: POST /accounts/{account}/d1/database/{db}/query  (one statement per call)

CREATE TABLE IF NOT EXISTS form_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,                              -- 'pricing-calculator' | 'hearing-wellness'
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  payload TEXT,                                      -- JSON: estimate + quiz answers, or wellness answers + scores
  delivery_status TEXT NOT NULL DEFAULT 'pending',   -- pending | sent | partial | failed
  delivery_detail TEXT,                              -- why, when not 'sent'
  page_url TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_email ON form_submissions(email);

-- Recent leads:
--   SELECT id, created_at, source, first_name, last_name, email, phone, delivery_status
--   FROM form_submissions ORDER BY id DESC LIMIT 50;
-- Leads whose delivery did not fully succeed:
--   SELECT * FROM form_submissions WHERE delivery_status <> 'sent' ORDER BY id DESC;
