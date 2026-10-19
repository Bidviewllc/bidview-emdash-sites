// Pin collections to the top of the admin sidebar's content list, in the order
// given (EmDash's collection sort order). Everything else keeps the
// alphabetical order after them. Collections that already have a position
// (the Pages folder, Page templates, Shared sections) keep their order after the pinned ones.
//   npx tsx scripts/pin-collections.ts <site url> practice [more slugs...]
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { EmDashClient } from "emdash/client";

const [site, ...slugs] = process.argv.slice(2);
if (!site || !slugs.length) throw new Error("Usage: npx tsx scripts/pin-collections.ts <site url> <slug> [slug...]");
const base = site.replace(/\/$/, "");
const authPath = join(homedir(), ".config", "emdash", "auth.json");
const auth = JSON.parse(readFileSync(authPath, "utf8"));
const cred = auth[base];
if (!cred) throw new Error(`Not signed in to ${base}. Run: npx emdash login --url ${base}`);
let token = cred.accessToken;
const client = new EmDashClient({
	baseUrl: base,
	token,
	refreshToken: cred.refreshToken,
	onTokenRefresh: (accessToken, expiresIn) => {
		token = accessToken;
		auth[base] = { ...cred, accessToken, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
		writeFileSync(authPath, JSON.stringify(auth, null, 2));
	},
});

// Listing first also refreshes an expired sign-in.
const before = await client.collections();
console.log("Before:", before.map((c) => `${c.slug}${c.sortOrder != null ? `(${c.sortOrder})` : ""}`).join(", "));
const res = await fetch(`${base}/_emdash/api/schema/collections/reorder`, {
	method: "POST",
	headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-EmDash-Request": "1" },
	body: JSON.stringify({ slugs: [...slugs, ...before.filter((c) => c.sortOrder != null && !slugs.includes(c.slug)).sort((a, b) => a.sortOrder! - b.sortOrder!).map((c) => c.slug)] }),
});
if (!res.ok) throw new Error(`Reorder failed: ${res.status} ${await res.text()}`);
const after = await client.collections();
console.log("After: ", after.map((c) => `${c.slug}${c.sortOrder != null ? `(${c.sortOrder})` : ""}`).join(", "));
