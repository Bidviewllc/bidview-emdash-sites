// Every website form submission is saved to D1 (`form_submissions`) BEFORE any
// email or ActiveCampaign call, so a lead is never lost to a failed send.
// Delivery is recorded on the same row afterwards (`sent` / `partial` /
// `failed`), which makes failures visible and recoverable.
//
// Storage must never block the form: every DB error is logged and swallowed.

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<{ meta?: { last_row_id?: number } }>;
};
type D1Database = {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
};

export type SubmissionSource = 'pricing-calculator' | 'hearing-wellness';
export type DeliveryStatus = 'pending' | 'sent' | 'partial' | 'failed';

// Mirrors scripts/sql/form-submissions.sql. Created lazily too, so a fresh or
// copied database (staging, a rebuilt D1) still stores leads.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    payload TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    delivery_detail TEXT,
    page_url TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON form_submissions(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_form_submissions_email ON form_submissions(email)`,
];

let schemaReady: Promise<void> | undefined;

async function getDb(): Promise<D1Database | undefined> {
  try {
    const mod = await import('cloudflare:workers');
    return (mod as { env?: { DB?: D1Database } }).env?.DB;
  } catch {
    return undefined; // not running on Workers (local node dev)
  }
}

function ensureSchema(db: D1Database): Promise<void> {
  if (!schemaReady) {
    schemaReady = db
      .batch(SCHEMA.map((sql) => db.prepare(sql)))
      .then(() => undefined)
      .catch((error) => {
        schemaReady = undefined; // retry on the next request
        throw error;
      });
  }
  return schemaReady;
}

const clip = (value: unknown, max: number) =>
  typeof value === 'string' && value ? value.slice(0, max) : null;

/** Saves a submission. Returns the row id, or null if it could not be stored. */
export async function saveSubmission(input: {
  source: SubmissionSource;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  payload?: unknown;
  request?: Request;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await ensureSchema(db);
    const result = await db
      .prepare(
        `INSERT INTO form_submissions
           (source, first_name, last_name, email, phone, payload, page_url, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.source,
        clip(input.firstName, 200),
        clip(input.lastName, 200),
        clip(input.email, 320),
        clip(input.phone, 50),
        input.payload === undefined ? null : JSON.stringify(input.payload),
        clip(input.request?.headers.get('referer'), 500),
        clip(input.request?.headers.get('user-agent'), 500)
      )
      .run();
    return result.meta?.last_row_id ?? null;
  } catch (error) {
    console.error(`[form-submissions] save failed (${input.source}):`, error);
    return null;
  }
}

/** Records the outcome of the email / ActiveCampaign delivery on a saved row. */
export async function markDelivery(id: number | null, status: DeliveryStatus, detail?: string): Promise<void> {
  if (id === null) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .prepare(
        `UPDATE form_submissions
            SET delivery_status = ?, delivery_detail = ?,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ?`
      )
      .bind(status, clip(detail, 2000), id)
      .run();
  } catch (error) {
    console.error(`[form-submissions] delivery update failed (id ${id}):`, error);
  }
}
