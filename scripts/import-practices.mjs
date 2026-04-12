/**
 * Import practices, providers, and reviews into local D1
 *
 * Usage:
 *   node scripts/import-practices.mjs
 *   node scripts/import-practices.mjs --remote   (for production D1)
 *
 * What it does:
 * 1. Reads practices_extracted.csv + practices_google_maps.csv + practices_google_reviews.csv
 * 2. Joins on hh_id, cleans/normalizes
 * 3. Inserts into:
 *    - ec_practices (emdash collection table — editable in admin)
 *    - practices_search (D1 search index — queryable by Astro pages)
 *    - providers (D1 table)
 *    - reviews (D1 table)
 */

import { createReadStream, readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(PROJECT_ROOT, "..", "..", "audiologist-directory-handoff", "data");
const isRemote = process.argv.includes("--remote");
const remoteFlag = isRemote ? "--remote" : "--local";
const DB_NAME = "audiologist-directory-db";

// ── Helpers ──────────────────────────────────────────────────────────

function slugify(str) {
	return (str || "")
		.toLowerCase()
		.replace(/['']/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.substring(0, 120);
}

function stateSlug(code) {
	const map = {
		AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california",
		CO: "colorado", CT: "connecticut", DE: "delaware", FL: "florida", GA: "georgia",
		HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa",
		KS: "kansas", KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland",
		MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi", MO: "missouri",
		MT: "montana", NE: "nebraska", NV: "nevada", NH: "new-hampshire", NJ: "new-jersey",
		NM: "new-mexico", NY: "new-york", NC: "north-carolina", ND: "north-dakota", OH: "ohio",
		OK: "oklahoma", OR: "oregon", PA: "pennsylvania", RI: "rhode-island", SC: "south-carolina",
		SD: "south-dakota", TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont",
		VA: "virginia", WA: "washington", WV: "west-virginia", WI: "wisconsin", WY: "wyoming",
		DC: "district-of-columbia",
	};
	return map[code?.toUpperCase()] || slugify(code);
}

function stateName(code) {
	const map = {
		AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
		CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
		HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
		KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
		MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
		MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
		NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
		OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
		SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
		VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
		DC: "District of Columbia",
	};
	return map[code?.toUpperCase()] || code;
}

function esc(str) {
	if (str == null || str === "") return "NULL";
	return "'" + String(str).replace(/'/g, "''") + "'";
}

function escNum(val) {
	if (val == null || val === "" || isNaN(val)) return "NULL";
	return Number(val);
}

function parseProviders(raw) {
	if (!raw) return [];
	return raw.split("|").map((p) => {
		const match = p.trim().match(/^(.+?)\s*\(([^)]+)\)\s*$/);
		if (match) return { name: match[1].trim(), credential: match[2].trim() };
		return { name: p.trim(), credential: "" };
	}).filter((p) => p.name.length > 0);
}

function execSQL(sql) {
	const tmpFile = resolve(PROJECT_ROOT, "scripts", "_tmp_batch.sql");
	fs.writeFileSync(tmpFile, sql, "utf8");
	try {
		execSync(
			`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --file="${tmpFile}"`,
			{ cwd: PROJECT_ROOT, stdio: "pipe", timeout: 60000 }
		);
	} finally {
		try { fs.unlinkSync(tmpFile); } catch {}
	}
}

// Use dynamic import for fs in execSQL since we're ESM
import fs from "fs";
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let batchCount = 0;
async function execSQLBatch(sql, retries = 3) {
	const tmpFile = resolve(PROJECT_ROOT, "scripts", "_tmp_batch.sql");
	fs.writeFileSync(tmpFile, sql, "utf8");
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			// Throttle remote requests to avoid rate limiting
			if (isRemote) {
				batchCount++;
				if (batchCount % 5 === 0) await sleep(1000);
			}
			execSync(
				`npx wrangler d1 execute ${DB_NAME} ${remoteFlag} --file="${tmpFile}"`,
				{ cwd: PROJECT_ROOT, stdio: "pipe", timeout: 300000 }
			);
			try { fs.unlinkSync(tmpFile); } catch {}
			return;
		} catch (e) {
			if (attempt < retries) {
				process.stdout.write(`\n  ⚠️ Batch failed (attempt ${attempt}/${retries}), retrying in 3s...`);
				await sleep(3000);
			} else {
				try { fs.unlinkSync(tmpFile); } catch {}
				throw e;
			}
		}
	}
}

// ── Read CSVs ────────────────────────────────────────────────────────

console.log("📂 Reading CSVs from", DATA_DIR);

const extracted = parse(readFileSync(resolve(DATA_DIR, "practices_extracted.csv")), {
	columns: true, skip_empty_lines: true, relax_column_count: true,
});
console.log(`  practices_extracted: ${extracted.length} rows`);

const gmaps = parse(readFileSync(resolve(DATA_DIR, "practices_google_maps.csv")), {
	columns: true, skip_empty_lines: true, relax_column_count: true,
});
console.log(`  practices_google_maps: ${gmaps.length} rows`);

const reviewsRaw = parse(readFileSync(resolve(DATA_DIR, "practices_google_reviews.csv")), {
	columns: true, skip_empty_lines: true, relax_column_count: true,
});
console.log(`  practices_google_reviews: ${reviewsRaw.length} rows`);

// ── Build lookup maps ────────────────────────────────────────────────

const gmapsMap = new Map();
for (const g of gmaps) {
	gmapsMap.set(String(g.hh_id), g);
}

// ── Filter + merge practices ─────────────────────────────────────────

console.log("\n🔧 Merging and cleaning practices...");

const practices = [];
const allProviders = [];
let skippedClosed = 0;
let skippedLowConf = 0;

for (const seed of extracted) {
	const hhId = String(seed.hh_id);
	const gm = gmapsMap.get(hhId);

	// Skip permanently closed
	if (gm?.gmaps_permanently_closed === "True" || gm?.gmaps_permanently_closed === "true") {
		skippedClosed++;
		continue;
	}

	// Skip low match confidence
	if (gm?.match_method === "low") {
		skippedLowConf++;
		continue;
	}

	const name = seed.practice_name || gm?.gmaps_name || "Unknown Practice";
	const city = gm?.gmaps_city || seed.city || "";
	const stCode = seed.state || "";
	const pSlug = slugify(name + " " + city);

	const practice = {
		hh_id: parseInt(hhId),
		name,
		practice_slug: pSlug,
		city,
		city_slug: slugify(city),
		state_code: stCode,
		state_name: stateName(stCode),
		state_slug: stateSlug(stCode),
		address: gm?.gmaps_address || [seed.address_street, seed.address_city, seed.address_state, seed.address_zip].filter(Boolean).join(", "),
		zip: gm?.gmaps_zip || seed.address_zip || "",
		lat: parseFloat(gm?.gmaps_lat) || null,
		lng: parseFloat(gm?.gmaps_lng) || null,
		phone: gm?.gmaps_phone || seed.phone || "",
		website: seed.practice_website || gm?.gmaps_website || "",
		rating: parseFloat(gm?.gmaps_rating) || 0,
		reviews_count: parseInt(gm?.gmaps_reviews_count) || 0,
		practice_type: seed.practice_type || "",
		specializations: seed.specializations || "",
		hearing_aid_brands: seed.hearing_aid_brands || "",
		insurance_plans: seed.insurance_plans || "",
		services: (seed.services || "").split("|").slice(0, 8).join("|"),
		accepts_va: seed.accepts_va || "",
		hours_json: gm?.gmaps_hours_json || "",
		photo_url: (gm?.gmaps_photo_urls || "").split("|")[0] || "",
		gmaps_url: gm?.gmaps_url || "",
		match_confidence: parseFloat(gm?.match_confidence) || 0,
	};

	practices.push(practice);

	// Parse providers
	const provs = parseProviders(seed.providers);
	for (const p of provs) {
		allProviders.push({ hh_id: practice.hh_id, ...p });
	}
}

console.log(`  ✅ ${practices.length} practices ready`);
console.log(`  ⏭️  ${skippedClosed} skipped (permanently closed)`);
console.log(`  ⏭️  ${skippedLowConf} skipped (low match confidence)`);
console.log(`  👤 ${allProviders.length} providers parsed`);
console.log(`  📝 ${reviewsRaw.length} reviews to import`);

// ── Create custom tables ─────────────────────────────────────────────

console.log("\n🗄️  Creating custom D1 tables...");
const schemaSQL = readFileSync(resolve(PROJECT_ROOT, "seed", "schema-custom.sql"), "utf8");
await execSQLBatch(schemaSQL);
console.log("  ✅ Tables created");

// ── Insert practices into emdash collection (ec_practices) ───────────

console.log("\n📥 Inserting practices into emdash collection (ec_practices)...");
const BATCH_SIZE = isRemote ? 10 : 50;

for (let i = 0; i < practices.length; i += BATCH_SIZE) {
	const batch = practices.slice(i, i + BATCH_SIZE);
	const statements = batch.map((p) => {
		const id = `practice-${p.hh_id}`;
		return `INSERT OR REPLACE INTO ec_practices (id, slug, status, published_at, created_at, updated_at, hh_id, name, practice_slug, city, state_code, state_slug, address, zip, lat, lng, phone, website, rating, reviews_count, practice_type, specializations_list, hearing_aid_brands_list, insurance_plans_list, services_list, accepts_va, hours_json, photo_url, gmaps_url) VALUES (${esc(id)}, ${esc(p.practice_slug)}, 'published', datetime('now'), datetime('now'), datetime('now'), ${escNum(p.hh_id)}, ${esc(p.name)}, ${esc(p.practice_slug)}, ${esc(p.city)}, ${esc(p.state_code)}, ${esc(p.state_slug)}, ${esc(p.address)}, ${esc(p.zip)}, ${escNum(p.lat)}, ${escNum(p.lng)}, ${esc(p.phone)}, ${esc(p.website)}, ${escNum(p.rating)}, ${escNum(p.reviews_count)}, ${esc(p.practice_type)}, ${esc(p.specializations)}, ${esc(p.hearing_aid_brands)}, ${esc(p.insurance_plans)}, ${esc(p.services)}, ${esc(p.accepts_va)}, ${esc(p.hours_json)}, ${esc(p.photo_url)}, ${esc(p.gmaps_url)});`;
	});
	await execSQLBatch(statements.join("\n"));
	process.stdout.write(`\r  ec_practices: ${Math.min(i + BATCH_SIZE, practices.length)}/${practices.length}`);
}
console.log("\n  ✅ ec_practices done");

// ── Insert into practices_search (D1 search index) ──────────────────

console.log("\n📥 Inserting into practices_search (search index)...");

for (let i = 0; i < practices.length; i += BATCH_SIZE) {
	const batch = practices.slice(i, i + BATCH_SIZE);
	const statements = batch.map((p) =>
		`INSERT OR REPLACE INTO practices_search (hh_id, practice_slug, name, city, city_slug, state_code, state_name, state_slug, address, zip, lat, lng, phone, website, rating, reviews_count, practice_type, specializations, hearing_aid_brands, insurance_plans, services, accepts_va, hours_json, photo_url, gmaps_url, match_confidence, is_active) VALUES (${escNum(p.hh_id)}, ${esc(p.practice_slug)}, ${esc(p.name)}, ${esc(p.city)}, ${esc(p.city_slug)}, ${esc(p.state_code)}, ${esc(p.state_name)}, ${esc(p.state_slug)}, ${esc(p.address)}, ${esc(p.zip)}, ${escNum(p.lat)}, ${escNum(p.lng)}, ${esc(p.phone)}, ${esc(p.website)}, ${escNum(p.rating)}, ${escNum(p.reviews_count)}, ${esc(p.practice_type)}, ${esc(p.specializations)}, ${esc(p.hearing_aid_brands)}, ${esc(p.insurance_plans)}, ${esc(p.services)}, ${esc(p.accepts_va)}, ${esc(p.hours_json)}, ${esc(p.photo_url)}, ${esc(p.gmaps_url)}, ${escNum(p.match_confidence)}, 1);`
	);
	await execSQLBatch(statements.join("\n"));
	process.stdout.write(`\r  practices_search: ${Math.min(i + BATCH_SIZE, practices.length)}/${practices.length}`);
}
console.log("\n  ✅ practices_search done");

// ── Insert providers ─────────────────────────────────────────────────

console.log("\n📥 Inserting providers...");

for (let i = 0; i < allProviders.length; i += BATCH_SIZE) {
	const batch = allProviders.slice(i, i + BATCH_SIZE);
	const statements = batch.map((p) =>
		`INSERT INTO providers (hh_id, name, credential) VALUES (${escNum(p.hh_id)}, ${esc(p.name)}, ${esc(p.credential)});`
	);
	await execSQLBatch(statements.join("\n"));
	process.stdout.write(`\r  providers: ${Math.min(i + BATCH_SIZE, allProviders.length)}/${allProviders.length}`);
}
console.log("\n  ✅ providers done");

// ── Insert reviews ───────────────────────────────────────────────────

console.log("\n📥 Inserting reviews...");

for (let i = 0; i < reviewsRaw.length; i += BATCH_SIZE) {
	const batch = reviewsRaw.slice(i, i + BATCH_SIZE);
	const statements = batch.map((r) =>
		`INSERT INTO reviews (hh_id, gmaps_place_id, stars, text, published_at) VALUES (${escNum(r.hh_id)}, ${esc(r.gmaps_place_id)}, ${escNum(r.stars)}, ${esc(r.text)}, ${esc(r.published_at)});`
	);
	await execSQLBatch(statements.join("\n"));
	process.stdout.write(`\r  reviews: ${Math.min(i + BATCH_SIZE, reviewsRaw.length)}/${reviewsRaw.length}`);
}
console.log("\n  ✅ reviews done");

// ── Summary ──────────────────────────────────────────────────────────

console.log("\n✅ Import complete!");
console.log(`   Practices: ${practices.length} (emdash + search index)`);
console.log(`   Providers: ${allProviders.length}`);
console.log(`   Reviews:   ${reviewsRaw.length}`);
console.log(`   Skipped:   ${skippedClosed} closed, ${skippedLowConf} low-confidence`);
