import { describe, expect, it } from "vitest";

import type { OwnedPrinting } from "../collection/owned-printings";
import type { PriceFact } from "./price";
import { assembleVersionRows, pricedIds, type VersionDiffBase } from "./version-rows";

const asOf = new Date("2026-10-03T09:00:00Z");
const fact = (cents: number): PriceFact => ({ cents, foilCents: null, etchedCents: null, asOf });

const row = (over: Partial<VersionDiffBase>): VersionDiffBase => ({
  oracleId: "o-1",
  name: "Bumi, Unleashed",
  typeLine: "Legendary Creature — Human",
  manaCost: "{3}{R}{G}",
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

describe("assembleVersionRows", () => {
  it("reads an unowned card as 0 owned, with today's price and the catalog art", () => {
    const [r] = assembleVersionRows([row({})], new Map(), { prices: new Map([["o-1", fact(240)]]) });
    expect(r).toMatchObject({ ownedNow: 0, price: fact(240), imageUri: "https://img/oracle.jpg", printedName: null });
  });

  it("counts every printing the reader owns (Persistent Petitioners: own 1 of 4)", () => {
    const [r] = assembleVersionRows(
      [row({ name: "Persistent Petitioners", to: 4 })],
      new Map([["o-1", owns(1)]]),
      { prices: new Map([["o-1", fact(35)]]) },
    );
    expect(r.ownedNow).toBe(1);
    expect(r.price).toEqual(fact(35));
  });

  it("treats a basic as owned at its count and never prices it (Plains 6 → 7)", () => {
    const plains = row({ oracleId: "o-plains", name: "Plains", typeLine: "Basic Land — Plains", from: 6, to: 7 });
    const [r] = assembleVersionRows(
      [plains],
      new Map([["o-plains", owns(3)]]),
      { prices: new Map([["o-plains", fact(5)]]) },
    );
    expect(r.ownedNow).toBe(7);
    expect(r.price).toBeNull();
    expect(pricedIds([plains, row({})])).toEqual(["o-1"]);
  });

  it("draws the owned printing's art and name (a Secret Lair copy)", () => {
    const [r] = assembleVersionRows(
      [row({})],
      new Map([["o-1", owns(1, { printedName: "Earthbender King", imageUri: "https://img/sld.jpg" })]]),
      { prices: new Map() },
    );
    expect(r).toMatchObject({ imageUri: "https://img/sld.jpg", printedName: "Earthbender King", price: null });
  });
});
