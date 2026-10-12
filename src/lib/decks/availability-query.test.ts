// The claim read's SQL with Locked's switch off must be the query it was before locks existed:
// /collection and /commanders read it too, and neither knows about locks. The emitted text is
// captured from a fake transaction and rendered with the real dialect.
import { afterEach, describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { loadAvailability } from "./availability-query";

const was = process.env.NEVER_CUT_ENABLED;
afterEach(() => {
  if (was === undefined) delete process.env.NEVER_CUT_ENABLED;
  else process.env.NEVER_CUT_ENABLED = was;
});

async function emitted(flag: string | undefined): Promise<string> {
  if (flag === undefined) delete process.env.NEVER_CUT_ENABLED;
  else process.env.NEVER_CUT_ENABLED = flag;
  let captured: SQL | null = null;
  const tx = { execute: async (q: SQL) => { captured = q; return { rows: [] }; } };
  await loadAvailability("user_1", { oracleIds: ["o1"] }, tx as never);
  return new PgDialect().sqlToQuery(captured!).sql;
}

describe("loadAvailability and the lock", () => {
  it("emits no lock read at all with the switch off", async () => {
    const off = await emitted(undefined);
    expect(off).not.toContain("deck_locks");
    expect(off).not.toContain("'locked'");
  });

  // Byte-identical: the ON query is the OFF query plus exactly the one key, and nothing else moved.
  it("adds only the one key with the switch on", async () => {
    const off = await emitted(undefined);
    const on = await emitted("true");
    expect(on).toContain("'locked', exists (");
    const start = on.indexOf("            'locked', exists (");
    const end = on.indexOf("),\n", start) + 3;
    expect(on.slice(0, start) + on.slice(end)).toBe(off);
  });
});

describe("loadAvailability with unownedAsZero (the cart's chooser)", () => {
  const render = async (opts: Parameters<typeof loadAvailability>[1]) => {
    let captured: SQL | null = null;
    const tx = { execute: async (q: SQL) => { captured = q; return { rows: [] }; } };
    await loadAvailability("user_1", opts, tx as never);
    return new PgDialect().sqlToQuery(captured!).sql;
  };

  it("leaves every other reader's query exactly as it was", async () => {
    expect(await render({ oracleIds: ["o1"], unownedAsZero: false })).toBe(await render({ oracleIds: ["o1"] }));
  });

  it("drives the select from the named cards too, an unowned one at 0", async () => {
    const q = await render({ oracleIds: ["o1"], unownedAsZero: true });
    expect(q).toContain("from (");
    expect(q).toMatch(/select x\.oracle_id, 0 from unnest\(\$\d+::uuid\[\]\) as x\(oracle_id\)/);
    expect(q).toContain("where not exists (select 1 from owned w where w.oracle_id = x.oracle_id)");
    expect(await render({ oracleIds: ["o1"] })).not.toContain("unnest(");
  });
});
