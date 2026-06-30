import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

type D1DatabaseLike = {
	prepare(query: string): {
		bind(...values: unknown[]): {
			run(): Promise<unknown>;
		};
		run(): Promise<unknown>;
	};
};

type ContactPayload = {
	name?: unknown;
	email?: unknown;
	phone?: unknown;
	message?: unknown;
	honeypot?: unknown;
};

const MAX_FIELD_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	try {
		const payload = await readPayload(request);
		const honeypot = normalizeText(payload.honeypot, MAX_FIELD_LENGTH);
		if (honeypot) return json({ ok: true });

		const name = normalizeText(payload.name, MAX_FIELD_LENGTH);
		const email = normalizeText(payload.email, MAX_FIELD_LENGTH).toLowerCase();
		const phone = normalizeText(payload.phone, MAX_FIELD_LENGTH);
		const message = normalizeText(payload.message, MAX_MESSAGE_LENGTH);

		if (!name || !email || !phone || !message) {
			return json({ ok: false, error: "Please complete all required fields." }, 400);
		}
		if (!EMAIL_PATTERN.test(email)) {
			return json({ ok: false, error: "Please enter a valid email address." }, 400);
		}

		const db = getDatabase();
		if (!db) {
			console.error("Contact form submission failed: DB binding is unavailable.");
			return json({ ok: false, error: "We couldn't send your message right now. Please try again or call (919) 505-0894." }, 500);
		}

		await db.prepare(`CREATE TABLE IF NOT EXISTS contact_submissions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT NOT NULL,
			phone TEXT,
			pet_name TEXT,
			message TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`).run();

		await db
			.prepare(`INSERT INTO contact_submissions (name, email, phone, pet_name, message)
				VALUES (?, ?, ?, ?, ?)`)
			.bind(name, email, phone, null, message)
			.run();

		return json({ ok: true });
	} catch (error) {
		console.error("Contact form submission failed:", error);
		return json({ ok: false, error: "We couldn't send your message right now. Please try again or call (919) 505-0894." }, 500);
	}
};

export const GET: APIRoute = async () => json({ ok: false, error: "Method not allowed." }, 405);

async function readPayload(request: Request): Promise<ContactPayload> {
	const contentType = request.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		return await request.json() as ContactPayload;
	}
	const formData = await request.formData();
	return {
		name: formData.get("name") ?? formData.get("input_3"),
		email: formData.get("email") ?? formData.get("input_5"),
		phone: formData.get("phone") ?? formData.get("input_11"),
		message: formData.get("message") ?? formData.get("input_14"),
		honeypot: formData.get("honeypot") ?? formData.get("input_16"),
	};
}

function normalizeText(value: unknown, maxLength: number) {
	if (typeof value !== "string") return "";
	return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getDatabase() {
	return (env as { DB?: D1DatabaseLike }).DB ?? null;
}

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
