import { describe, expect, it } from "vitest";
import { buildCart } from "./cart-read";
import { cartTotal, checkoutLines, checkoutLinks, figuresOf, selectLine } from "./cart";
import { rollupBuyRows } from "./shopping-rollup";
import type { PriceFact } from "./price";
import type { PriceRead } from "./price-query";

const NOW = new Date("2026-10-11T00:00:00Z");
const fact = (cents: number | null, asOf = NOW): PriceFact =>
  ({ cents, foilCents: null, etchedCents: null, asOf }) as PriceFact;

// The Sol Ring case: three brews each buy one; Omnath, committed, also buys a Command Tower and its
// own unowned commander. Thorin's two Rogue's Passages are sold out (their only row is stale).
const SOL = "sol", TOWER = "tower", OMNATH = "omnath", PASSAGE = "passage";
const rows = [
  { deckId: "gishath", oracleId: SOL, quantity: 1 },
  { deckId: "kratos", oracleId: SOL, quantity: 1 },
  { deckId: "thorin", oracleId: SOL, quantity: 1 },
  { deckId: "omnath", oracleId: TOWER, quantity: 1 },
  { deckId: "omnath", oracleId: OMNATH, quantity: 1 },
  { deckId: "gishath", oracleId: TOWER, quantity: 1 },
  { deckId: "thorin", oracleId: PASSAGE, quantity: 2 },
];
const read: PriceRead = {
  prices: new Map([
    [SOL, fact(150)], [TOWER, fact(30)], [OMNATH, fact(400)],
    [PASSAGE, fact(90, new Date("2026-09-01T00:00:00Z"))],
  ]),
  newestAsOf: NOW,
};
const deckRows = [
  { id: "gishath", name: "HD - Gishath", commanderOracleId: "g", partnerOracleId: null, brew: true },
  { id: "kratos", name: "HD - Kratos", commanderOracleId: "k", partnerOracleId: null, brew: true },
  { id: "thorin", name: "HD -Thorin", commanderOracleId: "t", partnerOracleId: null, brew: true },
  { id: "omnath", name: "HD - Omnath", commanderOracleId: OMNATH, partnerOracleId: null, brew: false },
];
const names = new Map([
  [SOL, "Sol Ring"], [TOWER, "Command Tower"], [OMNATH, "Omnath, Locus of All"], [PASSAGE, "Rogue's Passage"],
]);
const all = new Set(deckRows.map((d) => d.id));

describe("buildCart", () => {
  const cart = buildCart(rows, read, deckRows, names);

  it("agrees with the roll-up on every deck, by construction", () => {
    const rollup = rollupBuyRows(rows, read);
    for (const d of cart.decks) {
      expect({ copies: d.copies, cents: d.cents, pricedCopies: d.pricedCopies }).toEqual(rollup.byDeck.get(d.id));
    }
    expect(cartTotal(cart.decks, all)).toEqual(rollup.total);
  });

  it("adds up its lines to its decks, a sold-out copy counting against priced", () => {
    const fromLines = cart.lines.reduce(
      (acc, l) => {
        const f = figuresOf(l.rows);
        return { copies: acc.copies + f.copies, cents: acc.cents + f.cents, pricedCopies: acc.pricedCopies + f.pricedCopies };
      },
      { copies: 0, cents: 0, pricedCopies: 0 },
    );
    expect(fromLines).toEqual(cartTotal(cart.decks, all));
    const passage = cart.lines.find((l) => l.oracleId === PASSAGE)!;
    expect(passage.rows).toEqual([{ deckId: "thorin", quantity: 2, cents: null, state: "soldOut" }]);
    expect(figuresOf(cart.lines.find((l) => l.oracleId === SOL)!.rows)).toEqual({ copies: 3, cents: 450, pricedCopies: 3 });
    expect(cartTotal(cart.decks, all)).toMatchObject({ copies: 8, pricedCopies: 6 });
  });

  it("leads with the unowned commander, then the cards most decks need, then A to Z", () => {
    expect(cart.lines.map((l) => l.name)).toEqual(["Omnath, Locus of All", "Sol Ring", "Command Tower", "Rogue's Passage"]);
    expect(cart.lines[0].commander).toBe(true);
  });

  it("orders decks by what they buy, and a line's decks in that order", () => {
    expect(cart.decks.map((d) => d.id)).toEqual(["thorin", "gishath", "omnath", "kratos"]);
    expect(cart.lines.find((l) => l.oracleId === SOL)!.rows.map((r) => r.deckId)).toEqual(["thorin", "gishath", "kratos"]);
  });

  it("keeps its rows when the price read failed (T2), drawing no figure", () => {
    const unpriced = buildCart(rows, null, deckRows, names);
    expect(unpriced.priced).toBe(false);
    expect(unpriced.lines).toHaveLength(4);
    expect(cartTotal(unpriced.decks, all)).toEqual({ copies: 8, cents: 0, pricedCopies: 0 });
    expect(unpriced.lines.every((l) => l.rows.every((r) => r.cents === null && r.state === null))).toBe(true);
  });
});

describe("the owned fact (lock 4, audit finding 4)", () => {
  it("counts every owned copy held by decks not on the line", () => {
    // 17 Sol Rings, every one held by committed decks that are not buying it.
    const ownership = new Map([[SOL, { owned: 17, heldByDeck: new Map([["a", 9], ["b", 8]]) }]]);
    const cart = buildCart(rows, read, deckRows, names, ownership);
    expect(cart.lines.find((l) => l.oracleId === SOL)).toMatchObject({ owned: 17, heldElsewhere: 17 });
    expect(cart.lines.find((l) => l.oracleId === TOWER)).toMatchObject({ owned: 0, heldElsewhere: 0 });
  });

  it("leaves out copies a deck on the line holds itself, so the two counts differ", () => {
    // Thorin holds one of its own Rogue's Passages and buys the second; another deck holds two.
    const ownership = new Map([[PASSAGE, { owned: 3, heldByDeck: new Map([["thorin", 1], ["other", 2]]) }]]);
    const cart = buildCart(rows, read, deckRows, names, ownership);
    expect(cart.lines.find((l) => l.oracleId === PASSAGE)).toMatchObject({ owned: 3, heldElsewhere: 2 });
  });
});

describe("selections are a view", () => {
  const cart = buildCart(rows, read, deckRows, names);

  it("drops a line no selected deck needs, and narrows the rest", () => {
    const selected = new Set(["omnath"]);
    expect(selectLine(cart.lines.find((l) => l.oracleId === SOL)!, selected)).toBeNull();
    expect(selectLine(cart.lines.find((l) => l.oracleId === TOWER)!, selected)).toMatchObject({ copies: 1 });
  });

  it("merges checkout lines by name with quantities added (lock 5)", () => {
    expect(checkoutLines(cart.lines, all)).toEqual([
      { name: "Omnath, Locus of All", quantity: 1 },
      { name: "Sol Ring", quantity: 3 },
      { name: "Command Tower", quantity: 2 },
      { name: "Rogue's Passage", quantity: 2 },
    ]);
    expect(checkoutLines(cart.lines, new Set(["kratos", "thorin"]))).toEqual([
      { name: "Sol Ring", quantity: 2 },
      { name: "Rogue's Passage", quantity: 2 },
    ]);
  });

  it("checks out as one link here, and as none when nothing is selected", () => {
    expect(checkoutLinks(cart.lines, all)).toEqual([expect.objectContaining({ lineCount: 4 })]);
    expect(checkoutLinks(cart.lines, new Set())).toEqual([]);
  });
});
