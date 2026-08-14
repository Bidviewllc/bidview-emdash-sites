import { getListingsCached, getToken, fetchListingDetail, LISTINGS_TTL } from "../lib/trestle.js";

/**
 * Resolve an SEO slug ("incline-village-nv/940-miners-ridge-court") to a listing.
 *
 * Reached via a vercel.json rewrite that packs the two path segments into ?slug=.
 * A `[...slug].js` catch-all was tried first and does not work here: one segment
 * invoked the function with an empty param, two segments 404'd outright.
 */
export default async function handler(req, res) {
  try {
    const slug = String(req.query.slug || "").replace(/\/+$/, "");
    if (!slug) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(400).json({ error: "Missing slug" });
    }

    const { listings } = await getListingsCached();
    const found = listings.find(l => l.slug === slug);
    if (!found) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(404).json({ error: "Not found" });
    }

    const result = await fetchListingDetail(await getToken(), found.id);
    if (!result) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(404).json({ error: "Not found" });
    }

    res.setHeader("Cache-Control", `public, s-maxage=${LISTINGS_TTL}, stale-while-revalidate=86400`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(result);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ error: e.message });
  }
}
