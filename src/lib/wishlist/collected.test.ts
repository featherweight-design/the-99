// The collected sweep's statement, by the SQL it sends: both sides of the wishlist, each by its own held test.
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
const { sweepCollectedIn } = await import("./collected");

const dialect = new PgDialect();

async function sent(): Promise<string> {
  let query: SQL | undefined;
  await sweepCollectedIn({ execute: (async (q: SQL) => { query = q; return { rows: [] }; }) as never }, "user_1");
  return dialect.sqlToQuery(query!).sql.replace(/\s+/g, " ");
}

describe("sweepCollectedIn", () => {
  it("deletes a hand line by its printing and a synced line by any printing", async () => {
    const q = await sent();
    expect(q).toContain("delete from wishlist_items w where w.user_id = $1 and w.quantity <= ( select coalesce(sum(ci.quantity), 0)::int from collection_items ci where ci.user_id = w.user_id and ci.oracle_id = w.oracle_id and (w.scryfall_id::uuid is null");
    expect(q).toContain("delete from wishlist_synced s where s.user_id = $2 and s.quantity <= ( select coalesce(sum(ci.quantity), 0)::int from collection_items ci where ci.user_id = s.user_id and ci.oracle_id = s.oracle_id and (null::uuid is null");
  });

  it("records a card once, at the larger want, and no synced receipt while its hand line stands", async () => {
    const q = await sent();
    expect(q).toContain("select $4, g.oracle_id, max(g.quantity) from gone g group by g.oracle_id");
    expect(q).toContain("where not exists ( select 1 from wishlist_items sw where sw.user_id = $3 and sw.oracle_id = gs.oracle_id and not exists (select 1 from gone_hand gh2 where gh2.oracle_id = gs.oracle_id)");
  });
});
