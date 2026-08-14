import { getListingsCached, LISTINGS_TTL } from "../lib/trestle.js";

export default async function handler(req, res) {
  try {
    const { listings, hit } = await getListingsCached();
    // Vercel's edge cache honours s-maxage — this is what keeps the billed feed
    // to one upstream call per TTL no matter how much traffic arrives.
    res.setHeader("Cache-Control", `public, s-maxage=${LISTINGS_TTL}, stale-while-revalidate=86400`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Cache-Status", hit ? "HIT" : "MISS");
    res.status(200).json({ count: listings.length, listings });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ error: e.message, detail: e.body ? e.body.slice(0, 200) : undefined });
  }
}
