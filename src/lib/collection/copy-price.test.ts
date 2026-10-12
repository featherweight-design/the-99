import { describe, expect, it } from "vitest";
import { indexPriceRows, type PrintingPriceRow } from "../cards/price-lookup";
import { cardPriceCode, priceSortCents, readCardPrice } from "./copy-price";
import { sortCards, type BrowseListCard } from "./browse";

const NEWEST = "2026-10-12 09:00:00";
const OLDER = "2026-10-05 09:00:00";

function row(id: string, set: string, num: string, cents: number | null, foil: number | null, etched: number | null, asOf: string | null = NEWEST): PrintingPriceRow {
  return { newest_as_of: NEWEST, scryfall_id: id, set_code: set, collector_number: num, price_cents: cents, price_cents_foil: foil, price_cents_etched: etched, as_of: asOf };
}
const copy = (scryfallId: string, setCode: string, collectorNumber: string, finishes: Record<string, number>) =>
  ({ scryfallId, setCode, collectorNumber, finishes });

describe("cardPriceCode", () => {
  const prices = indexPriceRows([
    row("a", "ONE", "1", 590, 960, null),
    row("b", "TWO", "2", 2700, null, 1500),
    row("c", "OLD", "3", 9900, null, null, OLDER),
    row("d", "NIL", "4", null, null, null, null),
  ]);

  it("prices a non-foil copy from the non-foil column", () => {
    expect(readCardPrice(cardPriceCode([copy("a", "ONE", "1", { nonfoil: 2 })], prices)))
      .toEqual({ cents: 590, finish: null, mixed: false });
  });

  it("prices a foil copy from the foil column, and names the finish", () => {
    expect(readCardPrice(cardPriceCode([copy("a", "ONE", "1", { foil: 1 })], prices)))
      .toEqual({ cents: 960, finish: "foil", mixed: false });
  });

  it("takes the MOST valuable copy and marks that a cheaper one exists", () => {
    const code = cardPriceCode([copy("a", "ONE", "1", { nonfoil: 1 }), copy("b", "TWO", "2", { nonfoil: 1 })], prices);
    expect(readCardPrice(code)).toEqual({ cents: 2700, finish: null, mixed: true });
  });

  it("counts two finishes of one printing as two copies", () => {
    expect(readCardPrice(cardPriceCode([copy("a", "ONE", "1", { nonfoil: 1, foil: 1 })], prices)))
      .toEqual({ cents: 960, finish: "foil", mixed: true });
  });

  it("draws no max when every priced copy costs the same, since none is cheaper", () => {
    const same = indexPriceRows([row("e", "SAM", "5", 100, null, null), row("f", "SAM", "6", 100, null, null)]);
    expect(readCardPrice(cardPriceCode([copy("e", "SAM", "5", { nonfoil: 1 }), copy("f", "SAM", "6", { nonfoil: 1 })], same)))
      .toEqual({ cents: 100, finish: null, mixed: false });
  });

  it("never sums copies", () => {
    expect(priceSortCents(cardPriceCode([copy("a", "ONE", "1", { nonfoil: 4 })], prices))).toBe(590);
  });

  it("reads a frozen row as sold out, the details rule, never as a figure", () => {
    expect(readCardPrice(cardPriceCode([copy("c", "OLD", "3", { nonfoil: 1 })], prices))).toEqual({ none: "soldOut" });
  });

  it("reads a printing the feed never carried as never stocked", () => {
    expect(readCardPrice(cardPriceCode([copy("d", "NIL", "4", { nonfoil: 1 })], prices))).toEqual({ none: "neverStocked" });
  });

  it("gives a foil copy of a printing stocked in no foil no figure", () => {
    expect(readCardPrice(cardPriceCode([copy("b", "TWO", "2", { foil: 1 })], prices))).toEqual({ none: "neverStocked" });
  });

  it("ignores an unpriced copy beside a priced one, with no max", () => {
    expect(readCardPrice(cardPriceCode([copy("a", "ONE", "1", { nonfoil: 1 }), copy("c", "OLD", "3", { nonfoil: 1 })], prices)))
      .toEqual({ cents: 590, finish: null, mixed: false });
  });

  it("is silent with no read, and for a copy that names no printing", () => {
    expect(cardPriceCode([copy("a", "ONE", "1", { nonfoil: 1 })], null)).toBeUndefined();
    expect(cardPriceCode([copy("", "", "", { nonfoil: 1 })], indexPriceRows([row("a", "ONE", "1", 1, null, null), row("x", "ONE", "9", 1, null, null)]))).toBeUndefined();
  });
});

describe("sortCards by price", () => {
  const card = (name: string, price?: number): BrowseListCard =>
    ({ oracleId: name, name, printedName: null, price } as unknown as BrowseListCard);
  const list = [card("Zed", 100 * 8), card("Alp", 500 * 8), card("Mid", 100 * 8), card("Nos", -1), card("Bar"), card("Cat", 900 * 8 + 4)];
  const names = (dir: "asc" | "desc") => sortCards(list, "price", dir).map((c) => c.name);

  it("opens highest first, with no-price cards last A to Z", () => {
    expect(names("desc")).toEqual(["Cat", "Alp", "Mid", "Zed", "Bar", "Nos"]);
  });

  it("reverses only the priced cards; the unpriced stay last, and ties stay A to Z", () => {
    expect(names("asc")).toEqual(["Mid", "Zed", "Alp", "Cat", "Bar", "Nos"]);
  });
});
