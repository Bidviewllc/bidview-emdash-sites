/**
 * Generate 50 US state hero images via Minimax API.
 * Downloads each to public/state-images/ for upload to R2 later.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "public/state-images");

const API_KEY = "sk-cp-PVifRRlEjWhOYpAXdtmMYENMBn9uCvnZONTQc-u9a1-aWW0JasQ2oj8kS9yrJpdgQMqklbMKhLIGqsgU3Rgs3YkTXylC3iCr3krqYZPepOBqJC_M9SnQoRA";
const API_URL = "https://api.minimax.io/v1/image_generation";

const STATE_PROMPTS = {
	"alabama": "Birmingham Alabama downtown skyline at golden hour, southern architecture, warm sunset light, professional editorial photography, no people",
	"alaska": "Anchorage Alaska with snowy mountain backdrop, golden hour, wilderness, professional editorial photography, no people",
	"arizona": "Phoenix Arizona desert landscape with Saguaro cactus and red mountains, golden hour, professional editorial photography, no people",
	"arkansas": "Little Rock Arkansas riverfront at sunset, Ozark hills in distance, professional editorial photography, no people",
	"california": "Los Angeles California skyline with palm trees in foreground, golden hour, ocean haze, professional editorial photography, no people",
	"colorado": "Denver Colorado downtown with Rocky Mountains backdrop at sunset, golden light, professional editorial photography, no people",
	"connecticut": "Hartford Connecticut historic New England architecture in autumn, warm golden light, professional editorial photography, no people",
	"delaware": "Wilmington Delaware coastal town with lighthouse, golden hour, professional editorial photography, no people",
	"florida": "Miami Florida skyline at golden hour, palm trees in foreground, ocean visible, warm sunset light, professional editorial photography, no people",
	"georgia": "Atlanta Georgia downtown skyline with southern oak trees, golden hour, professional editorial photography, no people",
	"hawaii": "Honolulu Hawaii beach with Diamond Head mountain, palm trees, golden hour, tropical, professional editorial photography, no people",
	"idaho": "Boise Idaho with mountain backdrop and pine forest, golden hour, professional editorial photography, no people",
	"illinois": "Chicago Illinois skyline from lakefront, golden hour, Lake Michigan, professional editorial photography, no people",
	"indiana": "Indianapolis Indiana downtown with monument circle, golden hour, professional editorial photography, no people",
	"iowa": "Iowa farmland with red barn and rolling hills at golden hour, midwest, professional editorial photography, no people",
	"kansas": "Wichita Kansas plains with golden wheat fields and dramatic sky, sunset, professional editorial photography, no people",
	"kentucky": "Kentucky bluegrass countryside with horse farm and white fences, golden hour, professional editorial photography, no people",
	"louisiana": "New Orleans Louisiana French Quarter architecture with wrought iron balconies, golden hour, professional editorial photography, no people",
	"maine": "Maine coastline with lighthouse and rocky cliffs at golden hour, professional editorial photography, no people",
	"maryland": "Baltimore Maryland inner harbor at sunset, historic buildings, golden hour, professional editorial photography, no people",
	"massachusetts": "Boston Massachusetts historic skyline with Freedom Trail buildings, golden hour, professional editorial photography, no people",
	"michigan": "Detroit Michigan skyline from Lake Michigan with Great Lakes view, golden hour, professional editorial photography, no people",
	"minnesota": "Minneapolis Minnesota downtown with lakes in foreground, golden hour, professional editorial photography, no people",
	"mississippi": "Mississippi delta landscape with old plantation home and oak trees, golden hour, professional editorial photography, no people",
	"missouri": "Saint Louis Missouri Gateway Arch at golden hour, river view, professional editorial photography, no people",
	"montana": "Montana big sky country with mountain ranges and open plains, golden hour, professional editorial photography, no people",
	"nebraska": "Nebraska great plains with wheat fields and dramatic sunset sky, professional editorial photography, no people",
	"nevada": "Las Vegas Nevada strip skyline at sunset with desert mountains, golden hour, professional editorial photography, no people",
	"new-hampshire": "New Hampshire White Mountains in autumn with red and orange foliage, golden hour, professional editorial photography, no people",
	"new-jersey": "New Jersey Atlantic City boardwalk at sunset with ocean view, golden hour, professional editorial photography, no people",
	"new-mexico": "Santa Fe New Mexico adobe architecture with desert backdrop, golden hour, professional editorial photography, no people",
	"new-york": "New York City Manhattan skyline at golden hour with Empire State Building, professional editorial photography, no people",
	"north-carolina": "Charlotte North Carolina downtown skyline with Blue Ridge Mountains in distance, golden hour, professional editorial photography, no people",
	"north-dakota": "North Dakota prairie with grain elevator and dramatic sky, golden hour, professional editorial photography, no people",
	"ohio": "Cleveland Ohio downtown skyline from Lake Erie, golden hour, professional editorial photography, no people",
	"oklahoma": "Oklahoma City downtown with prairie sky, golden hour, professional editorial photography, no people",
	"oregon": "Portland Oregon with Mount Hood in distance and pine forest, golden hour, professional editorial photography, no people",
	"pennsylvania": "Philadelphia Pennsylvania skyline with Liberty Bell area, historic buildings, golden hour, professional editorial photography, no people",
	"rhode-island": "Providence Rhode Island coastal city with historic colonial architecture, golden hour, professional editorial photography, no people",
	"south-carolina": "Charleston South Carolina historic district with palmetto trees and antebellum architecture, golden hour, professional editorial photography, no people",
	"south-dakota": "Mount Rushmore South Dakota landscape with Black Hills, golden hour, professional editorial photography, no people",
	"tennessee": "Nashville Tennessee downtown with country music heritage, golden hour, professional editorial photography, no people",
	"texas": "Austin Texas downtown skyline with Hill Country backdrop, golden hour, professional editorial photography, no people",
	"utah": "Utah red rock landscape with arches national park style formations, golden hour, professional editorial photography, no people",
	"vermont": "Vermont Green Mountains in fall with red and orange foliage, covered bridge, golden hour, professional editorial photography, no people",
	"virginia": "Richmond Virginia historic colonial architecture with Blue Ridge Mountains, golden hour, professional editorial photography, no people",
	"washington": "Seattle Washington skyline with Space Needle and Mount Rainier in background, golden hour, professional editorial photography, no people",
	"west-virginia": "West Virginia Appalachian mountains with morning mist and rolling hills, golden hour, professional editorial photography, no people",
	"wisconsin": "Milwaukee Wisconsin Lake Michigan waterfront, golden hour, professional editorial photography, no people",
	"wyoming": "Wyoming Grand Teton mountains with wildflower meadow in foreground, golden hour, professional editorial photography, no people",
	"district-of-columbia": "Washington DC US Capitol building at golden hour, monuments visible, professional editorial photography, no people",
};

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
	console.log(`Created ${OUT_DIR}`);
}

async function generateImage(stateSlug, prompt) {
	const res = await fetch(API_URL, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "image-01",
			prompt,
			aspect_ratio: "3:4",
			n: 1,
		}),
	});
	const json = await res.json();
	if (!json.data?.image_urls?.[0]) {
		throw new Error(`No image URL: ${JSON.stringify(json)}`);
	}
	return json.data.image_urls[0];
}

async function downloadImage(url, outPath) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Download failed: ${res.status}`);
	const buf = Buffer.from(await res.arrayBuffer());
	writeFileSync(outPath, buf);
	return buf.length;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const states = Object.entries(STATE_PROMPTS);
console.log(`Generating ${states.length} state images...\n`);

let success = 0;
let failed = [];

for (let i = 0; i < states.length; i++) {
	const [slug, prompt] = states[i];
	const outPath = resolve(OUT_DIR, `${slug}.jpg`);

	if (existsSync(outPath)) {
		console.log(`[${i + 1}/${states.length}] ${slug} — already exists, skipping`);
		success++;
		continue;
	}

	try {
		process.stdout.write(`[${i + 1}/${states.length}] ${slug}... `);
		const imgUrl = await generateImage(slug, prompt);
		const bytes = await downloadImage(imgUrl, outPath);
		console.log(`✓ ${(bytes / 1024).toFixed(0)}KB`);
		success++;
		// Throttle to avoid rate limits
		await sleep(1000);
	} catch (e) {
		console.log(`✗ ${e.message}`);
		failed.push(slug);
	}
}

console.log(`\n✅ Done. ${success}/${states.length} images saved to ${OUT_DIR}`);
if (failed.length > 0) {
	console.log(`❌ Failed: ${failed.join(", ")}`);
}
