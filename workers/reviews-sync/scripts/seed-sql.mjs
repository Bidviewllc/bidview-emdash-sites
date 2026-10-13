import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_SQL } from "../src/db.js";
import { toIso } from "../src/normalize.js";

const q = (v) => (v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const read = (root, rel) => JSON.parse(readFileSync(resolve(root, rel), "utf8"));

const LOADERS = {
  ontario(root) {
    const j = read(root, "sites/ontario-hearing/src/data/reviews.json");
    return {
      location: "brighton", title: j.business, placeId: "ChIJq-Dls6fK1okRjkByx9QR3n8",
      rating: j.rating, votes: j.review_count,
      reviews: j.reviews.map((r) => ({
        id: r.review_id, author: r.name, authorUrl: "", avatar: "", rating: r.rating, text: r.text,
        timeAgo: "", publishedAt: toIso(r.date), url: "", localGuide: r.local_guide ? 1 : 0,
      })),
    };
  },
  duet(root) {
    const j = read(root, "sites/duet-audiology/src/data/google-reviews.json");
    return {
      location: "lake-forest", title: j.sourceProfileName || j.businessName, placeId: j.placeId,
      rating: j.googleRating, votes: j.googleReviewCount,
      reviews: j.reviews.map((r) => ({
        id: r.id, author: r.authorName, authorUrl: r.authorUrl, avatar: r.profileImageUrl, rating: r.rating,
        text: r.text || null, timeAgo: r.relativeTime, publishedAt: toIso(r.timestamp), url: r.reviewUrl, localGuide: 0,
      })),
    };
  },
};

export function buildSeedSql(site, root) {
  const load = LOADERS[site];
  if (!load) throw new Error(`unknown site "${site}" (use ontario or duet)`);
  const d = load(root);
  const now = new Date().toISOString();
  const lines = SCHEMA_SQL.map((s) => s + ";");
  for (const r of d.reviews) {
    lines.push(
      `INSERT OR IGNORE INTO reviews (review_id,location,author,author_url,avatar_url,rating,text,time_ago,published_at,review_url,local_guide,synced_at) VALUES (${[
        q(r.id), q(d.location), q(r.author), q(r.authorUrl), q(r.avatar), q(r.rating), q(r.text),
        q(r.timeAgo), q(r.publishedAt), q(r.url), q(r.localGuide), q(now),
      ].join(",")});`
    );
  }
  // Seeded, not synced: an old synced_at makes the first Sunday run pull fresh data.
  lines.push(
    `INSERT OR IGNORE INTO review_meta (location,title,place_id,rating,votes_count,synced_at) VALUES (${[
      q(d.location), q(d.title), q(d.placeId), q(d.rating), q(d.votes), q("2000-01-01T00:00:00.000Z"),
    ].join(",")});`
  );
  return lines.join("\n");
}

// Run as a CLI only when this file is the entry point (robust on Windows paths).
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const site = process.argv[2];
  const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
  process.stdout.write(buildSeedSql(site, root) + "\n");
}
