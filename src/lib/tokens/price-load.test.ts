import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const state = vi.hoisted(() => ({ texts: [] as string[], params: [] as unknown[][], rows: [] as unknown[] }));
const dialect = new PgDialect();

vi.mock("../../db", () => ({
  db: {
    execute: async (q: unknown) => {
      const { sql, params } = dialect.sqlToQuery(q as SQL);
      state.texts.push(sql);
      state.params.push(params);
      return { rows: state.rows };
    },
  },
}));

import { loadTokenPrices } from "./price";

const TOKEN = "11111111-1111-4111-8111-111111111111";
const PRINTING = "aaaaaaa1-0000-4000-8000-000000000001";
const NEWEST = "2026-10-11T21:36:01.926Z";
const base = {
  newest_as_of: NEWEST, token_oracle_id: null, price_cents: null, price_cents_foil: null, price_cents_etched: null,
  as_of: null, scryfall_id: null, set_code: null, collector_number: null, product_name: null, product_set: null, product_number: null,
};

beforeEach(() => { state.texts = []; state.params = []; state.rows = []; });

describe("loadTokenPrices", () => {
  it("reads nothing for no tokens", async () => {
    const r = await loadTokenPrices([]);
    expect(r).toEqual({ prices: new Map(), newestAsOf: null });
    expect(state.texts).toHaveLength(0);
  });

  it("maps a priced row to a fact keyed by token, with Scryfall's printing and Mana Pool's product", async () => {
    state.rows = [{
      ...base, token_oracle_id: TOKEN, price_cents: 15, price_cents_foil: 40, as_of: new Date(NEWEST),
      scryfall_id: PRINTING, set_code: "ttla", collector_number: "11",
      product_name: "Soldier // Eldrazi", product_set: "TONC", product_number: "1-17",
    }];
    const r = await loadTokenPrices([TOKEN]);
    expect(r.newestAsOf?.toISOString()).toBe(NEWEST);
    expect(r.prices.get(TOKEN)).toEqual({
      cents: 15, foilCents: 40, etchedCents: null, asOf: new Date(NEWEST),
      printing: { scryfallId: PRINTING, setCode: "ttla", collectorNumber: "11", productName: "Soldier // Eldrazi", productSet: "TONC", productNumber: "1-17" },
    });
    // The ids travel as ONE array parameter, not an expanded list.
    expect(state.params[0]).toContainEqual([TOKEN]);
  });

  it("skips the placeholder row of nothing-priced but still reports the newest timestamp", async () => {
    state.rows = [{ ...base }];
    const r = await loadTokenPrices([TOKEN]);
    expect(r.prices.size).toBe(0);
    expect(r.newestAsOf?.toISOString()).toBe(NEWEST);
  });

  it("parses string timestamps, as a driver that does not return Dates hands them back", async () => {
    state.rows = [{ ...base, token_oracle_id: TOKEN, price_cents: 15, as_of: NEWEST, scryfall_id: PRINTING, set_code: "x", collector_number: "1" }];
    const r = await loadTokenPrices([TOKEN]);
    expect(r.prices.get(TOKEN)?.asOf.toISOString()).toBe(NEWEST);
  });

  it("keeps a stale row as returned, for priceState to read as sold out", async () => {
    state.rows = [{ ...base, token_oracle_id: TOKEN, price_cents: 15, as_of: new Date("2026-10-01T00:00:00Z"), scryfall_id: PRINTING, set_code: "x", collector_number: "1" }];
    const r = await loadTokenPrices([TOKEN]);
    expect(r.prices.get(TOKEN)?.asOf.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(r.newestAsOf?.toISOString()).toBe(NEWEST);
  });
});
