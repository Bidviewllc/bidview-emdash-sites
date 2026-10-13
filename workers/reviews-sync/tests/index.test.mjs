import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker, { CRONS, dispatch } from "../src/index.js";

test("wrangler.jsonc lists exactly the cron schedules the code dispatches on", () => {
  const cfg = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.deepEqual([...cfg.triggers.crons].sort(), Object.values(CRONS).sort());
});

test("wrangler.jsonc binds a D1 database for every configured site", async () => {
  const cfg = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  const { SITES } = await import("../src/config.js");
  const bound = new Set(cfg.d1_databases.map((d) => d.binding));
  for (const s of SITES) assert.ok(bound.has(s.dbBinding), s.dbBinding);
});

test("an unknown cron does nothing", async () => {
  assert.deepEqual(await dispatch("1 2 3 4 5", {}), [{ status: "unknown-cron", cron: "1 2 3 4 5" }]);
});

test("/run rejects a missing or wrong token and /health is open", async () => {
  const env = { RUN_TOKEN: "secret" };
  const bad = await worker.fetch(new Request("https://x/run?mode=post", { method: "POST" }), env);
  assert.equal(bad.status, 403);
  const wrong = await worker.fetch(new Request("https://x/run?mode=post", { method: "POST", headers: { "x-run-token": "nope" } }), env);
  assert.equal(wrong.status, 403);
  assert.equal(await (await worker.fetch(new Request("https://x/health"), env)).text(), "ok");
  const noSecret = await worker.fetch(new Request("https://x/run?mode=post", { method: "POST", headers: { "x-run-token": "" } }), {});
  assert.equal(noSecret.status, 403);
});

test("/run with a good token and a bad mode returns 400", async () => {
  const r = await worker.fetch(new Request("https://x/run?mode=bogus", { method: "POST", headers: { "x-run-token": "secret" } }), { RUN_TOKEN: "secret" });
  assert.equal(r.status, 400);
});

test("/run rejects an unknown site name with 400 and dispatches nothing", async () => {
  const r = await worker.fetch(new Request("https://x/run?mode=post&site=nope", { method: "POST", headers: { "x-run-token": "secret" } }), { RUN_TOKEN: "secret" });
  assert.equal(r.status, 400);
  assert.equal(await r.text(), "unknown site");
});

test("/run with a real site name and dry=1 reaches dispatch and reports only that site", async () => {
  const { SITES } = await import("../src/config.js");
  const name = SITES[0].site;
  // No D1 bindings: each site reports no-db, so nothing is written and no network call is made.
  const r = await worker.fetch(new Request(`https://x/run?mode=post&site=${name}&dry=1`, { method: "POST", headers: { "x-run-token": "secret" } }), { RUN_TOKEN: "secret" });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].site, name);
});

test("a cron run that throws sends one Slack alert with the error message and the promise does not reject", async () => {
  const { SITES } = await import("../src/config.js");
  const origFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: init?.body });
    return new Response("ok");
  };
  try {
    // Accessing any D1 binding throws, which escapes eachLocation and rejects dispatch.
    const env = new Proxy(
      { RUN_TOKEN: "secret", SLACK_ALERTS_WEBHOOK: "https://hooks.example/test" },
      {
        get(target, prop) {
          if (typeof prop === "string" && SITES.some((s) => s.dbBinding === prop)) {
            throw new Error("binding boom");
          }
          return target[prop];
        },
      },
    );
    const pending = [];
    const ctx = { waitUntil: (p) => pending.push(p) };
    worker.scheduled({ cron: CRONS.post }, env, ctx);
    assert.equal(pending.length, 1);
    await Promise.all(pending);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://hooks.example/test");
    const text = JSON.parse(calls[0].body).text;
    assert.ok(text.includes(`reviews-sync cron ${CRONS.post} failed: binding boom`), text);
  } finally {
    globalThis.fetch = origFetch;
  }
});

import { resolveDry } from "../src/index.js";
import { fakeD1 } from "./helpers/fake-d1.mjs";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

test("cron day-of-week fields use SUN-SAT names, never numbers, in code and wrangler.jsonc", () => {
  const cfg = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  for (const cron of [...Object.values(CRONS), ...cfg.triggers.crons]) {
    const dow = cron.split(/\s+/)[4];
    assert.ok(dow && !/^[\d,\-*\/]+$/.test(dow) || dow === "*", `numeric weekday in "${cron}"`);
    for (const name of dow.split(/[,\-]/)) assert.ok(DAYS.includes(name) || name === "*", `bad weekday "${name}" in "${cron}"`);
  }
  assert.equal(CRONS.post, "0 13 * * SUN");
  assert.equal(CRONS.collect, "*/20 13-16 * * SUN");
  assert.equal(CRONS.catchup, "0 13 * * MON");
});

test("each cron key reaches its own runner", async () => {
  const site = { site: "s", dbBinding: "DB", locations: [{ key: "arvada", label: "Arvada", placeId: "P", depth: 50, expectedTitleIncludes: [] }] };
  const env = { DB: fakeD1() };
  const status = async (cron, dry) => (await dispatch(cron, env, { dry, sites: [site], now: new Date("2026-10-18T13:00:00Z") }))[0].status;
  assert.equal(await status(CRONS.post, true), "would-post");
  assert.equal(await status(CRONS.collect, true), "idle");
  assert.equal(await status(CRONS.catchup, true), "stale-data");
});

test("resolveDry: live=1 overrides DRY_RUN, otherwise dry=1 or DRY_RUN decide", () => {
  const u = (q) => new URL("https://x/run?" + q);
  assert.equal(resolveDry(u("mode=post"), {}), false);
  assert.equal(resolveDry(u("mode=post&dry=1"), {}), true);
  assert.equal(resolveDry(u("mode=post"), { DRY_RUN: "1" }), true);
  assert.equal(resolveDry(u("mode=post&live=1"), { DRY_RUN: "1" }), false);
});

test("/run live=1 with DRY_RUN=1 and a good token returns 200", async () => {
  const r = await worker.fetch(new Request("https://x/run?mode=post&live=1", { method: "POST", headers: { "x-run-token": "secret" } }), { RUN_TOKEN: "secret", DRY_RUN: "1" });
  assert.equal(r.status, 200);
});

test("/run that throws returns 500 and sends one Slack alert with the message only", async () => {
  const { SITES } = await import("../src/config.js");
  const origFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, body: init?.body }); return new Response("ok"); };
  try {
    const env = new Proxy({ RUN_TOKEN: "secret", SLACK_ALERTS_WEBHOOK: "https://hooks.example/test" }, {
      get(t, p) { if (typeof p === "string" && SITES.some((s) => s.dbBinding === p)) throw new Error("run boom"); return t[p]; },
    });
    const r = await worker.fetch(new Request("https://x/run?mode=post", { method: "POST", headers: { "x-run-token": "secret" } }), env);
    assert.equal(r.status, 500);
    assert.equal(await r.text(), "run failed");
    assert.equal(calls.length, 1);
    assert.ok(JSON.parse(calls[0].body).text.endsWith("reviews-sync /run failed: run boom"));
  } finally {
    globalThis.fetch = origFetch;
  }
});
