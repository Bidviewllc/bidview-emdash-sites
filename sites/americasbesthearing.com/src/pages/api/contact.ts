import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});

function value(data: Record<string, unknown>, ...keys: string[]) {
	for (const key of keys) {
		const candidate = data[key];
		if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
			return String(candidate).trim();
		}
	}
	return "";
}

export const POST: APIRoute = async ({ request }) => {
	const db = env.DB as D1Database | undefined;
	if (!db) return json({ ok: false, error: "Contact storage is not configured." }, 500);

	const contentType = request.headers.get("content-type") || "";
	const payload = contentType.includes("application/json")
		? await request.json()
		: Object.fromEntries((await request.formData()).entries());
	const data = payload as Record<string, unknown>;
	const firstName = value(data, "firstName", "first_name", "input_1.3", "input_1_3");
	const lastName = value(data, "lastName", "last_name", "input_1.6", "input_1_6");
	const name = value(data, "name") || [firstName, lastName].filter(Boolean).join(" ");
	const email = value(data, "email", "input_3");
	const phone = value(data, "phone", "input_4");
	const clinic = value(data, "clinic", "input_5");
	const message = value(data, "message", "input_6");

	if (!name || !email || !message) {
		return json({ ok: false, error: "Please complete your name, email, and message." }, 400);
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return json({ ok: false, error: "Please enter a valid email address." }, 400);
	}

	const id = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO contact_submissions (id, name, email, phone, clinic, message, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
		)
		.bind(id, name, email, phone, clinic, message)
		.run();

	return json({ ok: true, id });
};
