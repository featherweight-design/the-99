import { describe, expect, it } from "vitest";
import {
  aggregateCollection,
  cssUrl,
  filterCards,
  formatLastUpdated,
  printingCaption,
  resolveImageUri,
  sortCards,
  type BrowseCard,
  type BrowsePrinting,
  type RawCollectionRow,
} from "./browse";

const printing = (over: Partial<BrowsePrinting> = {}): BrowsePrinting => ({
  setCode: "C21", collectorNumber: "263", quantity: 1, imageUri: null, ...over,
});

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
  printings: [printing()],
  setCodes: ["C21"],
  primarySetCode: "C21",
  ...over,
});

const raw = (over: Partial<RawCollectionRow> = {}): RawCollectionRow => ({
  oracleId: "o-1", quantity: 1, setCode: "c21", collectorNumber: "263",
  name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", oracleText: null,
  keywords: [], rarity: "uncommon", colorIdentity: [],
  exactImageUri: null, representativeImageUri: null, cardImageUri: null,
  ...over,
});

describe("resolveImageUri (§3.5 — COALESCE on value, not on match)", () => {
  it("tier 1: the exact printing owned wins", () => {
    expect(resolveImageUri({ exactImageUri: "exact.png", representativeImageUri: "rep.png", cardImageUri: "card.png" }))
      .toBe("exact.png");
  });
  it("tier 2: the representative printing when no exact printing is joined", () => {
    expect(resolveImageUri({ exactImageUri: null, representativeImageUri: "rep.png", cardImageUri: "card.png" }))
      .toBe("rep.png");
  });
  it("tier 3: a double-faced card whose printing row exists but carries a NULL image falls to the oracle image", () => {
    // The join SUCCEEDED here — transform/modal_dfc printings have no top-level image_uris.
    // Selecting on match success rather than on a non-null value would blank this tile.
    expect(resolveImageUri({ exactImageUri: null, representativeImageUri: null, cardImageUri: "card.png" }))
      .toBe("card.png");
  });
  it("tier 4: all three null hands off to the identity gradient downstream", () => {
    expect(resolveImageUri({ exactImageUri: null, representativeImageUri: null, cardImageUri: null }))
      .toBeNull();
  });
});

describe("aggregateCollection", () => {
  it("sums quantities across variants of the same oracle id", () => {
    const [agg] = aggregateCollection([
      raw({ quantity: 2, setCode: "c21", collectorNumber: "263" }),
      raw({ quantity: 1, setCode: "lea", collectorNumber: "270" }),
    ]);
    expect(agg.quantity).toBe(3);
    expect(agg.setCodes.sort()).toEqual(["C21", "LEA"]);
    expect(agg.primarySetCode).toBe("C21");
  });
  it("keeps oracle metadata from the first row seen", () => {
    const [agg] = aggregateCollection([
      raw({ oracleText: "Tap: Add {C}{C}.", cardImageUri: "img.png" }),
    ]);
    expect(agg.imageUri).toBe("img.png");
    expect(agg.oracleText).toBe("Tap: Add {C}{C}.");
  });
  it("uppercases stored-lowercase set codes for display (§3.3)", () => {
    const [agg] = aggregateCollection([raw({ setCode: "2xm" })]);
    expect(agg.setCodes).toEqual(["2XM"]);
    expect(agg.printings[0].setCode).toBe("2XM");
  });
  it("groups printings on collector number, not on set alone", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263" }),
      raw({ collectorNumber: "600" }), // same set, borderless art
    ]);
    expect(agg.printings.map((p) => p.collectorNumber)).toEqual(["263", "600"]);
    expect(agg.setCodes).toEqual(["C21"]);
  });
  it("collapses the finishes of one printing into a single entry", () => {
    // nonfoil + foil are two collection_items rows but one piece of art.
    const [agg] = aggregateCollection([raw({ quantity: 2 }), raw({ quantity: 1 })]);
    expect(agg.printings).toHaveLength(1);
    expect(agg.printings[0].quantity).toBe(3);
  });
  it("resolves each printing's image independently", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "a.png" }),
      raw({ collectorNumber: "600", representativeImageUri: "b.png" }),
    ]);
    expect(agg.printings.map((p) => p.imageUri)).toEqual(["a.png", "b.png"]);
  });
  it("sorts printings by set then natural collector number", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "100" }),
      raw({ collectorNumber: "9" }),
      raw({ setCode: "2xm", collectorNumber: "5" }),
    ]);
    expect(agg.printings.map((p) => `${p.setCode}-${p.collectorNumber}`))
      .toEqual(["2XM-5", "C21-9", "C21-100"]);
  });
  it("picks the card image deterministically — first non-null in printing order, not row order", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "600", exactImageUri: "late.png" }),
      raw({ collectorNumber: "263", exactImageUri: "early.png" }),
    ]);
    expect(agg.imageUri).toBe("early.png");
  });
  it("skips a null-image printing when choosing the card image", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263" }),
      raw({ collectorNumber: "600", exactImageUri: "b.png" }),
    ]);
    expect(agg.imageUri).toBe("b.png");
  });
});

describe("printingCaption", () => {
  it("reads set · collector number for a single printing", () => {
    expect(printingCaption(card())).toBe("C21 · 263");
  });
  it("appends a count of the other printings owned", () => {
    expect(printingCaption(card({
      printings: [printing(), printing({ collectorNumber: "600" }), printing({ setCode: "LEA", collectorNumber: "270" })],
    }))).toBe("C21 · 263 +2 more");
  });
  it("falls back to the set code alone when the export carried no collector number", () => {
    expect(printingCaption(card({ printings: [printing({ collectorNumber: "" })] }))).toBe("C21");
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

describe("formatLastUpdated", () => {
  const now = new Date(2026, 6, 19, 12, 0); // Jul 19, 2026
  it("same day → today", () => {
    expect(formatLastUpdated(new Date(2026, 6, 19, 3, 30), now)).toBe("today");
  });
  it("previous day → yesterday", () => {
    expect(formatLastUpdated(new Date(2026, 6, 18, 23, 59), now)).toBe("yesterday");
  });
  it("same year → short month + day", () => {
    expect(formatLastUpdated(new Date(2026, 6, 12), now)).toBe("Jul 12");
  });
  it("prior year → includes year", () => {
    expect(formatLastUpdated(new Date(2025, 11, 3), now)).toBe("Dec 3, 2025");
  });
});

describe("cssUrl", () => {
  it("wraps a plain Scryfall URI in a quoted url()", () => {
    expect(cssUrl("https://cards.scryfall.io/art_crop/front/a/b/abc.jpg?1234")).toBe(
      'url("https://cards.scryfall.io/art_crop/front/a/b/abc.jpg?1234")',
    );
  });
  it("escapes spaces", () => {
    expect(cssUrl("https://x.test/a b.jpg")).toBe('url("https://x.test/a%20b.jpg")');
  });
  it("escapes double quotes so they cannot terminate the url() string", () => {
    expect(cssUrl('https://x.test/a"b.jpg')).toBe('url("https://x.test/a%22b.jpg")');
  });
  it("escapes non-ASCII", () => {
    expect(cssUrl("https://x.test/Æther.jpg")).toBe('url("https://x.test/%C3%86ther.jpg")');
  });
  it("leaves parentheses literal — legal inside the quoted string", () => {
    expect(cssUrl("https://x.test/a(b).jpg")).toBe('url("https://x.test/a(b).jpg")');
  });
});
