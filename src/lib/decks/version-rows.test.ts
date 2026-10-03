import { describe, expect, it } from "vitest";

import type { OwnedPrinting } from "../collection/owned-printings";
import type { PriceFact } from "./price";
import { assembleVersionRows, type DeckClaims, pricedIds, type VersionDiffBase } from "./version-rows";

const asOf = new Date("2026-10-03T09:00:00Z");
const fact = (cents: number): PriceFact => ({ cents, foilCents: null, etchedCents: null, asOf });

const row = (over: Partial<VersionDiffBase>): VersionDiffBase => ({
  oracleId: "o-1",
  name: "Bumi, Unleashed",
  typeLine: "Legendary Creature — Human",
  manaCost: "{3}{R}{G}",
  layout: "normal",
  imageUri: "https://img/oracle.jpg",
  from: 0,
  to: 1,
  ...over,
});

const owns = (quantity: number, over: Partial<OwnedPrinting> = {}): OwnedPrinting => ({
  quantity,
  printedName: null,
  imageUri: "https://img/owned.jpg",
  artCropUri: null,
  setCode: "TLA",
  collectorNumber: "1",
  ...over,
});

/** The claim model's figures: the draft's count and Shopping's deficit, or off-decklist free. */
const claims = (over: Partial<DeckClaims> = {}): DeckClaims => ({
  draft: new Map(), deficit: new Map(), surplus: new Map(), free: new Map(), ...over,
});

describe("assembleVersionRows", () => {
  it("reads an unowned card as 0 owned, with today's price and the catalog art", () => {
    const [r] = assembleVersionRows([row({})], new Map(), { prices: new Map([["o-1", fact(240)]]) },
      claims({ draft: new Map([["o-1", 1]]), deficit: new Map([["o-1", 1]]) }));
    expect(r).toMatchObject({ ownedNow: 0, buy: 1, price: fact(240), imageUri: "https://img/oracle.jpg", printedName: null });
  });

  // Shopping's claim model, not ownership: an owned copy a senior deck holds is still a buy
  // (Basalt Monolith in HD Tune - Counter Intelligence, staging, 2026-10-03).
  it("buys an owned card a senior deck holds, as Shopping does (Basalt Monolith)", () => {
    const [r] = assembleVersionRows([row({ name: "Basalt Monolith" })], new Map([["o-1", owns(1)]]),
      { prices: new Map() }, claims({ draft: new Map([["o-1", 1]]), deficit: new Map([["o-1", 1]]) }));
    expect(r.ownedNow).toBe(1);
    expect(r.buy).toBe(1);
  });

  // The deficit is the DRAFT's; the row is the VERSION's. Holding = draft − deficit, then `to` less it.
  it("measures a version's count against what the deck holds, not the draft's deficit", () => {
    // The version ran 4, the draft runs 2 and holds none: the version would buy all 4.
    const [a] = assembleVersionRows([row({ to: 4 })], new Map(), { prices: new Map() },
      claims({ draft: new Map([["o-1", 2]]), deficit: new Map([["o-1", 2]]) }));
    expect(a.buy).toBe(4);
    // The version ran 1, the draft runs 4 and holds 1 (deficit 3): the version buys nothing.
    const [b] = assembleVersionRows([row({ to: 1 })], new Map([["o-1", owns(1)]]), { prices: new Map() },
      claims({ draft: new Map([["o-1", 4]]), deficit: new Map([["o-1", 3]]) }));
    expect(b.buy).toBe(0);
  });

  // Copilot round 1: Shopping's deficit stops at 0, so copies beyond the draft's ask are its surplus.
  it("counts copies beyond the draft's ask: the version ran 4, the draft runs 1, 3 more are free", () => {
    const [r] = assembleVersionRows([row({ to: 4 })], new Map([["o-1", owns(4)]]), { prices: new Map() },
      claims({ draft: new Map([["o-1", 1]]), surplus: new Map([["o-1", 3]]) }));
    expect(r.buy).toBe(0);
  });

  it("keeps a proxied slot unbilled: no deficit, though no copy is owned", () => {
    const [r] = assembleVersionRows([row({ to: 1 })], new Map(), { prices: new Map() },
      claims({ draft: new Map([["o-1", 1]]), surplus: new Map([["o-1", -1]]) }));
    expect(r.buy).toBe(0);
  });

  it("reads a card the deck no longer runs off-decklist: owned less what committed decks hold", () => {
    const [held] = assembleVersionRows([row({ to: 2 })], new Map([["o-1", owns(2)]]), { prices: new Map() },
      claims({ free: new Map([["o-1", 1]]) }));
    expect(held.buy).toBe(1);
    const [over] = assembleVersionRows([row({})], new Map([["o-1", owns(1)]]), { prices: new Map() },
      claims({ free: new Map([["o-1", -1]]) }));
    expect(over.buy).toBe(1);
  });

  it("counts every printing the reader owns (Persistent Petitioners)", () => {
    const [r] = assembleVersionRows(
      [row({ name: "Persistent Petitioners", to: 4 })],
      new Map([["o-1", owns(1)]]),
      { prices: new Map([["o-1", fact(35)]]) },
      claims({ draft: new Map([["o-1", 4]]), deficit: new Map([["o-1", 3]]) }),
    );
    expect(r.ownedNow).toBe(1);
    expect(r.buy).toBe(3);
    expect(r.price).toEqual(fact(35));
  });

  it("treats a basic as owned at its count and never buys or prices it (Plains 6 → 7)", () => {
    const plains = row({ oracleId: "o-plains", name: "Plains", typeLine: "Basic Land — Plains", from: 6, to: 7 });
    const [r] = assembleVersionRows([plains], new Map([["o-plains", owns(3)]]),
      { prices: new Map([["o-plains", fact(5)]]) }, claims());
    expect(r.ownedNow).toBe(7);
    expect(r.buy).toBe(0);
    expect(r.price).toBeNull();
    expect(pricedIds([plains, row({})])).toEqual(["o-1"]);
  });

  it("draws the owned printing's art and name (a Secret Lair copy)", () => {
    const [r] = assembleVersionRows(
      [row({})],
      new Map([["o-1", owns(1, { printedName: "Earthbender King", imageUri: "https://img/sld.jpg" })]]),
      { prices: new Map() },
      claims({ free: new Map([["o-1", 1]]) }),
    );
    expect(r).toMatchObject({ imageUri: "https://img/sld.jpg", printedName: "Earthbender King", price: null, buy: 0 });
  });
});
