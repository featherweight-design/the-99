// Store preference (design #3200): discovery's `loadPrices` reads another store's own rows against that store's own
// newest snapshot, its sold-out printings not live. Mana Pool keeps the drizzle statement it had.
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ executed: [] as unknown[], selects: 0 }));
vi.mock("../../db", () => ({
  db: {
    execute: async (q: unknown) => {
      state.executed.push(q);
      return { rows: [{ oracleId: "a", liveCents: "420", everPriced: true, live: true }, { oracleId: "b", liveCents: null, everPriced: true, live: false }] };
    },
    select: () => {
      state.selects += 1;
      const chain = { from: () => chain, innerJoin: () => chain, where: () => chain, groupBy: async () => [] };
      return chain;
    },
  },
}));

const { loadPrices } = await import("./price");
const dialect = new PgDialect();

describe("loadPrices for another store", () => {
  it("reads that store's rows and newest snapshot, and draws a numeric figure", async () => {
    const prices = await loadPrices(["a", "b"], "tcgplayer");
    expect(state.selects).toBe(0);
    const q = dialect.sqlToQuery(state.executed[0] as SQL);
    expect(q.sql).toMatch(/select max\(as_of\) as as_of from printing_store_prices where store = \$\d+\)/);
    expect(q.sql).toMatch(/not pp\.sold_out and pp\.price_cents is not null/);
    expect(q.sql).not.toMatch(/printing_prices\b/);
    expect(q.params).toContain("tcgplayer");
    expect(prices.get("a")).toEqual({ oracleId: "a", liveCents: 420, everPriced: true, live: true });
    expect(prices.get("b")?.liveCents).toBeNull();
  });

  it("reads Mana Pool's own statement by default, and nothing for no ids", async () => {
    state.executed.length = 0;
    await loadPrices(["a"]);
    expect(state.executed).toHaveLength(0);
    expect(state.selects).toBe(1);
    expect((await loadPrices([], "tcgplayer")).size).toBe(0);
    expect(state.executed).toHaveLength(0);
  });
});
