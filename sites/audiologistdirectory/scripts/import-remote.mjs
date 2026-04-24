/**
 * Lightweight remote-only import for practices_search, providers, reviews.
 * Skips ec_practices (already partially imported + handled by admin).
 * Smaller batches (5), aggressive retries (5), longer delays.
 *
 * Usage: node scripts/import-remote.mjs
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
function stateName(code) {
	const m = { AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",DC:"District of Columbia" };
	return m[code?.toUpperCase()] || code;
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
	const tmpFile = resolve(PROJECT_ROOT, "scripts", "_tmp.sql");
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

// ── Read + merge ──────────────────────────────────────
console.log("Reading CSVs...");
const extracted = parse(readFileSync(resolve(DATA_DIR, "practices_extracted.csv")), { columns: true, skip_empty_lines: true, relax_column_count: true });
const gmaps = parse(readFileSync(resolve(DATA_DIR, "practices_google_maps.csv")), { columns: true, skip_empty_lines: true, relax_column_count: true });
const reviewsRaw = parse(readFileSync(resolve(DATA_DIR, "practices_google_reviews.csv")), { columns: true, skip_empty_lines: true, relax_column_count: true });
console.log(`  ${extracted.length} extracted, ${gmaps.length} gmaps, ${reviewsRaw.length} reviews`);

const gm = new Map(); for (const g of gmaps) gm.set(String(g.hh_id), g);

const practices = []; const providers = [];
for (const s of extracted) {
	const g = gm.get(String(s.hh_id));
	if (g?.gmaps_permanently_closed === "True" || g?.gmaps_permanently_closed === "true") continue;
	if (g?.match_method === "low") continue;
	const name = s.practice_name || g?.gmaps_name || "Unknown";
	const city = g?.gmaps_city || s.city || "";
	const sc = s.state || "";
	practices.push({
		hh_id: parseInt(s.hh_id), name, practice_slug: slugify(name + " " + city),
		city, city_slug: slugify(city), state_code: sc, state_name: stateName(sc), state_slug: stateSlug(sc),
		address: g?.gmaps_address || [s.address_street, s.address_city, s.address_state, s.address_zip].filter(Boolean).join(", "),
		zip: g?.gmaps_zip || s.address_zip || "", lat: parseFloat(g?.gmaps_lat) || null, lng: parseFloat(g?.gmaps_lng) || null,
		phone: g?.gmaps_phone || s.phone || "", website: s.practice_website || g?.gmaps_website || "",
		rating: parseFloat(g?.gmaps_rating) || 0, reviews_count: parseInt(g?.gmaps_reviews_count) || 0,
		practice_type: s.practice_type || "", specializations: s.specializations || "",
		hearing_aid_brands: s.hearing_aid_brands || "", insurance_plans: s.insurance_plans || "",
		services: (s.services || "").split("|").slice(0, 8).join("|"), accepts_va: s.accepts_va || "",
		hours_json: g?.gmaps_hours_json || "", photo_url: (g?.gmaps_photo_urls || "").split("|")[0] || "",
		gmaps_url: g?.gmaps_url || "", match_confidence: parseFloat(g?.match_confidence) || 0,
	});
	if (s.providers) {
		for (const p of s.providers.split("|")) {
			const m = p.trim().match(/^(.+?)\s*\(([^)]+)\)\s*$/);
			if (m) providers.push({ hh_id: parseInt(s.hh_id), name: m[1].trim(), credential: m[2].trim() });
			else if (p.trim()) providers.push({ hh_id: parseInt(s.hh_id), name: p.trim(), credential: "" });
		}
	}
}
console.log(`${practices.length} practices, ${providers.length} providers, ${reviewsRaw.length} reviews`);

// ── practices_search ──────────────────────────────────
console.log("\n📥 practices_search...");
for (let i = 0; i < practices.length; i += BATCH) {
	const b = practices.slice(i, i + BATCH);
	const sql = b.map(p => `INSERT OR REPLACE INTO practices_search (hh_id,practice_slug,name,city,city_slug,state_code,state_name,state_slug,address,zip,lat,lng,phone,website,rating,reviews_count,practice_type,specializations,hearing_aid_brands,insurance_plans,services,accepts_va,hours_json,photo_url,gmaps_url,match_confidence,is_active) VALUES (${escNum(p.hh_id)},${esc(p.practice_slug)},${esc(p.name)},${esc(p.city)},${esc(p.city_slug)},${esc(p.state_code)},${esc(p.state_name)},${esc(p.state_slug)},${esc(p.address)},${esc(p.zip)},${escNum(p.lat)},${escNum(p.lng)},${esc(p.phone)},${esc(p.website)},${escNum(p.rating)},${escNum(p.reviews_count)},${esc(p.practice_type)},${esc(p.specializations)},${esc(p.hearing_aid_brands)},${esc(p.insurance_plans)},${esc(p.services)},${esc(p.accepts_va)},${esc(p.hours_json)},${esc(p.photo_url)},${esc(p.gmaps_url)},${escNum(p.match_confidence)},1);`).join("\n");
	await runSQL(sql);
	process.stdout.write(`\r  ${Math.min(i+BATCH, practices.length)}/${practices.length}`);
	if (i % 25 === 0 && i > 0) await sleep(500);
}
console.log("\n  ✅ done");

// ── providers ─────────────────────────────────────────
console.log("\n📥 providers...");
for (let i = 0; i < providers.length; i += BATCH) {
	const b = providers.slice(i, i + BATCH);
	const sql = b.map(p => `INSERT INTO providers (hh_id,name,credential) VALUES (${escNum(p.hh_id)},${esc(p.name)},${esc(p.credential)});`).join("\n");
	await runSQL(sql);
	process.stdout.write(`\r  ${Math.min(i+BATCH, providers.length)}/${providers.length}`);
	if (i % 25 === 0 && i > 0) await sleep(500);
}
console.log("\n  ✅ done");

// ── reviews ───────────────────────────────────────────
console.log("\n📥 reviews...");
for (let i = 0; i < reviewsRaw.length; i += BATCH) {
	const b = reviewsRaw.slice(i, i + BATCH);
	const sql = b.map(r => `INSERT INTO reviews (hh_id,gmaps_place_id,stars,text,published_at) VALUES (${escNum(r.hh_id)},${esc(r.gmaps_place_id)},${escNum(r.stars)},${esc(r.text)},${esc(r.published_at)});`).join("\n");
	await runSQL(sql);
	process.stdout.write(`\r  ${Math.min(i+BATCH, reviewsRaw.length)}/${reviewsRaw.length}`);
	if (i % 25 === 0 && i > 0) await sleep(500);
}
console.log("\n  ✅ done");

console.log("\n✅ Remote import complete!");
console.log(`  practices_search: ${practices.length}`);
console.log(`  providers: ${providers.length}`);
console.log(`  reviews: ${reviewsRaw.length}`);
