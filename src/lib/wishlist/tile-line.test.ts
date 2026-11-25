import { describe, expect, it } from "vitest";
import type { PriceFact } from "../cards/price-fact";
import { priceCopy } from "../copy/price";
import { wishlistTileLine } from "./tile-line";

const NEWEST = new Date("2026-11-20T00:00:00Z");
const fact = (cents: number | null, asOf = NEWEST): PriceFact => ({ cents, foilCents: null, etchedCents: null, asOf });
const sld = { setCode: "SLD", collectorNumber: "2125" };

describe("wishlistTileLine", () => {
  it("draws the figure and the printing for a chosen printing", () => {
    expect(wishlistTileLine({ price: fact(2450), printing: sld }, NEWEST)).toEqual({ price: "$24.50", printing: sld });
  });
  it("draws the figure alone for any printing", () => {
    expect(wishlistTileLine({ price: fact(399), printing: null }, NEWEST)).toEqual({ price: "$3.99", printing: null });
  });
  it("says sold out beside a chosen printing whose row is stale", () => {
    const stale = fact(2450, new Date("2026-10-01T00:00:00Z"));
    expect(wishlistTileLine({ price: stale, printing: sld }, NEWEST)).toEqual({ price: priceCopy.tag.soldOut, printing: sld });
  });
  it("draws the printing alone with no figure, and nothing with neither", () => {
    expect(wishlistTileLine({ price: null, printing: sld }, NEWEST)).toEqual({ price: null, printing: sld });
    expect(wishlistTileLine({ price: null, printing: null }, NEWEST)).toBeNull();
  });
});
