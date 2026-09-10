import { describe, expect, it } from "vitest";

import { decodeDiscovery, encodeDiscovery } from "./encode";
import type { DiscoveryItem, DiscoveryList } from "./list";

const baseItem: DiscoveryItem = {
  slug: "atraxa-praetors-voice",
  name: "Atraxa, Praetors' Voice",
  colorIdentity: ["W", "U", "B", "G"],
  artCropUri: "https://cards.scryfall.io/art_crop/front/0/d/0d-atraxa.jpg",
  releasedAt: "2016-11-11",
  deckCount: 41_233,
  rank: 1,
  ownedSupport: 120,
  edhrecTotal: 400,
  colorPoolSize: 900,
  roleCounts: { ramp: 12, draw: 9, removal: 7, wipes: 3 },
  price: { kind: "priced", cents: 1499 },
  tagTotal: 6,
  unplayedLabels: ["Counters", "Proliferate"],
  unplayedCount: 2,
  nearestDeck: { deckName: "Superfriends", sharedLabels: ["Counters"], extraShared: 2 },
  supportPct: 30,
};

function listOf(items: DiscoveryItem[]): DiscoveryList {
  return {
    items,
    candidateCount: 12,
    cardsRead: 2733,
    freePoolSize: 2733,
    bestPct: 27,
    floorExcluded: 3,
    poolExcluded: 0,
    unmeasured: 1,
    hasDecks: true,
    availOk: true,
    deckIdentities: [["W", "U"], []],
    sort: "new",
  };
}

function roundTrip(list: DiscoveryList) {
  return decodeDiscovery(encodeDiscovery(list));
}

describe("encodeDiscovery", () => {
  it("round-trips a whole list", () => {
    const list = listOf([baseItem]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips a null art crop", () => {
    const list = listOf([{ ...baseItem, artCropUri: null }]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips an art crop on a foreign host", () => {
    const list = listOf([
      { ...baseItem, artCropUri: "https://example.test/art_crop/front/x.jpg" },
    ]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips a null nearest deck", () => {
    const list = listOf([{ ...baseItem, nearestDeck: null }]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips an empty label list", () => {
    const list = listOf([{ ...baseItem, unplayedLabels: [], unplayedCount: 0 }]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips zero in every role slot", () => {
    const list = listOf([
      { ...baseItem, roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 } },
    ]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips null figures", () => {
    const list = listOf([
      { ...baseItem, releasedAt: null, deckCount: null, edhrecTotal: null, supportPct: null },
    ]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips every price slot", () => {
    const list = listOf([
      { ...baseItem, price: { kind: "priced", cents: 0 } },
      { ...baseItem, slug: "b", price: { kind: "notStocked" } },
      { ...baseItem, slug: "c", price: { kind: "absent" } },
    ]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips an empty list", () => {
    const list = listOf([]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("files a label shared by two rows once", () => {
    const twin = { ...baseItem, slug: "twin", name: "Twin" };
    const encoded = encodeDiscovery(listOf([baseItem, twin]));

    expect(encoded.strings.filter((s) => s === "Counters")).toHaveLength(1);
    expect(encoded.strings.filter((s) => s === "Superfriends")).toHaveLength(1);
    expect(roundTrip(listOf([baseItem, twin]))).toEqual(listOf([baseItem, twin]));
  });

  it("drops the art host from a Scryfall crop", () => {
    const encoded = encodeDiscovery(listOf([baseItem]));
    const row = encoded.rows[0] as unknown[];

    expect(row[encoded.keys.indexOf("artCropUri")]).toBe("0/d/0d-atraxa.jpg");
  });
});
