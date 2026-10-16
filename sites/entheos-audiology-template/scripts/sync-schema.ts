// Brings a site that is already set up in line with the seed's schema: adds
// collections and fields that are missing. Never removes or changes existing
// fields. Content: a new collection gets the seed records; see below for fields.
//
//   npx emdash login --url <site>          (once; the site admin approves a code)
//   npx tsx scripts/sync-schema.ts <site>  (dry run: lists what it would add)
//   npx tsx scripts/sync-schema.ts <site> --apply
//
// With --apply it also fills new fields on existing records with the seed's
// sample value (for example the Practice details design choices) and publishes
// those records, so the admin doesn't show empty fields.
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { EmDashClient } from "emdash/client";
import { saveKeepingDraft } from "./keep-draft";

const [site, flag] = process.argv.slice(2);
if (!site) throw new Error("Usage: npx tsx scripts/sync-schema.ts <site url> [--apply]");
const apply = flag === "--apply";
const base = site.replace(/\/$/, "");

const authPath = join(homedir(), ".config", "emdash", "auth.json");
const auth = JSON.parse(readFileSync(authPath, "utf8"));
const cred = auth[base];
if (!cred) throw new Error(`Not signed in to ${base}. Run: npx emdash login --url ${base}`);
const client = new EmDashClient({
	baseUrl: base,
	token: cred.accessToken,
	refreshToken: cred.refreshToken,
	onTokenRefresh: (accessToken, expiresIn) => {
		auth[base] = { ...cred, accessToken, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
		writeFileSync(authPath, JSON.stringify(auth, null, 2));
	},
});

const seed = JSON.parse(readFileSync(new URL("../seed/seed.json", import.meta.url), "utf8"));
const existing = new Set((await client.collections()).map((c: { slug: string }) => c.slug));

for (const col of seed.collections) {
	if (!existing.has(col.slug)) {
		console.log(`+ collection ${col.slug} (${col.fields.length} fields)`);
		const entries = (seed.content?.[col.slug] ?? []) as { slug: string; status?: string; data: Record<string, unknown> }[];
		if (entries.length) console.log(`  + ${entries.length} starting records`);
		if (apply) {
			const { fields, ...rest } = col;
			await client.createCollection(rest);
			for (const f of fields) await client.createField(col.slug, f);
			// A new collection gets the seed's records (e.g. the Pages list), published.
			for (const e of entries) {
				const item = await client.create(col.slug, { slug: e.slug, data: e.data });
				if (e.status === "published") await client.publish(col.slug, item.id);
			}
		}
		continue;
	}
	const current = (await client.collection(col.slug)).fields as { slug: string; widget?: string | null; options?: unknown; validation?: unknown }[];
	const have = new Set(current.map((f) => f.slug));
	const missing = col.fields.filter((f: { slug: string }) => !have.has(f.slug));

	// Existing fields: only the admin editing widget is brought in line (e.g. the
	// page-settings widget on the Pages list). Type, label and choices are left alone.
	for (const f of col.fields as { slug: string; widget?: string; options?: unknown }[]) {
		const now = current.find((c) => c.slug === f.slug);
		if (!now || (now.widget ?? "") === (f.widget ?? "")) continue;
		console.log(`~ widget ${col.slug}.${f.slug}: ${now.widget || "default"} -> ${f.widget || "default"}`);
		if (apply)
			await (client as any).request("PUT", `/schema/collections/${col.slug}/fields/${f.slug}`, {
				widget: f.widget ?? "",
				options: f.options ?? {},
				validation: now.validation ?? null,
			});
	}
	for (const f of missing) {
		console.log(`+ field ${col.slug}.${f.slug} (${f.type})`);
		if (apply) await client.createField(col.slug, f);
	}
	if (!apply || !missing.length) continue;

	// Fill the new fields on existing records from the seed's sample content.
	const samples = new Map<string, Record<string, unknown>>((seed.content?.[col.slug] ?? []).map((e: { slug: string; data: Record<string, unknown> }) => [e.slug, e.data]));
	const { items } = await client.list(col.slug, { limit: 100 });
	for (const item of items) {
		const sample = samples.get(item.slug ?? "");
		if (!sample) continue;
		const data = Object.fromEntries(missing.filter((f: { slug: string }) => f.slug in sample).map((f: { slug: string }) => [f.slug, sample[f.slug]]));
		if (!Object.keys(data).length) continue;
		const how = await saveKeepingDraft(client, col.slug, item.slug!, data);
		console.log(`  filled ${col.slug}/${item.slug}: ${Object.keys(data).join(", ")} (${how})`);
	}
}
console.log(apply ? "Done." : "Dry run. Add --apply to make these changes.");
