import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

const PLACE_ID = "ChIJ1foTYNnqD4gRYzWwaQPCG_Q";
const OUTPUT = resolve("src/data/google-reviews.json");
const API_ROOT = "https://api.dataforseo.com";

async function credentials() {
  if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) {
    return { login: process.env.DATAFORSEO_LOGIN, password: process.env.DATAFORSEO_PASSWORD };
  }
  const source = await readFile(resolve(homedir(), ".claude", "credentials", "apis.md"), "utf8");
  const section = source.match(/## DataForSEO\s*([\s\S]*?)(?=\n## |$)/i)?.[1] ?? "";
  const login = section.match(/\*\*Login:\*\*\s*`?([^`\r\n]+)`?/i)?.[1]?.trim();
  const password = section.match(/\*\*Password:\*\*\s*`?([^`\r\n]+)`?/i)?.[1]?.trim();
  if (!login || !password) throw new Error("DataForSEO credentials were not found.");
  return { login, password };
}

async function api(method, path, body, auth) {
  const response = await fetch(API_ROOT + path, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${auth.login}:${auth.password}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || payload.status_code !== 20000) throw new Error(payload.status_message || `Review request failed with HTTP ${response.status}.`);
  return payload;
}

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

function normalize(item) {
  return {
    id: String(item.review_id || ""), authorName: String(item.profile_name || "Google reviewer"), authorUrl: String(item.profile_url || ""),
    profileImageUrl: String(item.profile_image_url || ""), rating: Math.max(0, Math.min(5, Number(item.rating?.value ?? item.rating ?? 0))),
    text: String(item.review_text || ""), timestamp: String(item.timestamp || ""), relativeTime: String(item.time_ago || ""),
    language: String(item.original_language || ""), reviewUrl: String(item.review_url || ""),
  };
}

async function main() {
  const auth = await credentials();
  const queued = await api("POST", "/v3/business_data/google/reviews/task_post", [{
    place_id: PLACE_ID, location_name: "United States", language_code: "en", depth: 100, sort_by: "newest", priority: 1,
    tag: "duet-hearing-google-reviews",
  }], auth);
  const taskId = queued.tasks?.[0]?.id;
  if (!taskId) throw new Error("The review service did not return a task ID.");
  let task;
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    await wait(10_000);
    const ready = await api("GET", "/v3/business_data/google/reviews/tasks_ready", null, auth);
    const readyIds = (ready.tasks || []).flatMap((group) => group.result || []).map((item) => item.id);
    if (!readyIds.includes(taskId)) continue;
    task = (await api("GET", `/v3/business_data/google/reviews/task_get/${encodeURIComponent(taskId)}`, null, auth)).tasks?.[0];
    break;
  }
  if (!task?.result?.[0]) throw new Error("The review task did not complete within 20 minutes.");
  const result = task.result[0];
  const reviews = (result.items || []).slice(0, 100).map(normalize);
  if (!reviews.length) throw new Error("No reviews were returned; existing data was not overwritten.");
  const output = {
    businessName: "Duet Hearing", sourceProfileName: String(result.title || ""), placeId: PLACE_ID,
    googleRating: Number(result.rating?.value || 0), googleReviewCount: Number(result.reviews_count || 0), pulledAt: new Date().toISOString(), reviews,
  };
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  process.stdout.write(`Saved ${reviews.length} reviews; Google total ${output.googleReviewCount}.\n`);
}

await main();
