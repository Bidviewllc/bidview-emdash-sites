import { SITES } from "./config.js";
import { ensureSchema, getJob, getMeta, setJob, upsertResult } from "./db.js";
import { getTask, postTask } from "./dfs.js";
import { normalizeResult } from "./normalize.js";
import { alert } from "./alert.js";

const HOUR = 3600000;
const DAY = 24 * HOUR;
export const MIN_RESYNC_DAYS = 6;
export const PENDING_EXPIRES_HOURS = 48;
export const STALE_SYNC_DAYS = 10;

export function validate(loc, norm) {
  if (norm.placeId && norm.placeId !== loc.placeId) {
    return `place_id mismatch: got ${norm.placeId}, expected ${loc.placeId}`;
  }
  const want = loc.expectedTitleIncludes || [];
  if (want.length && !want.some((w) => norm.title.toLowerCase().includes(w.toLowerCase()))) {
    return `title mismatch: got "${norm.title}"`;
  }
  if (norm.reviews.length === 0) return "pull returned no reviews";
  return null;
}

async function eachLocation(env, sites, fetchFn, fn) {
  const out = [];
  for (const site of sites) {
    const db = env[site.dbBinding];
    if (!db) {
      out.push({ site: site.site, status: "no-db" });
      await alert(env, `reviews-sync: no D1 binding ${site.dbBinding} for ${site.site}`, fetchFn);
      continue;
    }
    try {
      await ensureSchema(db);
    } catch (e) {
      const error = String(e?.message || e);
      out.push({ site: site.site, status: "error", error });
      await alert(env, `reviews-sync: schema setup failed for ${site.site}: ${error}`, fetchFn);
      continue;
    }
    for (const loc of site.locations) {
      const r = { site: site.site, location: loc.key };
      try {
        await fn({ db, site, loc, r });
      } catch (e) {
        r.status = "error";
        r.error = String(e?.message || e);
        await alert(env, `reviews-sync error for ${site.site}/${loc.key}: ${r.error}`, fetchFn);
      }
      out.push(r);
    }
  }
  return out;
}

export async function runPost(env, { now = new Date(), fetchFn = fetch, sites = SITES, dry = false } = {}) {
  return eachLocation(env, sites, fetchFn, async ({ db, loc, r }) => {
    const job = await getJob(db, loc.key);
    const meta = await getMeta(db, loc.key);
    if (job?.status === "pending" && now - Date.parse(job.posted_at) < PENDING_EXPIRES_HOURS * HOUR) {
      r.status = "skipped-pending";
    } else if (meta?.synced_at && now - Date.parse(meta.synced_at) < MIN_RESYNC_DAYS * DAY) {
      r.status = "skipped-recent";
    } else if (dry) {
      r.status = "would-post";
    } else {
      const taskId = await postTask(env, loc, fetchFn);
      await setJob(db, { location: loc.key, taskId, status: "pending", postedAt: now.toISOString() });
      r.status = "posted";
      r.taskId = taskId;
    }
  });
}

export async function runCollect(env, { now = new Date(), fetchFn = fetch, sites = SITES, dry = false } = {}) {
  return eachLocation(env, sites, fetchFn, async ({ db, site, loc, r }) => {
    const job = await getJob(db, loc.key);
    if (job?.status !== "pending") { r.status = "idle"; return; }
    const keep = { location: loc.key, taskId: job.task_id, postedAt: job.posted_at };
    const t = await getTask(env, job.task_id, fetchFn);
    if (t.state === "pending") { r.status = "still-pending"; return; }
    if (t.state === "error") {
      r.error = t.message;
      if (dry) {
        r.status = "would-fail";
        console.log(`[reviews-sync] dry: would mark ${site.site}/${loc.key} failed: ${t.message}`);
        return;
      }
      await setJob(db, { ...keep, status: "failed" });
      r.status = "failed";
      await alert(env, `reviews-sync: DataForSEO task failed for ${site.site}/${loc.key}: ${t.message}`, fetchFn);
      return;
    }
    const norm = normalizeResult(t.result, now.toISOString());
    const problem = validate(loc, norm);
    if (problem) {
      r.reason = problem;
      if (dry) {
        r.status = "would-reject";
        console.log(`[reviews-sync] dry: would reject ${site.site}/${loc.key}: ${problem}`);
        return;
      }
      await setJob(db, { ...keep, status: "rejected" });
      r.status = "rejected";
      await alert(env, `reviews-sync: rejected ${site.site}/${loc.key}: ${problem}. Nothing was written.`, fetchFn);
      return;
    }
    if (dry) { r.status = "would-write"; r.count = norm.reviews.length; return; }
    await upsertResult(db, loc.key, norm, now.toISOString());
    await setJob(db, { ...keep, status: "done" });
    r.status = "written";
    r.count = norm.reviews.length;
  });
}

export async function runCatchUp(env, opts = {}) {
  const { now = new Date(), fetchFn = fetch, sites = SITES, dry = false } = opts;
  const collected = await runCollect(env, opts);
  const byLoc = new Map(collected.map((c) => [`${c.site}/${c.location}`, c.status]));
  return eachLocation(env, sites, fetchFn, async ({ db, site, loc, r }) => {
    const prior = byLoc.get(`${site.site}/${loc.key}`);
    if (prior === "rejected" || prior === "failed" || prior === "would-reject" || prior === "would-fail") {
      r.status = "ok-alerted";
      return;
    }
    if (prior === "would-write") { r.status = "ok"; return; }
    const job = await getJob(db, loc.key);
    const meta = await getMeta(db, loc.key);
    if (job?.status === "pending") {
      if (dry) {
        r.status = "would-stale";
        console.log(`[reviews-sync] dry: would mark ${site.site}/${loc.key} stale`);
        return;
      }
      await setJob(db, { location: loc.key, taskId: job.task_id, status: "stale", postedAt: job.posted_at });
      r.status = "stale";
      await alert(env, `reviews-sync: ${site.site}/${loc.key} task ${job.task_id} is still pending after the weekend. It will be re-posted next Sunday.`, fetchFn);
    } else if (!meta?.synced_at || now - Date.parse(meta.synced_at) > STALE_SYNC_DAYS * DAY) {
      r.status = "stale-data";
      if (dry) { console.log(`[reviews-sync] dry: ${site.site}/${loc.key} has not synced in over ${STALE_SYNC_DAYS} days`); return; }
      await alert(env, `reviews-sync: ${site.site}/${loc.key} has not synced in over ${STALE_SYNC_DAYS} days.`, fetchFn);
    } else {
      r.status = "ok";
    }
  });
}
