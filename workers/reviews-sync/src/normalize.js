// "2026-08-03 23:50:09 +00:00" -> ISO. Date-only and ISO inputs pass through.
export function toIso(ts) {
  if (!ts) return null;
  const d = new Date(String(ts).replace(" +00:00", "Z").replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizeItem(item, nowIso) {
  const id = item?.review_id;
  if (!id) return null;
  return {
    review_id: String(id),
    author: item.profile_name || "",
    author_url: item.profile_url || "",
    avatar_url: item.profile_image_url || "",
    rating: item.rating?.value ?? null,
    text: item.review_text || null,
    time_ago: item.time_ago || "",
    published_at: toIso(item.timestamp),
    review_url: item.review_url || "",
    local_guide: item.local_guide ? 1 : 0,
    synced_at: nowIso,
  };
}

export function normalizeResult(result, nowIso) {
  const rows = (result?.items || []).map((i) => normalizeItem(i, nowIso)).filter(Boolean);
  const seen = new Set();
  const reviews = rows.filter((r) => !seen.has(r.review_id) && seen.add(r.review_id));
  return {
    title: result?.title || "",
    placeId: result?.place_id || "",
    rating: result?.rating?.value ?? null,
    votesCount: result?.rating?.votes_count ?? null,
    reviews,
  };
}
