import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const DECK = "11111111-1111-4111-8111-111111111111";
const OTHER_DECK = "22222222-2222-4222-8222-222222222222";
const CARD = "33333333-3333-4333-8333-333333333333";

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

import { loadPrices, priceFor, pricesForDeck, type PriceRead } from "./price-query";
import { moneyStats } from "./stats-money";
import type { PriceFact } from "./price";

const NEWEST = new Date("2026-10-10T09:00:00Z");
const STALE = new Date("2026-10-01T09:00:00Z");
const fact = (cents: number | null, asOf = NEWEST, foilCents: number | null = null): PriceFact =>
  ({ cents, foilCents, etchedCents: null, asOf });

function read(picked: PriceFact | null): PriceRead {
  return {
    prices: new Map([[CARD, fact(70)]]),
    newestAsOf: NEWEST,
    picked: picked ? new Map([[`${DECK}|${CARD}`, picked]]) : new Map(),
  };
}

beforeEach(() => {
  state.texts = [];
  state.params = [];
  state.rows = [];
});

describe("priceFor (the deck printings price rule)", () => {
  it("prices the pick when it is in stock", () => {
    expect(priceFor(read(fact(110)), DECK, CARD)?.cents).toBe(110);
  });

  it("prices a foil-only pick, which is in stock", () => {
    expect(priceFor(read(fact(null, NEWEST, 450)), DECK, CARD)?.foilCents).toBe(450);
  });

  it("falls back to today's figure when the pick is sold out", () => {
    expect(priceFor(read(fact(110, STALE)), DECK, CARD)?.cents).toBe(70);
  });

  it("falls back to today's figure when the pick has no price in any finish", () => {
    expect(priceFor(read(fact(null)), DECK, CARD)?.cents).toBe(70);
  });

  it("answers today's figure for another deck and for no pick at all", () => {
    expect(priceFor(read(fact(110)), OTHER_DECK, CARD)?.cents).toBe(70);
    expect(priceFor(read(null), DECK, CARD)?.cents).toBe(70);
    expect(priceFor({ prices: new Map(), newestAsOf: NEWEST }, DECK, CARD)).toBeNull();
  });

  it("feeds the Money card the pick's figure, with no change on its side", () => {
    const prices = pricesForDeck(read(fact(110)), DECK);
    const card = (price: PriceFact | null) => ({
      oracleId: CARD, name: "Card", quantity: 2, typeLine: "Artifact", owned: false, price,
    });
    const stats = (price: PriceFact | null) =>
      moneyStats({ cards: [card(price)] as never, commanders: [], shopping: [{ oracleId: CARD }] }, NEWEST)!;
    // Two copies to buy: 2 × the pick's $1.10, where today's figure would be 2 × $0.70.
    expect(stats(prices.get(CARD) ?? null).toBuy.cents).toBe(220);
    expect(stats(fact(70)).toBuy.cents).toBe(140);
  });
});

describe("loadPrices", () => {
  it("issues today's statement with no picks, and returns no picked map", async () => {
    const result = await loadPrices([CARD]);
    expect(state.texts[0]).not.toContain("picked");
    expect(result.picked).toBeUndefined();
  });

  it("prices each pick in the SAME statement, by its own printing", async () => {
    state.rows = [
      {
        newest_as_of: NEWEST, deck_id: null, oracle_id: CARD, price_cents: 70, price_cents_foil: null, price_cents_etched: null, as_of: NEWEST,
      },
      {
        newest_as_of: NEWEST, deck_id: DECK, oracle_id: CARD, price_cents: 110, price_cents_foil: null, price_cents_etched: null, as_of: NEWEST,
      },
    ];
    const result = await loadPrices([CARD], [{ deckId: DECK, oracleId: CARD, setCode: "KHM", collectorNumber: "31" }]);
    expect(state.texts).toHaveLength(1);
    expect(state.texts[0]).toContain("picked as (");
    expect(state.texts[0]).toContain("union all select * from picked");
    expect(state.texts[0]).toContain("p.set_code = w.set_code and p.collector_number = w.collector_number");
    // Stored lowercase, so the pick is matched in that form.
    expect(state.params[0]).toContainEqual(["khm"]);
    expect(result.prices.get(CARD)?.cents).toBe(70);
    expect(result.picked?.get(`${DECK}|${CARD}`)?.cents).toBe(110);
    expect(priceFor(result, DECK, CARD)?.cents).toBe(110);
  });
});
