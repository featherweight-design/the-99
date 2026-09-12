import { describe, expect, it } from "vitest";
import { costToComplete } from "./cost";
import type { PriceFact } from "../decks/price";

const NEWEST = new Date("2026-09-08T09:00:00Z");
const OLDER = new Date("2026-09-01T09:00:00Z");

const fact = (over: Partial<PriceFact>): PriceFact => ({
  cents: 100, foilCents: null, etchedCents: null, asOf: NEWEST, ...over,
});

describe("costToComplete", () => {
  it("sums only priced cards and states the gap", () => {
    const result = costToComplete(
      [{ price: fact({ cents: 100 }) }, { price: fact({ cents: 250 }) }, {}],
      NEWEST,
    );
    expect(result.totalCents).toBe(350);
    expect(result.pricedCount).toBe(2);
    expect(result.missingCount).toBe(3);
    expect(result.absentCount).toBe(1);
  });

  it("counts a foil-only card at its foil price rather than dropping it", () => {
    const result = costToComplete(
      [{ price: fact({ cents: null, foilCents: 500 }) }], NEWEST,
    );
    expect(result.totalCents).toBe(500);
    expect(result.pricedCount).toBe(1);
    expect(result.absentCount).toBe(0);
  });

  it("never treats an unpriced card as zero in the denominator", () => {
    const result = costToComplete([{}, {}], NEWEST);
    expect(result.totalCents).toBe(0);
    expect(result.pricedCount).toBe(0);
    expect(result.absentCount).toBe(2);
  });

  it("leaves a sold-out card out of the total rather than quoting its last price", () => {
    // A row whose as_of trails the table's newest is a last known price for something
    // nobody is selling. "Has a price row" would have quoted it.
    const result = costToComplete([{ price: fact({ asOf: OLDER }) }], NEWEST);
    expect(result.totalCents).toBe(0);
    expect(result.pricedCount).toBe(0);
    // Counted as sold out, not as never stocked: this printing WAS carried by an earlier
    // run, and the cost strip says so in different words.
    expect(result.soldOutCount).toBe(1);
    expect(result.absentCount).toBe(0);
  });

  it("costs nothing when the price table has never been populated", () => {
    // An empty table returns no rows, so the cells carry no fact at all — that is what
    // "never stocked" means here.
    const result = costToComplete([{}, {}], null);
    expect(result.totalCents).toBe(0);
    expect(result.absentCount).toBe(2);
  });

  it("cannot cost a row it has no reference point for, and does not blame the printing", () => {
    // A fact with no newest as_of to measure against: priceState answers `absent`, but the
    // feed plainly carried this printing, so "never stocked" would be false.
    const result = costToComplete([{ price: fact({}) }], null);
    expect(result.totalCents).toBe(0);
    expect(result.inconclusiveCount).toBe(1);
    expect(result.absentCount).toBe(0);
  });

  it("is an empty figure when nothing is missing", () => {
    expect(costToComplete([], NEWEST)).toEqual({
      totalCents: 0, pricedCount: 0, missingCount: 0, absentCount: 0, soldOutCount: 0,
      inconclusiveCount: 0,
    });
  });
});

describe("a live row with no usable price", () => {
  it("is counted apart from a card the feed has never carried", () => {
    // priceState returns `absent` for both, and only the second was never stocked.
    const result = costToComplete([
      { price: fact({ cents: null, foilCents: null, etchedCents: null }) },
      {},
    ], NEWEST);
    expect(result.inconclusiveCount).toBe(1);
    expect(result.absentCount).toBe(1);
  });
});
