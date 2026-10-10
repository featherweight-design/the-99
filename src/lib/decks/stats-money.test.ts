import { describe, expect, it } from "vitest";

import { commanderAsRow, isShoppingCard } from "./shopping";
import type { DeckDetailCard } from "./grouping";
import type { PriceFact } from "./price";
import { moneyStats } from "./stats-money";

const NEWEST = new Date("2026-10-05T09:00:00Z");
const fact = (cents: number | null, over: Partial<PriceFact> = {}): PriceFact => ({ cents, foilCents: null, etchedCents: null, asOf: NEWEST, ...over });
const row = (name: string, over: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId: name,
  name,
  typeLine: "Creature",
  cardTypeGroup: "Creatures",
  role: "other",
  cmc: 2,
  owned: true,
  quantity: 1,
  auto: false,
  price: fact(100),
  manaCost: null,
  imageUri: null,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  ...over,
});
const stats = (cards: DeckDetailCard[], commanders: DeckDetailCard[] = []) =>
  moneyStats({ cards, commanders, shopping: [...commanders.filter(isShoppingCard), ...cards.filter(isShoppingCard)] }, NEWEST);

describe("moneyStats", () => {
  it("splits the deck into owned, basics and to buy, and owned plus to buy is the value", () => {
    const m = stats([
      row("Own A", { price: fact(1000) }),
      row("Own B", { price: fact(250) }),
      row("Buy C", { owned: false, price: fact(3820) }),
      row("Forest", { typeLine: "Basic Land — Forest", owned: false, quantity: 12, price: fact(5) }),
    ])!;
    expect(m.total).toBe(15);
    expect(m.basics).toBe(12);
    expect(m.owned).toEqual({ copies: 2, cents: 1250, pricedCopies: 2 });
    expect(m.toBuy).toEqual({ copies: 1, cents: 3820, pricedCopies: 1 });
    expect(m.value).toEqual({ cents: 5070, pricedCopies: 3, copies: 3 });
  });

  it("never prices a basic land, owned or not", () => {
    const m = stats([row("Forest", { typeLine: "Basic Land — Forest", owned: false, quantity: 5, price: fact(99) })])!;
    expect(m.toBuy.copies).toBe(0);
    expect(m.value.cents).toBe(0);
    expect(m.priciest).toEqual([]);
  });

  it("counts an unpriced copy against the denominator and into no total", () => {
    const m = stats([row("Priced", { price: fact(600) }), row("Gone", { owned: false, price: fact(null) }), row("Never", { owned: false, price: null })])!;
    expect(m.value).toEqual({ cents: 600, pricedCopies: 1, copies: 3 });
    expect(m.toBuy).toEqual({ copies: 2, cents: 0, pricedCopies: 0 });
  });

  it("reads a sold-out card as unpriced, as the buy tag does", () => {
    const m = stats([row("Sold", { owned: false, price: fact(900, { asOf: new Date("2026-09-01T09:00:00Z") }) })])!;
    expect(m.toBuy.pricedCopies).toBe(0);
    expect(m.priciest[0].cents).toBeNull();
  });

  it("bills the Shopping basket: a spoken-for owned card and an unowned commander count to buy", () => {
    const spoken = row("Spoken", { price: fact(700), availability: { owned: 1, free: -1, soft: 0 } as never });
    const commander = commanderAsRow({ oracleId: "Cmdr", name: "Cmdr", typeLine: "Legendary Creature", cmc: 4, owned: false, price: fact(1500), manaCost: null, imageUri: null } as never);
    const body = [spoken, row("Own", { price: fact(200) })];
    expect(isShoppingCard(spoken)).toBe(true);
    const m = stats(body, [commander])!;
    expect(m.toBuy).toEqual({ copies: 2, cents: 2200, pricedCopies: 2 });
    expect(m.owned).toEqual({ copies: 1, cents: 200, pricedCopies: 1 });
  });

  it("treats a proxied card the player does not own as acquired", () => {
    const m = stats([row("Printed", { owned: false, proxied: true, price: fact(800) })])!;
    expect(m.toBuy.copies).toBe(0);
    expect(m.owned.copies).toBe(1);
  });

  it("lists the five priciest, dearest first, carrying whether each is to buy and a foil qualifier", () => {
    const cards = [100, 900, 500, 800, 300, 700, 200].map((c, i) => row(`C${i}`, { owned: i % 2 === 0, price: fact(c) }));
    cards.push(row("Foily", { price: fact(null, { foilCents: 1500 }) }));
    const m = stats(cards)!;
    expect(m.priciest.map((p) => p.cents)).toEqual([1500, 900, 800, 700, 500]);
    expect(m.priciest[0].qualifier).toBe("foil");
    expect(m.priciest[1]).toMatchObject({ name: "C1", toBuy: true });
  });

  it("lets a card with no price fill a slot only when the priced ones run out, to buy first", () => {
    const m = stats([row("Zed", { price: null }), row("Ant", { owned: false, price: null }), row("Priced", { price: fact(300) })])!;
    expect(m.priciest.map((p) => p.name)).toEqual(["Priced", "Ant", "Zed"]);
  });

  it("is null for a deck of nothing", () => {
    expect(stats([])).toBeNull();
  });

  it("counts a multi-copy row by copies", () => {
    const m = stats([row("Relentless Rats", { quantity: 3, price: fact(200) })])!;
    expect(m.owned).toEqual({ copies: 3, cents: 600, pricedCopies: 3 });
  });
});
