import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  subject?: unknown;
  message?: unknown;
};

const MAX_LENGTHS = {
  name: 120,
  email: 180,
  phone: 60,
  subject: 180,
  message: 4000,
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function validatePayload(payload: ContactPayload) {
  const name = clean(payload.name, MAX_LENGTHS.name);
  const email = clean(payload.email, MAX_LENGTHS.email).toLowerCase();
  const phone = clean(payload.phone, MAX_LENGTHS.phone);
  const subject = clean(payload.subject, MAX_LENGTHS.subject);
  const message = String(payload.message ?? "").trim().slice(0, MAX_LENGTHS.message);

  if (!name || !email || !message) {
    return { ok: false as const, error: "Please complete all required fields." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Please enter a valid email address." };
  }

  return { ok: true as const, data: { name, email, phone, subject, message } };
}

async function readPayload(request: Request): Promise<ContactPayload> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await request.json();

  const form = await request.formData();
  return {
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone"),
    subject: form.get("subject"),
    message: form.get("message"),
  };
}

async function saveToD1(db: any, data: { name: string; email: string; phone: string; subject: string; message: string }) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS contact_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'website_contact_form',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run();

  await db
    .prepare(
      `INSERT INTO contact_submissions (name, email, phone, subject, message, source)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(data.name, data.email, data.phone || null, data.subject || null, data.message, "website_contact_form")
    .run();
}

async function saveToLocalSqlite(data: { name: string; email: string; phone: string; subject: string; message: string }) {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database("data.db");
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS contact_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'website_contact_form',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    db.prepare(
      `INSERT INTO contact_submissions (name, email, phone, subject, message, source)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(data.name, data.email, data.phone || null, data.subject || null, data.message, "website_contact_form");
  } finally {
    db.close();
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await readPayload(request);
    const validated = validatePayload(payload);

    if (!validated.ok) return jsonResponse({ ok: false, error: validated.error }, 400);

    const runtimeDb = (env as any)?.DB;
    if (runtimeDb) await saveToD1(runtimeDb, validated.data);
    else await saveToLocalSqlite(validated.data);

    return jsonResponse({ ok: true, message: "Message sent. Thank you for reaching out." });
  } catch (error) {
    console.error("Contact form submission failed", error);
    return jsonResponse({ ok: false, error: "We couldn't send your message right now. Please try again or call (813) 851-2311." }, 500);
  }
};

export const GET: APIRoute = async () => jsonResponse({ ok: false, error: "Method not allowed" }, 405);


