/**
 * Re-import all practices into ec_practices on remote D1.
 * Uses INSERT OR REPLACE so existing 780 rows update, missing ~3,600 get added.
 *
 * Usage: node scripts/import-ec-practices-remote.mjs
 */

import { readFileSync } from "fs";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(PROJECT_ROOT, "..", "..", "audiologist-directory-handoff", "data");
const DB_NAME = "audiologist-directory-db";
const BATCH = 5;

function slugify(str) {
	return (str || "").toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 120);
}
function stateSlug(code) {
	const m = { AL:"alabama",AK:"alaska",AZ:"arizona",AR:"arkansas",CA:"california",CO:"colorado",CT:"connecticut",DE:"delaware",FL:"florida",GA:"georgia",HI:"hawaii",ID:"idaho",IL:"illinois",IN:"indiana",IA:"iowa",KS:"kansas",KY:"kentucky",LA:"louisiana",ME:"maine",MD:"maryland",MA:"massachusetts",MI:"michigan",MN:"minnesota",MS:"mississippi",MO:"missouri",MT:"montana",NE:"nebraska",NV:"nevada",NH:"new-hampshire",NJ:"new-jersey",NM:"new-mexico",NY:"new-york",NC:"north-carolina",ND:"north-dakota",OH:"ohio",OK:"oklahoma",OR:"oregon",PA:"pennsylvania",RI:"rhode-island",SC:"south-carolina",SD:"south-dakota",TN:"tennessee",TX:"texas",UT:"utah",VT:"vermont",VA:"virginia",WA:"washington",WV:"west-virginia",WI:"wisconsin",WY:"wyoming",DC:"district-of-columbia" };
	return m[code?.toUpperCase()] || slugify(code);
}
function esc(str) {
	if (str == null || str === "") return "NULL";
	return "'" + String(str).replace(/'/g, "''") + "'";
}
function escNum(val) {
	if (val == null || val === "" || isNaN(val)) return "NULL";
	return Number(val);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runSQL(sql, retries = 5) {
	const tmpFile = resolve(PROJECT_ROOT, "scripts", "_tmp_ec.sql");
	fs.writeFileSync(tmpFile, sql, "utf8");
	for (let a = 1; a <= retries; a++) {
		try {
			execSync(`npx wrangler d1 execute ${DB_NAME} --remote --file="${tmpFile}"`, { cwd: PROJECT_ROOT, stdio: "pipe", timeout: 300000 });
			try { fs.unlinkSync(tmpFile); } catch {}
			return;
		} catch (e) {
			if (a < retries) {
				process.stdout.write(` [retry ${a}]`);
				await sleep(2000 + a * 1000);
			} else {
				try { fs.unlinkSync(tmpFile); } catch {}
				throw e;
			}
		}
	}
}

console.log("Reading CSVs...");
const extracted = parse(readFileSync(resolve(DATA_DIR, "practices_extracted.csv")), { columns: true, skip_empty_lines: true, relax_column_count: true });
const gmaps = parse(readFileSync(resolve(DATA_DIR, "practices_google_maps.csv")), { columns: true, skip_empty_lines: true, relax_column_count: true });

const gm = new Map(); for (const g of gmaps) gm.set(String(g.hh_id), g);

const practices = [];
for (const s of extracted) {
	const g = gm.get(String(s.hh_id));
	if (g?.gmaps_permanently_closed === "True" || g?.gmaps_permanently_closed === "true") continue;
	if (g?.match_method === "low") continue;
	const name = s.practice_name || g?.gmaps_name || "Unknown";
	const city = g?.gmaps_city || s.city || "";
	const sc = s.state || "";
	practices.push({
		hh_id: parseInt(s.hh_id), name, practice_slug: slugify(name + " " + city),
		city, state_code: sc, state_slug: stateSlug(sc),
		address: g?.gmaps_address || [s.address_street, s.address_city, s.address_state, s.address_zip].filter(Boolean).join(", "),
		zip: g?.gmaps_zip || s.address_zip || "", lat: parseFloat(g?.gmaps_lat) || null, lng: parseFloat(g?.gmaps_lng) || null,
		phone: g?.gmaps_phone || s.phone || "", website: s.practice_website || g?.gmaps_website || "",
		rating: parseFloat(g?.gmaps_rating) || 0, reviews_count: parseInt(g?.gmaps_reviews_count) || 0,
		practice_type: s.practice_type || "", specializations: s.specializations || "",
		hearing_aid_brands: s.hearing_aid_brands || "", insurance_plans: s.insurance_plans || "",
		services: (s.services || "").split("|").slice(0, 8).join("|"), accepts_va: s.accepts_va || "",
		hours_json: g?.gmaps_hours_json || "", photo_url: (g?.gmaps_photo_urls || "").split("|")[0] || "",
		gmaps_url: g?.gmaps_url || "",
	});
}
console.log(`${practices.length} practices to upsert`);

console.log("\n📥 ec_practices...");
for (let i = 0; i < practices.length; i += BATCH) {
	const b = practices.slice(i, i + BATCH);
	const sql = b.map(p => {
		const id = `practice-${p.hh_id}`;
		return `INSERT OR REPLACE INTO ec_practices (id, slug, status, published_at, created_at, updated_at, hh_id, name, practice_slug, city, state_code, state_slug, address, zip, lat, lng, phone, website, rating, reviews_count, practice_type, specializations_list, hearing_aid_brands_list, insurance_plans_list, services_list, accepts_va, hours_json, photo_url, gmaps_url) VALUES (${esc(id)}, ${esc(p.practice_slug)}, 'published', datetime('now'), datetime('now'), datetime('now'), ${escNum(p.hh_id)}, ${esc(p.name)}, ${esc(p.practice_slug)}, ${esc(p.city)}, ${esc(p.state_code)}, ${esc(p.state_slug)}, ${esc(p.address)}, ${esc(p.zip)}, ${escNum(p.lat)}, ${escNum(p.lng)}, ${esc(p.phone)}, ${esc(p.website)}, ${escNum(p.rating)}, ${escNum(p.reviews_count)}, ${esc(p.practice_type)}, ${esc(p.specializations)}, ${esc(p.hearing_aid_brands)}, ${esc(p.insurance_plans)}, ${esc(p.services)}, ${esc(p.accepts_va)}, ${esc(p.hours_json)}, ${esc(p.photo_url)}, ${esc(p.gmaps_url)});`;
	}).join("\n");
	await runSQL(sql);
	process.stdout.write(`\r  ${Math.min(i+BATCH, practices.length)}/${practices.length}`);
	if (i % 25 === 0 && i > 0) await sleep(500);
}
console.log("\n\n✅ ec_practices remote import complete!");
