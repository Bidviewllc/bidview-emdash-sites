import test from "node:test";
import assert from "node:assert/strict";
import { fakeD1 } from "./helpers/fake-d1.mjs";
import { SITES } from "../src/config.js";

test("fake D1 round-trips rows with bind, run, all and first", async () => {
  const db = fakeD1();
  await db.prepare("CREATE TABLE t (a TEXT, b INTEGER)").run();
  await db.prepare("INSERT INTO t (a,b) VALUES (?,?)").bind("x", 1).run();
  const all = await db.prepare("SELECT * FROM t").all();
  assert.deepEqual(all.results, [{ a: "x", b: 1 }]);
  assert.deepEqual(await db.prepare("SELECT * FROM t WHERE a=?").bind("x").first(), { a: "x", b: 1 });
  assert.equal(await db.prepare("SELECT * FROM t WHERE a=?").bind("nope").first(), null);
});

test("config has a unique binding per site and a Place ID per location", () => {
  const bindings = SITES.map((s) => s.dbBinding);
  assert.equal(new Set(bindings).size, bindings.length);
  for (const s of SITES) for (const l of s.locations) assert.match(l.placeId, /^ChIJ/);
});
