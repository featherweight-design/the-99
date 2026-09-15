import { describe, expect, it } from "vitest";
import { compareDeckCards, deckCardComparator, type SortableCard } from "./sort-cards";
import type { PriceFact } from "./price";

const NEWEST = new Date("2026-09-01T09:00:00.000Z");
const OLDER = new Date("2026-08-25T09:00:00.000Z");

const fact = (over: Partial<PriceFact> = {}): PriceFact => ({
  cents: null,
  foilCents: null,
  etchedCents: null,
  asOf: NEWEST,
  ...over,
});

const card = (
  name: string,
  over: Partial<SortableCard> = {},
): SortableCard => ({ oracleId: name.toLowerCase(), name, cmc: 2, ...over });

const order = (
  cards: SortableCard[],
  key: Parameters<typeof compareDeckCards>[2],
  direction: Parameters<typeof compareDeckCards>[3],
) => cards.slice().sort(deckCardComparator(key, direction, NEWEST)).map((c) => c.name);

describe("name", () => {
  it("runs A–Z ascending and Z–A descending", () => {
    const cards = [card("Zealot"), card("Acolyte"), card("Marshal")];
    expect(order(cards, "name", "asc")).toEqual(["Acolyte", "Marshal", "Zealot"]);
    expect(order(cards, "name", "desc")).toEqual(["Zealot", "Marshal", "Acolyte"]);
  });

  // The server renders this list and the browser renders it again, and
  // `localeCompare` reads the runtime's locale. `ä` sorts beside `a` under most
  // collations and after `z` by code point, so the two rules disagree here.
  it("compares by code point rather than by the runtime's locale", () => {
    expect(order([card("äther"), card("zephyr")], "name", "asc")).toEqual(["zephyr", "äther"]);
  });

  it("breaks a tie on the id, because card names are not unique", () => {
    const pair = [
      card("Forest Bear", { oracleId: "zzz" }),
      card("Forest Bear", { oracleId: "aaa" }),
    ];
    expect(pair.slice().sort(deckCardComparator("name", "asc", NEWEST)).map((c) => c.oracleId))
      .toEqual(["aaa", "zzz"]);
  });
});

describe("mana value", () => {
  it("runs up the curve ascending and down it descending", () => {
    const cards = [card("Six", { cmc: 6 }), card("One", { cmc: 1 }), card("Three", { cmc: 3 })];
    expect(order(cards, "mana", "asc")).toEqual(["One", "Three", "Six"]);
    expect(order(cards, "mana", "desc")).toEqual(["Six", "Three", "One"]);
  });

  // A reversed curve is a statement about mana value, not about the alphabet,
  // so the tiebreak reads forwards in both directions.
  it("keeps equal costs in reading order whichever way the curve runs", () => {
    const cards = [card("Zealot", { cmc: 3 }), card("Acolyte", { cmc: 3 })];
    expect(order(cards, "mana", "asc")).toEqual(["Acolyte", "Zealot"]);
    expect(order(cards, "mana", "desc")).toEqual(["Acolyte", "Zealot"]);
  });
});

describe("price", () => {
  const dear = card("Dear", { price: priced(18999) });
  const middling = card("Middling", { price: priced(3410) });
  const cheap = card("Cheap", { price: priced(85) });
  const soldOut = card("Sold out", { price: priced(9999, OLDER) });
  const neverStocked = card("Never stocked", { price: null });

  function priced(cents: number, asOf = NEWEST) {
    return fact({ cents, asOf });
  }

  it("runs highest first and lowest first", () => {
    const cards = [cheap, dear, middling];
    expect(order(cards, "price", "desc")).toEqual(["Dear", "Middling", "Cheap"]);
    expect(order(cards, "price", "asc")).toEqual(["Cheap", "Middling", "Dear"]);
  });

  // THE ONE THAT MATTERS. Negating `comparePriceDesc` for ascending — the
  // plan's first shape — moves these two to the front and reverses their own
  // tiebreak with them. Reversing the order must not reverse the meaning of
  // "we have no price for this".
  it("keeps the figure-less rows last in BOTH directions, in name order", () => {
    const cards = [soldOut, cheap, neverStocked, dear];
    expect(order(cards, "price", "desc"))
      .toEqual(["Dear", "Cheap", "Never stocked", "Sold out"]);
    expect(order(cards, "price", "asc"))
      .toEqual(["Cheap", "Dear", "Never stocked", "Sold out"]);
  });

  it("ranks a foil-only row on the figure its tag prints", () => {
    // $40.00 foil against a $34.10 normal: the foil figure is the one on the
    // tag, so the foil row outranks it. Ranked at zero it would file last.
    const foil = card("Foil only", { price: fact({ foilCents: 4000 }) });
    expect(order([cheap, foil, middling], "price", "desc"))
      .toEqual(["Foil only", "Middling", "Cheap"]);
  });

  it("breaks equal prices on the name, in reading order both ways", () => {
    const a = card("Acolyte", { price: priced(250) });
    const z = card("Zealot", { price: priced(250) });
    expect(order([z, a], "price", "asc")).toEqual(["Acolyte", "Zealot"]);
    expect(order([z, a], "price", "desc")).toEqual(["Acolyte", "Zealot"]);
  });

  // With no table to compare against, every row is figure-less — which is the
  // fail-quiet state, not an error and not a list of free cards.
  it("falls back to the name when the price table is unreadable", () => {
    const cards = [dear, cheap, middling];
    expect(cards.slice().sort(deckCardComparator("price", "desc", null)).map((c) => c.name))
      .toEqual(["Cheap", "Dear", "Middling"]);
  });
});
