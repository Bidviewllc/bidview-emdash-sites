/**
 * Grant C. Meyer Homes — Cloudflare Worker (Path B: serves from D1, never Trestle).
 *
 * Trestle's WAF 403s Cloudflare egress, so this Worker NEVER calls Trestle. A
 * sync job on a non-blocked host (see sync/sync.mjs) replicates the feed into
 * D1; this Worker reads D1 and serves the API + static site. Same JSON shape the
 * front-end already expects from the Vercel build, so no front-end change.
 *
 * Routes:
 *   /api/listings                              → all active listings (from D1)
 *   /api/listing/:key                          → one listing + photos
 *   /api/listing-by-slug/:city/:address        → resolve slug → listing + photos
 *   /api/health                                → sync freshness
 *   /homes/:city/:address                      → listing.html shell
 *   everything else                            → static assets
 */

const CACHE_VERSION = "d1v1";
const TTL = 300; // edge-cache the JSON for 5 min; D1 reads are cheap anyway

const JSON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json",
};

/* ---- shape a D1 row into the objects the front-end expects --------------- */
function toListing(r) {
  return {
    id: r.id, slug: r.slug, address: r.address,
    city: r.city, state: r.state, zip: r.zip,
    price: r.price, beds: r.beds, baths: r.baths,
    sqft: r.sqft, lotAcres: r.lot_acres, yearBuilt: r.year_built,
    type: r.type, subType: r.sub_type, category: r.category, status: r.status,
    lat: r.lat, lng: r.lng, view: r.view, waterfront: r.waterfront === 1,
    dom: r.dom, photosCount: r.photos_count, agent: r.agent, office: r.office,
    updated: r.updated, photo: r.photo,
  };
}
function toDetail(r) {
  return {
    id: r.id, address: r.address, city: r.city, state: r.state, zip: r.zip,
    price: r.price, beds: r.beds, baths: r.baths, bathsFull: r.baths_full, bathsHalf: r.baths_half,
    sqft: r.sqft, lotAcres: r.lot_acres, yearBuilt: r.year_built, garage: r.garage,
    view: r.view, description: r.description, status: r.status,
    type: r.type, subType: r.sub_type, category: r.category,
    taxes: r.taxes, daysOnMarket: r.dom, agent: r.agent, office: r.office,
    lat: r.lat, lng: r.lng, hoaFee: r.hoa_fee, heating: r.heating, cooling: r.cooling,
    parking: r.parking, appliances: r.appliances, updated: r.updated,
  };
}

async function photosFor(env, key) {
  const { results } = await env.DB.prepare(
    "SELECT url FROM listing_photos WHERE listing_key = ? ORDER BY ord"
  ).bind(key).all();
  return (results || []).map(p => p.url);
}

/* ---- edge cache (query-string-agnostic) ---------------------------------- */
async function cached(request, ctx, keyPath, builder) {
  const cache = caches.default;
  const key = new Request(
    new URL(`${keyPath}?__cv=${CACHE_VERSION}`, new URL(request.url).origin).toString(),
    { method: "GET" }
  );
  const hit = await cache.match(key);
  if (hit) { const r = new Response(hit.body, hit); r.headers.set("X-Cache-Status", "HIT"); return r; }

  const payload = await builder();
  if (payload === null) return Response.json({ error: "Not found" }, { status: 404, headers: JSON_HEADERS });
  const resp = new Response(JSON.stringify(payload), {
    headers: { ...JSON_HEADERS, "Cache-Control": `public, s-maxage=${TTL}, stale-while-revalidate=86400`, "X-Cache-Status": "MISS" },
  });
  ctx.waitUntil(cache.put(key, resp.clone()));
  return resp;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") return new Response(null, { headers: JSON_HEADERS });

    try {
      // All active listings.
      if (path === "/api/listings" || path === "/listings") {
        return await cached(request, ctx, "/api/listings", async () => {
          const { results } = await env.DB.prepare(
            "SELECT * FROM listings WHERE status = 'Active' ORDER BY (photo IS NULL), price DESC"
          ).all();
          const listings = (results || []).map(toListing);
          return { count: listings.length, listings };
        });
      }

      // Detail by ListingKey.
      const keyMatch = path.match(/^\/(?:api\/)?listing\/([^/]+)\/?$/);
      if (keyMatch) {
        const key = decodeURIComponent(keyMatch[1]);
        return await cached(request, ctx, `/api/listing/${key}`, async () => {
          const row = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(key).first();
          if (!row) return null;
          return { listing: toDetail(row), photos: await photosFor(env, key) };
        });
      }

      // Resolve SEO slug → detail.
      const slugMatch = path.match(/^\/api\/listing-by-slug\/(.+?)\/?$/);
      if (slugMatch) {
        const slug = decodeURIComponent(slugMatch[1]).replace(/\/+$/, "");
        return await cached(request, ctx, `/api/listing-by-slug/${slug}`, async () => {
          const row = await env.DB.prepare("SELECT * FROM listings WHERE slug = ?").bind(slug).first();
          if (!row) return null;
          return { listing: toDetail(row), photos: await photosFor(env, row.id) };
        });
      }

      // Sync freshness (handy for monitoring).
      if (path === "/api/health") {
        const meta = await env.DB.prepare("SELECT last_synced_at, count FROM sync_meta WHERE id = 1").first();
        return Response.json({ ok: true, ...(meta || { last_synced_at: null, count: 0 }) },
          { headers: { ...JSON_HEADERS, "Cache-Control": "no-store" } });
      }

      // The map iframe is served at the directory URL /map/ (or /map).
      if (path === "/map" || path === "/map/") {
        return env.ASSETS.fetch(new Request(new URL("/map/index.html", url), request));
      }
      // Real static files: an extension, or the asset dirs.
      const isAsset = /\.[a-z0-9]+$/i.test(path) ||
        path.startsWith("/assets/") || path.startsWith("/js/") || path.startsWith("/map/");
      if (isAsset) return env.ASSETS.fetch(request);

      // SEO detail URL → detail shell (JS reads the slug from the path).
      if (path.startsWith("/homes/")) {
        return env.ASSETS.fetch(new Request(new URL("/listing.html", url), request));
      }
      // Live listings hub (with or without trailing slash).
      if (path === "/listings" || path === "/listings/") {
        return env.ASSETS.fetch(new Request(new URL("/listings.html", url), request));
      }
      // Everything else (/, /community/, /buyers/, /neighborhood/:slug/, …) → the SPA.
      return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));

    } catch (e) {
      return Response.json({ error: e.message }, { status: 500, headers: JSON_HEADERS });
    }
  },
};
