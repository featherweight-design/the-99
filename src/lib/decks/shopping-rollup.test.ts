import { describe, expect, it, vi } from "vitest";
import { sumShopping } from "./shopping-rollup";
import { ENV_VIEW } from "@/test/env-view";

describe("sumShopping", () => {
  it("adds copies, cost and the priced denominator independently", () => {
    expect(
      sumShopping([
        { copies: 3, cents: 1840, pricedCopies: 3 },
        { copies: 15, cents: 7640, pricedCopies: 12 },
      ]),
    ).toEqual({ copies: 18, cents: 9480, pricedCopies: 15 });
  });

  it("counts a card wanted by two decks twice — this is a shopping list", () => {
    // Two decks each needing one unowned copy of the same card is two copies to
    // buy, not one.
    const oneEach = { copies: 1, cents: 500, pricedCopies: 1 };
    expect(sumShopping([oneEach, oneEach]).copies).toBe(2);
  });

  it("does not treat an unpriced copy as free", () => {
    // A printing absent from printing_prices has never been stocked; it adds
    // nothing to the cost and still counts as a card to buy.
    expect(sumShopping([{ copies: 4, cents: 900, pricedCopies: 2 }])).toEqual({
      copies: 4,
      cents: 900,
      pricedCopies: 2,
    });
  });

  it("is zero over an empty collection of decks", () => {
    expect(sumShopping([])).toEqual({ copies: 0, cents: 0, pricedCopies: 0 });
  });
});

describe("loadShoppingRollup, per-deck picks", () => {
  it("prices one card picked differently in two decks at each deck's own figure", async () => {
    vi.resetModules();
    const CARD = "33333333-3333-4333-8333-333333333333";
    const NEWEST = new Date("2026-10-10T09:00:00Z");
    const fact = (cents: number) => ({ cents, foilCents: null, etchedCents: null, asOf: NEWEST });
    vi.doMock("./availability-query", () => ({
      loadDeckBuyRows: async () => [
        { deckId: "deck-a", oracleId: CARD, quantity: 1 },
        { deckId: "deck-b", oracleId: CARD, quantity: 1 },
        { deckId: "deck-c", oracleId: CARD, quantity: 1 },
      ],
    }));
    vi.doMock("./printings", () => ({ readHeldPricePicks: async () => [] }));
    vi.doMock("./price-query", async (importActual) => {
      const actual = await importActual<typeof import("./price-query")>();
      return {
        ...actual,
        loadPrices: async () => ({
          prices: new Map([[CARD, fact(70)]]),
          newestAsOf: NEWEST,
          picked: new Map([[`deck-a|${CARD}`, fact(110)], [`deck-b|${CARD}`, fact(450)]]),
        }),
      };
    });
    const { loadShoppingRollup } = await import("./shopping-rollup");
    const rollup = await loadShoppingRollup("u", undefined, ENV_VIEW);
    expect(rollup.byDeck.get("deck-a")?.cents).toBe(110);
    expect(rollup.byDeck.get("deck-b")?.cents).toBe(450);
    // A deck with no pick keeps today's figure.
    expect(rollup.byDeck.get("deck-c")?.cents).toBe(70);
    expect(rollup.total.cents).toBe(630);
    vi.doUnmock("./availability-query");
    vi.doUnmock("./printings");
    vi.doUnmock("./price-query");
  });
});
