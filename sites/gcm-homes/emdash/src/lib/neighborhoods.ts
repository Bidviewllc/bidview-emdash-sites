// Neighborhood metadata + point-in-polygon listing matching, ported from the
// prototype's community.jsx. The Trestle feed has no subdivision field
// (SubdivisionName null on all listings), so listings are matched to an area by
// testing each listing's lat/lng against the traced GeoJSON polygon(s) in
// nbgeo.json — the same data the Leaflet map uses. Central North + Central South
// are two polygons but one guide (areaToSlug collapses them → "central").
import geo from "./nbgeo.json";

export type Neighborhood = {
	slug: string; name: string; tag: string; price: string; trend: string; blurb: string;
};

// 15 guides. Order = display order on the community grid.
export const NEIGHBORHOODS: Neighborhood[] = [
	{ slug: "lakefront", name: "Lakefront", tag: "Waterfront living", price: "$9.2M", trend: "Tight Hold", blurb: "Tahoe's most coveted address — private piers, sweeping water views, and the longest sunsets on the North Shore." },
	{ slug: "lakeview", name: "Lakeview", tag: "Lake-view estates", price: "$3.4M", trend: "Limited", blurb: "Elevated homes that trade the waterfront for the wide, unobstructed lake panoramas Incline is known for." },
	{ slug: "mill-creek", name: "Mill Creek", tag: "Walk-to-beach family living", price: "$2.1M", trend: "Active", blurb: "A family favorite on the eastern edge — level lots, a short walk to the beach, and easy reach of Diamond Peak." },
	{ slug: "central", name: "Central", tag: "Walkable village core", price: "$1.6M", trend: "Active", blurb: "The walkable heart of the village, minutes from Raley's, the recreation center, and the public schools." },
	{ slug: "apollo", name: "Apollo", tag: "Trailhead privacy", price: "$2.8M", trend: "Limited", blurb: "Tucked against the national forest up top, prized for trailhead access and end-of-road privacy." },
	{ slug: "woods", name: "Woods", tag: "Quiet, central location", price: "$1.9M", trend: "Steady", blurb: "Quiet, wooded, and genuinely central — a calm pocket within easy reach of everything." },
	{ slug: "ponderosa", name: "Ponderosa", tag: "Wooded seclusion", price: "$2.3M", trend: "Limited", blurb: "Secluded lots under tall pines on the western side, close to the golf course and the shore road." },
	{ slug: "lower-tyner", name: "Lower Tyner", tag: "Mountain & canyon views", price: "$2.0M", trend: "Steady", blurb: "Mountain and canyon views on gently rising ground, a step up from the village core." },
	{ slug: "upper-tyner", name: "Upper Tyner", tag: "Elevation & privacy", price: "$2.6M", trend: "Limited", blurb: "Higher still — more elevation, more privacy, and bigger views for those who want the climb." },
	{ slug: "jennifer", name: "Jennifer", tag: "Hiking from the doorstep", price: "$2.2M", trend: "Steady", blurb: "Hiking from the doorstep, with quick access to the trails that lace the slopes above the village." },
	{ slug: "championship-golf-course", name: "Championship Golf Course", tag: "Course frontage", price: "$3.1M", trend: "Tight Hold", blurb: "Homes fronting the Robert Trent Jones championship course — green in summer, trail-laced in winter." },
	{ slug: "mountain-golf-course", name: "Mountain Golf Course", tag: "Golf & winter trails", price: "$2.7M", trend: "Limited", blurb: "Along the shorter mountain course — golf in the warm months, groomed nordic tracks once the snow falls." },
	{ slug: "eastern-slope", name: "Eastern Slope", tag: "Water & southern exposure", price: "$3.6M", trend: "Limited", blurb: "Eastern exposure and water views, catching the morning light coming up over the lake." },
	{ slug: "ski-way", name: "Ski Way", tag: "Close to Diamond Peak", price: "$2.4M", trend: "Active", blurb: "The closest neighborhood to Diamond Peak — ski-in mornings and the shortest lift-line commute in town." },
	{ slug: "crystal-bay", name: "Crystal Bay", tag: "The state-line gateway", price: "$4.1M", trend: "Emerging", blurb: "The state-line gateway, where grand lakefront estates meet original mid-century cabins on wooded lots." },
];

export const bySlug = (slug: string) => NEIGHBORHOODS.find((n) => n.slug === slug) || null;

export function areaToSlug(name: string): string {
	const s = String(name || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
	return s === "central-north" || s === "central-south" ? "central" : s;
}

function pointInRing(x: number, y: number, ring: number[][]): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
		if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
	}
	return inside;
}
function pointInFeature(lng: number, lat: number, feature: any): boolean {
	const g = feature.geometry;
	const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
	for (const poly of polys) {
		if (!pointInRing(lng, lat, poly[0])) continue;
		let inHole = false;
		for (let k = 1; k < poly.length; k++) if (pointInRing(lng, lat, poly[k])) inHole = true;
		if (!inHole) return true;
	}
	return false;
}

// Filter a list of listings (with numeric .lat/.lng) to those inside `slug`.
export function listingsInNeighborhood(slug: string, listings: any[]): any[] {
	const features = (geo as any).features.filter((f: any) => areaToSlug(f.properties.area) === slug);
	if (!features.length) return [];
	return listings.filter(
		(l) => l.lat != null && l.lng != null && features.some((f: any) => pointInFeature(l.lng, l.lat, f)),
	);
}
