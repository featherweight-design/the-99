import { describe, expect, it } from "vitest";
import {
  aggregateCollection,
  filterCards,
  sortCards,
  type BrowseCard,
} from "./browse";

const card = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o-1",
  name: "Sol Ring",
  typeLine: "Artifact",
  manaCost: "{1}",
  oracleText: "Tap: Add {C}{C}.",
  keywords: [],
  rarity: "uncommon",
  colorIdentity: [],
  imageUri: null,
  quantity: 1,
  setCodes: ["C21"],
  primarySetCode: "C21",
  ...over,
});

describe("aggregateCollection", () => {
  it("sums quantities across variants of the same oracle id", () => {
    const rows = [
      { oracleId: "o-1", quantity: 2, setCode: "C21", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: null, keywords: [], rarity: "uncommon", colorIdentity: [], imageUri: null },
      { oracleId: "o-1", quantity: 1, setCode: "LEA", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: null, keywords: [], rarity: "uncommon", colorIdentity: [], imageUri: null },
    ];
    const [agg] = aggregateCollection(rows);
    expect(agg.quantity).toBe(3);
    expect(agg.setCodes.sort()).toEqual(["C21", "LEA"]);
    expect(agg.primarySetCode).toBe("C21"); // min() lexicographic
  });
  it("keeps oracle metadata from the first row seen", () => {
    const rows = [
      { oracleId: "o-1", quantity: 1, setCode: "C21", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: "Tap: Add {C}{C}.", keywords: [], rarity: "uncommon", colorIdentity: [], imageUri: "img.png" },
    ];
    const [agg] = aggregateCollection(rows);
    expect(agg.imageUri).toBe("img.png");
    expect(agg.oracleText).toBe("Tap: Add {C}{C}.");
  });
});

describe("filterCards", () => {
  const list = [
    card({ oracleId: "a", name: "Sol Ring", colorIdentity: [], typeLine: "Artifact", setCodes: ["C21"], primarySetCode: "C21" }),
    card({ oracleId: "b", name: "Lightning Bolt", colorIdentity: ["R"], typeLine: "Instant", setCodes: ["2XM"], primarySetCode: "2XM" }),
    card({ oracleId: "c", name: "Cyclonic Rift", colorIdentity: ["U"], typeLine: "Instant", setCodes: ["RTR"], primarySetCode: "RTR" }),
    card({ oracleId: "d", name: "Shockingly Boring", colorIdentity: ["R", "U"], typeLine: "Sorcery", setCodes: ["MID"], primarySetCode: "MID" }),
  ];

  it("substring search is case-insensitive on name", () => {
    expect(filterCards(list, { search: "cyclonic", colors: [], type: null, setCode: null }).map((c) => c.oracleId)).toEqual(["c"]);
  });
  it("no filters returns everything (identity when empty search + no chips)", () => {
    expect(filterCards(list, { search: "", colors: [], type: null, setCode: null })).toHaveLength(4);
  });
  it("colors filter matches when EVERY selected color is in the card identity", () => {
    // R + U selected → only the R/U card matches
    expect(filterCards(list, { search: "", colors: ["R", "U"], type: null, setCode: null }).map((c) => c.oracleId)).toEqual(["d"]);
    // R alone matches both R and R/U cards
    expect(filterCards(list, { search: "", colors: ["R"], type: null, setCode: null }).map((c) => c.oracleId).sort()).toEqual(["b", "d"]);
  });
  it("type filter is case-insensitive substring on typeLine", () => {
    expect(filterCards(list, { search: "", colors: [], type: "instant", setCode: null }).map((c) => c.oracleId).sort()).toEqual(["b", "c"]);
  });
  it("setCode filter matches ANY of a card's variant sets, case-insensitive", () => {
    expect(filterCards(list, { search: "", colors: [], type: null, setCode: "rtr" }).map((c) => c.oracleId)).toEqual(["c"]);
  });
});

describe("sortCards", () => {
  it("name A→Z", () => {
    const list = [card({ oracleId: "a", name: "Cyclonic Rift" }), card({ oracleId: "b", name: "Ancestral Recall" })];
    expect(sortCards(list, "name").map((c) => c.name)).toEqual(["Ancestral Recall", "Cyclonic Rift"]);
  });
  it("quantity: high first", () => {
    const list = [card({ oracleId: "a", name: "A", quantity: 1 }), card({ oracleId: "b", name: "B", quantity: 4 })];
    expect(sortCards(list, "quantity").map((c) => c.quantity)).toEqual([4, 1]);
  });
  it("set: primarySetCode A→Z then name A→Z", () => {
    const list = [
      card({ oracleId: "a", name: "B", primarySetCode: "C21" }),
      card({ oracleId: "b", name: "A", primarySetCode: "C21" }),
      card({ oracleId: "c", name: "C", primarySetCode: "2XM" }),
    ];
    expect(sortCards(list, "set").map((c) => c.name)).toEqual(["C", "A", "B"]);
  });
  it("rarity: common < uncommon < rare < mythic, then name A→Z", () => {
    const list = [
      card({ oracleId: "a", name: "M", rarity: "mythic" }),
      card({ oracleId: "b", name: "C", rarity: "common" }),
      card({ oracleId: "c", name: "R", rarity: "rare" }),
      card({ oracleId: "d", name: "U", rarity: "uncommon" }),
    ];
    expect(sortCards(list, "rarity").map((c) => c.name)).toEqual(["C", "U", "R", "M"]);
  });
  it("color: WUBRG order, then multicolor, then colorless, then name A→Z", () => {
    const list = [
      card({ oracleId: "a", name: "Multi", colorIdentity: ["W", "U"] }),
      card({ oracleId: "b", name: "Colorless", colorIdentity: [] }),
      card({ oracleId: "c", name: "White", colorIdentity: ["W"] }),
      card({ oracleId: "d", name: "Blue", colorIdentity: ["U"] }),
      card({ oracleId: "e", name: "Red", colorIdentity: ["R"] }),
    ];
    expect(sortCards(list, "color").map((c) => c.name)).toEqual([
      "White", "Blue", "Red", "Multi", "Colorless",
    ]);
  });
  it("returns a new array — does not mutate input", () => {
    const list = [card({ oracleId: "a", name: "B" }), card({ oracleId: "b", name: "A" })];
    const copy = [...list];
    sortCards(list, "name");
    expect(list).toEqual(copy);
  });
});
