// Canonical reader. Each site keeps an identical copy at src/lib/reviews-reader.mjs
// (tests/reader.test.mjs fails if a copy drifts). Edit this file, then copy it.

/**
 * @param {{prepare: Function} | null | undefined} db  a D1 binding
 * @param {string} location  location key, e.g. "arvada"
 * @param {object | undefined} fallback  same shape as the return value, used when D1 has nothing
 */
export async function getLocationReviews(db, location, fallback) {
  const fb = { reviews: [], ...(fallback || {}), source: "fallback" };
  if (!db) return fb;
  try {
    const meta = await db
      .prepare("SELECT title, place_id, rating, votes_count, synced_at FROM review_meta WHERE location = ?")
      .bind(location)
      .first();
    const rows = await db
      .prepare(
        `SELECT review_id, author, author_url, avatar_url, rating, text, time_ago, published_at, review_url, local_guide
         FROM reviews WHERE location = ? AND (hidden IS NULL OR hidden = 0)
         ORDER BY published_at DESC`
      )
      .bind(location)
      .all();
    const list = rows?.results ?? [];
    if (!meta || list.length === 0) return fb;
    return {
      label: fallback?.label,
      placeId: meta.place_id,
      rating: meta.rating ?? fallback?.rating ?? null,
      votesCount: meta.votes_count ?? fallback?.votesCount ?? null,
      syncedAt: meta.synced_at,
      source: "d1",
      reviews: list.map((r) => ({
        id: r.review_id,
        author: r.author || "",
        authorUrl: r.author_url || "",
        avatar: r.avatar_url || "",
        rating: r.rating,
        text: r.text || "",
        timeAgo: r.time_ago || "",
        publishedAt: r.published_at || "",
        url: r.review_url || "",
        localGuide: !!r.local_guide,
      })),
    };
  } catch {
    return fb;
  }
}
