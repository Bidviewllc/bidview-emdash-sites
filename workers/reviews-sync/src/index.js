import { SITES } from "./config.js";
import { alert } from "./alert.js";
import { runCatchUp, runCollect, runPost } from "./sync.js";

// These strings must match wrangler.jsonc. tests/index.test.mjs fails if they drift.
export const CRONS = {
  post: "0 13 * * SUN",
  collect: "*/20 13-16 * * SUN",
  catchup: "0 13 * * MON",
};

export async function dispatch(cron, env, opts = {}) {
  if (cron === CRONS.post) return runPost(env, opts);
  if (cron === CRONS.collect) return runCollect(env, opts);
  if (cron === CRONS.catchup) return runCatchUp(env, opts);
  return [{ status: "unknown-cron", cron }];
}

async function tokenOk(got, want) {
  if (!got || !want) return false;
  const enc = new TextEncoder();
  const a = enc.encode(got);
  const b = enc.encode(want);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// live=1 forces a real run for one call even while DRY_RUN=1; dry=1 forces a dry run.
export function resolveDry(url, env) {
  if (url.searchParams.get("live") === "1") return false;
  return url.searchParams.get("dry") === "1" || env.DRY_RUN === "1";
}

// A cron run that throws must still reach Slack. The error message only, never
// request headers, env values or tokens.
async function runCron(cron, env) {
  try {
    return await dispatch(cron, env, { dry: env.DRY_RUN === "1" });
  } catch (e) {
    const message = e && e.message ? e.message : "unknown error";
    await alert(env, `reviews-sync cron ${cron} failed: ${message}`);
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCron(event.cron, env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("ok");
    if (url.pathname === "/run" && request.method === "POST") {
      if (!(await tokenOk(request.headers.get("x-run-token"), env.RUN_TOKEN))) {
        return new Response("forbidden", { status: 403 });
      }
      const cron = CRONS[url.searchParams.get("mode")];
      if (!cron) return new Response("mode must be post, collect or catchup", { status: 400 });
      const only = url.searchParams.get("site");
      const sites = only ? SITES.filter((s) => s.site === only) : SITES;
      if (only && sites.length === 0) return new Response("unknown site", { status: 400 });
      const dry = resolveDry(url, env);
      try {
        return Response.json(await dispatch(cron, env, { dry, sites }));
      } catch (e) {
        const message = e && e.message ? e.message : "unknown error";
        await alert(env, "reviews-sync /run failed: " + message);
        return new Response("run failed", { status: 500 });
      }
    }
    return new Response("not found", { status: 404 });
  },
};
