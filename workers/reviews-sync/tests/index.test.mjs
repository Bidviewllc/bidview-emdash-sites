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
