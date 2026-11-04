// Adds testimonials from a JSON file to a site's Testimonials, published.
// Records whose slug is already there are left alone, so it's safe to run twice.
// The Testimonials type has to exist first (scripts/sync-schema.ts).
//
//   npx emdash login --url <site>                          (once; the site admin approves a code)
//   npx tsx scripts/import-testimonials.ts <site> <file>   (dry run: lists what it would add)
//   npx tsx scripts/import-testimonials.ts <site> <file> --apply
//
// File: [{ "slug", "title" (patient name), "text", "rating" ("5 stars"), "show_on_home" }]
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { EmDashClient } from "emdash/client";

const [site, file, flag] = process.argv.slice(2);
if (!site || !file) throw new Error("Usage: npx tsx scripts/import-testimonials.ts <site url> <file.json> [--apply]");
const apply = flag === "--apply";
const base = site.replace(/\/$/, "");

const authPath = join(homedir(), ".config", "emdash", "auth.json");
const auth = JSON.parse(readFileSync(authPath, "utf8"));
// A local dev site's sign-in is saved under this folder ("path:<folder>"), not its URL.
const key = /^https?:\/\/localhost[:/]/.test(base + "/") && !auth[base] ? `path:${process.cwd()}` : base;
const cred = auth[key];
if (!cred) throw new Error(`Not signed in to ${base}. Run: npx emdash login --url ${base}`);
const client = new EmDashClient({
	baseUrl: base,
	token: cred.accessToken,
	refreshToken: cred.refreshToken,
	onTokenRefresh: (accessToken, expiresIn) => {
		auth[key] = { ...cred, accessToken, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
		writeFileSync(authPath, JSON.stringify(auth, null, 2));
	},
});

type Testimonial = { slug: string; title: string; text: string; rating?: string; show_on_home?: boolean };
const list = JSON.parse(readFileSync(file, "utf8")) as Testimonial[];

if (!(await client.collections()).some((c: { slug: string }) => c.slug === "testimonials"))
	throw new Error(`${base} has no Testimonials type yet. Run: npx tsx scripts/sync-schema.ts ${base} --apply`);
const have = new Set<string | null | undefined>();
for await (const i of client.listAll("testimonials", { limit: 100 })) have.add((i as { slug?: string | null }).slug);

for (const t of list) {
	if (have.has(t.slug)) {
		console.log(`= ${t.slug} (already there)`);
		continue;
	}
	console.log(`+ ${t.slug} ${t.title}${t.show_on_home ? " (home page)" : ""}`);
	if (!apply) continue;
	const item = await client.create("testimonials", {
		slug: t.slug,
		data: { title: t.title, text: t.text, rating: t.rating ?? "5 stars", show_on_home: !!t.show_on_home },
	});
	await client.publish("testimonials", item.id);
}
console.log(apply ? "Done." : "Dry run. Add --apply to make these changes.");
