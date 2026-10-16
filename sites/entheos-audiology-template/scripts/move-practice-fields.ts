// One-off move for sites set up before 2026-10-16: page-specific fields leave
// Practice details for the page they belong to. Run sync-schema --apply first
// (it adds the new fields), then this script. It copies each value across
// (overwriting the sample the sync filled in), publishes the records that were
// published. With --delete it then deletes the old fields from Practice details:
// only once the code that reads the new places is live.
//   npx tsx scripts/move-practice-fields.ts <site url> [--apply] [--delete]
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { EmDashClient } from "emdash/client";
import { saveKeepingDraft } from "./keep-draft";

const MOVES: [from: string, toCollection: string, toField: string][] = [
	["years", "page_home", "years"],
	["first_visit", "page_services", "first_visit"],
	["milestones", "page_about", "milestones"],
	["values", "page_about", "values"],
	["team_photo", "shared_sections", "team_photo"],
	["office_photo", "page_templates", "office_photo"],
];

const [site, ...flags] = process.argv.slice(2);
if (!site) throw new Error("Usage: npx tsx scripts/move-practice-fields.ts <site url> [--apply]");
const apply = flags.includes("--apply");
const del = flags.includes("--delete");
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

const fieldsOf = async (c: string) => new Set(((await client.collection(c)).fields as { slug: string }[]).map((f) => f.slug));
const practiceFields = await fieldsOf("practice");
const practice: any = await client.get("practice", "main");
const empty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const updates = new Map<string, Record<string, unknown>>();
for (const [from, to, field] of MOVES) {
	if (!practiceFields.has(from)) { console.log(`= practice.${from}: already gone`); continue; }
	if (!(await fieldsOf(to)).has(field)) throw new Error(`${to}.${field} doesn't exist yet. Run sync-schema --apply first.`);
	const v = practice.data[from];
	const target: any = await client.get(to, "main");
	if (empty(v)) console.log(`- practice.${from}: empty, nothing to copy`);
	else if (same(v, target.data[field])) console.log(`= practice.${from}: ${to}.${field} already has it`);
	else {
		console.log(`> practice.${from} -> ${to}.${field}`);
		updates.set(to, { ...(updates.get(to) ?? {}), [field]: v });
	}
}
if (apply) {
	for (const [to, data] of updates) {
		console.log(`  updated ${to}: ${await saveKeepingDraft(client, to, "main", data)}`);
	}
	for (const [from] of del ? MOVES : []) {
		if (!practiceFields.has(from)) continue;
		await client.deleteField("practice", from);
		console.log(`  deleted practice.${from}`);
	}
}
console.log(apply ? "Done." : "Dry run. Add --apply to make these changes.");
