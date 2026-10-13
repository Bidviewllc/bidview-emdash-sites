import test from "node:test";
import assert from "node:assert/strict";
import { toIso, normalizeItem, normalizeResult } from "../src/normalize.js";

test("toIso reads DataForSEO, date-only and ISO timestamps", () => {
  assert.equal(toIso("2026-08-11 17:31:56 +00:00"), "2026-08-11T17:31:56.000Z");
  assert.equal(toIso("2026-05-25"), "2026-05-25T00:00:00.000Z");
  assert.equal(toIso("2026-05-25T01:02:03.000Z"), "2026-05-25T01:02:03.000Z");
  assert.equal(toIso(""), null);
  assert.equal(toIso("garbage"), null);
});

test("a rating-only review keeps null text", () => {
  const row = normalizeItem({ review_id: "a1", profile_name: "Sam", rating: { value: 5 }, review_text: null }, "now");
  assert.equal(row.text, null);
  assert.equal(row.rating, 5);
  assert.equal(row.local_guide, 0);
});

test("items without a review_id are dropped", () => {
  assert.equal(normalizeItem({ profile_name: "x" }, "now"), null);
});

test("duplicate review_ids in one pull are stored once", () => {
  const result = {
    title: "T", place_id: "P", rating: { value: 4.9, votes_count: 85 },
    items: [{ review_id: "a", rating: { value: 5 } }, { review_id: "a", rating: { value: 1 } }, { review_id: "b", rating: { value: 4 } }],
  };
  const n = normalizeResult(result, "now");
  assert.equal(n.reviews.length, 2);
  assert.equal(n.reviews[0].rating, 5);
  assert.equal(n.votesCount, 85);
  assert.equal(n.placeId, "P");
});
