import { DatabaseSync } from "node:sqlite";

// In-memory stand-in for a Cloudflare D1 binding, backed by node:sqlite.
// Only the methods the Worker and the reader use are implemented.
export function fakeD1() {
  const sqlite = new DatabaseSync(":memory:");
  const clean = (params) => params.map((p) => (p === undefined ? null : p));
  const make = (sql, params = []) => ({
    bind: (...p) => make(sql, clean(p)),
    run: async () => {
      const r = sqlite.prepare(sql).run(...params);
      return { success: true, meta: { changes: Number(r.changes) } };
    },
    all: async () => ({ results: sqlite.prepare(sql).all(...params).map((r) => ({ ...r })) }),
    first: async () => {
      const r = sqlite.prepare(sql).get(...params);
      return r ? { ...r } : null;
    },
  });
  return {
    prepare: (sql) => make(sql),
    batch: async (stmts) => {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    exec: async (sql) => sqlite.exec(sql),
  };
}
