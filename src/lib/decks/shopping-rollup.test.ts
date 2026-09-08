import { describe, expect, it } from "vitest";
import { sumShopping } from "./shopping-rollup";

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
