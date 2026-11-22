import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
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
import { priceState, type PriceFact } from "./price";

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
  it("prices only the picks of cards it was asked for", async () => {
    const OTHER = "44444444-4444-4444-8444-444444444444";
    await loadPrices([CARD], [
      { deckId: DECK, oracleId: CARD, setCode: "khm", collectorNumber: "31" },
      { deckId: DECK, oracleId: OTHER, setCode: "m21", collectorNumber: "1" },
    ]);
    expect(state.params[0]).toContainEqual([CARD]);
    expect(JSON.stringify(state.params[0])).not.toContain(OTHER);
  });

  it("issues today's statement when none of the picks is for a card it was asked for", async () => {
    await loadPrices([CARD], [{ deckId: DECK, oracleId: "44444444-4444-4444-8444-444444444444", setCode: "m21", collectorNumber: "1" }]);
    expect(state.texts[0]).not.toContain("picked");
  });

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
    // A pair two variants share prices nothing: the row keeps today's figure.
    expect(state.texts[0]).toMatch(/p2\.collector_number = w\.collector_number\s+\) = 1/);
    // Stored lowercase, so the pick is matched in that form.
    expect(state.params[0]).toContainEqual(["khm"]);
    expect(result.prices.get(CARD)?.cents).toBe(70);
    expect(result.picked?.get(`${DECK}|${CARD}`)?.cents).toBe(110);
    expect(priceFor(result, DECK, CARD)?.cents).toBe(110);
  });

  it("names the printing behind each figure, the chosen one and the pick alike (I got it's preset)", async () => {
    const CHOSEN = "55555555-5555-4555-8555-555555555555";
    const PICK = "66666666-6666-4666-8666-666666666666";
    state.rows = [
      {
        newest_as_of: NEWEST, deck_id: null, oracle_id: CARD, price_cents: 70, price_cents_foil: null, price_cents_etched: null, as_of: NEWEST, scryfall_id: CHOSEN,
      },
      {
        newest_as_of: NEWEST, deck_id: DECK, oracle_id: CARD, price_cents: 110, price_cents_foil: null, price_cents_etched: null, as_of: NEWEST, scryfall_id: PICK,
      },
    ];
    const result = await loadPrices([CARD], [{ deckId: DECK, oracleId: CARD, setCode: "KHM", collectorNumber: "31" }]);
    // Both halves select it, in the same column position, so the union lines up.
    // Each half also tags whether the row is a NAMED printing's (wishlist), after the id, in the same position.
    expect(state.texts[0]).toMatch(/pp\.as_of, p\.scryfall_id, false as named\s+from unnest/);
    expect(state.texts[0]).toMatch(/pp\.as_of,\s+p\.scryfall_id,\s+false as named\s+from printings p/);
    expect(state.texts[0]).toMatch(/facts\.as_of,\s+facts\.scryfall_id,\s+facts\.named/);
    expect(result.prices.get(CARD)?.printing).toEqual({ scryfallId: CHOSEN });
    expect(priceFor(result, DECK, CARD)?.printing).toEqual({ scryfallId: PICK });
    expect(priceFor(result, OTHER_DECK, CARD)?.printing).toEqual({ scryfallId: CHOSEN });
  });
});

describe("loadPrices per store", () => {
  const A = "77777777-7777-4777-8777-777777777777";
  const pick = [{ deckId: DECK, oracleId: CARD, setCode: "LEA", collectorNumber: "1" }];
  /** Every shape the read can issue: no picks, picks, named printings, both, and named alone. */
  async function everyShape(store?: "manapool" | "tcgplayer" | "cardkingdom") {
    const O = CARD;
    const args: [string[], typeof pick, string[]][] = [[[O], [], []], [[O], pick, []], [[O], [], [O]], [[O], pick, [O]], [[], [], [O]]];
    for (const [ids, picks, named] of args) {
      if (store) await loadPrices(ids, picks, named, store);
      else await loadPrices(ids, picks, named);
    }
    return state.texts.map((t, i) => `${t}\n--params ${JSON.stringify(state.params[i])}`).join("\n=====\n") + "\n";
  }

  it("reads Mana Pool byte for byte as it did before stores, with or without the argument", async () => {
    // The fixture is the statement main issued before stores, rendered for each shape.
    const before = readFileSync(new URL("./price-query.manapool.sql", import.meta.url), "utf8");
    expect(await everyShape()).toBe(before);
    state.texts = [];
    state.params = [];
    expect(await everyShape("manapool")).toBe(before);
  });

  it("reads another store's own rows and its own newest, in every half of the statement", async () => {
    await loadPrices([CARD], pick, [A], "cardkingdom");
    const text = state.texts[0];
    expect(text).not.toMatch(/\bprinting_prices\b/);
    expect(text).toMatch(/select max\(as_of\) as as_of from printing_store_prices where store = \$1/);
    // chosen, picked and named each join the store's rows.
    expect(text.match(/from printing_store_prices\s+where store = \$\d+\s+\) s/g)).toHaveLength(3);
    expect(state.params[0].filter((v) => v === "cardkingdom")).toHaveLength(4);
    // A sold-out printing sorts with the stale ones, behind every printing in stock.
    expect(text).toContain("(pp.as_of = (select as_of from newest) and not pp.sold_out) desc");
    expect(text).toMatch(/facts\.named,\s+facts\.sold_out\s+from newest/);
  });

  it("selects sold_out in every half, so the union lines up for a store", async () => {
    await loadPrices([CARD], pick, [A], "cardkingdom");
    const text = state.texts[0];
    // chosen, picked and named: each half's select list ends named, then sold_out, before its from.
    expect(text.match(/(false|true) as named, pp\.sold_out\s+from (printings|unnest)/g)).toHaveLength(3);
    // Mana Pool's halves carry no sold_out at all, so its statement is unchanged.
    state.texts = [];
    await loadPrices([CARD], pick, [A]);
    expect(state.texts[0]).not.toContain("sold_out");
  });

  it("draws a store's sold-out row as sold out, though its as_of is the newest", async () => {
    state.rows = [
      { newest_as_of: NEWEST, deck_id: null, oracle_id: CARD, price_cents: 300, price_cents_foil: null, price_cents_etched: null, as_of: NEWEST, scryfall_id: A, named: false, sold_out: true },
    ];
    const result = await loadPrices([CARD], [], [], "cardkingdom");
    const fact = result.prices.get(CARD);
    expect(fact?.soldOut).toBe(true);
    expect(priceState(fact, result.newestAsOf)).toBe("soldOut");
  });

  it("leaves soldOut off a row in stock, so a store's live fact reads as Mana Pool's does", async () => {
    state.rows = [
      { newest_as_of: NEWEST, deck_id: null, oracle_id: CARD, price_cents: 250, price_cents_foil: null, price_cents_etched: null, as_of: NEWEST, scryfall_id: A, named: false, sold_out: false },
    ];
    const result = await loadPrices([CARD], [], [], "tcgplayer");
    expect(result.prices.get(CARD)).not.toHaveProperty("soldOut");
    expect(priceState(result.prices.get(CARD), result.newestAsOf)).toBe("priced");
  });
});
