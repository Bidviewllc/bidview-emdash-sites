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
