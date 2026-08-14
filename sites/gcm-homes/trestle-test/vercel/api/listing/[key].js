import { getToken, fetchListingDetail, LISTINGS_TTL } from "../../lib/trestle.js";

/** Legacy route — listing.html falls back to /listing/:key for `?id=` URLs. */
export default async function handler(req, res) {
  try {
    const key = String(req.query.key || "");
    if (!key) return res.status(400).json({ error: "Missing key" });

    const result = await fetchListingDetail(await getToken(), key);
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
