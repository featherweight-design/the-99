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
  setCode: "C21", setName: "Commander 2021", collectorNumber: "263", releasedAt: "2021-04-23",
  quantity: 1, finishes: { nonfoil: 1 }, imageUri: null, ...over,
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
  preferredPrinting: null,
  ...over,
});

const raw = (over: Partial<RawCollectionRow> = {}): RawCollectionRow => ({
  oracleId: "o-1", quantity: 1, setCode: "c21", collectorNumber: "263", finish: "nonfoil",
  setName: "Commander 2021", releasedAt: "2021-04-23",
  preferredSetCode: null, preferredCollectorNumber: null,
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
  it("sorts a numberless collector number last and a prefixed one by its digits", () => {
    // Same rule as the ingest's numericPart, so browse order matches the order the
    // representative printing was chosen by.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "★" }),
      raw({ collectorNumber: "A-12" }),
      raw({ collectorNumber: "9" }),
    ]);
    expect(agg.printings.map((p) => p.collectorNumber)).toEqual(["9", "A-12", "★"]);
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
  it("captions the printing the art came from when the first printing has no image", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263" }),
      raw({ collectorNumber: "600", exactImageUri: "b.png" }),
    ]);
    expect(agg.imageUri).toBe("b.png");
    expect(agg.primarySetCode).toBe("C21");
    expect(printingCaption(agg)).toBe("C21 · 600 +1 more");
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
  it("takes even the bare set code off the pick, not the server's primarySetCode", () => {
    // The modal captions an optimistic pick before the revalidate lands, so primarySetCode
    // still names the printing being replaced.
    expect(printingCaption(card({
      primarySetCode: "C21",
      preferredPrinting: { setCode: "LEA", collectorNumber: "" },
      printings: [printing(), printing({ setCode: "LEA", collectorNumber: "" })],
    }))).toBe("LEA +1 more");
  });
});

describe("art preference (#105 — tier 0)", () => {
  const twoPrintings = [printing(), printing({ setCode: "LEA", collectorNumber: "270" })];
  /** A stored pick of LEA · 270, as the query returns it: on every row of the card. */
  const picked = { preferredSetCode: "lea", preferredCollectorNumber: "270" };

  it("represents the card by the chosen printing, not the sort-order first", () => {
    // The preference is oracle-level, so the join repeats it on every row of the card.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "first.png", ...picked }),
      raw({ setCode: "lea", collectorNumber: "270", exactImageUri: "chosen.png", ...picked }),
    ]);
    expect(agg.imageUri).toBe("chosen.png");
    expect(agg.primarySetCode).toBe("LEA");
    expect(printingCaption(agg)).toBe("LEA · 270 +1 more");
  });

  it("uppercases the stored set code so the lowercase preference still matches", () => {
    // The join-time trap from the printings epic: preferences are stored lowercase while
    // BrowsePrinting.setCode is uppercased, so comparing them raw would never match.
    const [agg] = aggregateCollection([
      raw({ preferredSetCode: "c21", preferredCollectorNumber: "263" }),
    ]);
    expect(agg.preferredPrinting).toEqual({ setCode: "C21", collectorNumber: "263" });
  });

  it("captions the chosen printing even when that printing has no art", () => {
    // The caption states the user's intent, which stays true when the art cannot render.
    // Only the image falls back — losing the caption too would make the choice vanish.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "has-art.png", ...picked }),
      raw({ setCode: "lea", collectorNumber: "270", exactImageUri: null, ...picked }),
    ]);
    expect(printingCaption(agg)).toBe("LEA · 270 +1 more");
    expect(agg.imageUri).toBeNull();
  });

  it("falls back silently when the chosen printing is no longer owned", () => {
    // Decision 5 — the pick outlives the holding, so it stays on the card for the dormant
    // tile, but the art resolves as though no pick existed.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "owned.png", preferredSetCode: "unowned", preferredCollectorNumber: "5" }),
    ]);
    expect(agg.imageUri).toBe("owned.png");
    expect(agg.preferredPrinting).toEqual({ setCode: "UNOWNED", collectorNumber: "5" });
  });

  it("leaves preferredPrinting null when the user has never chosen", () => {
    const [agg] = aggregateCollection([raw()]);
    expect(agg.preferredPrinting).toBeNull();
  });

  it("does not paint every printing with the chosen printing's art", () => {
    // Tier 0 selects WHICH printing represents the card; it is not an arm of the per-printing
    // resolver. Injecting it there would render every tile in the picker as the same image.
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", exactImageUri: "a.png", ...picked }),
      raw({ setCode: "lea", collectorNumber: "270", exactImageUri: "b.png", ...picked }),
    ]);
    expect(agg.printings.map((p) => p.imageUri)).toEqual(["a.png", "b.png"]);
  });

  it("ignores a preference belonging to a different card", () => {
    expect(printingCaption(card({ printings: twoPrintings }))).toBe("C21 · 263 +1 more");
  });
});

describe("finish aggregation (#105 decision 9)", () => {
  it("sums copies per finish across the rows that collapse into one printing", () => {
    // Foil and nonfoil share one Scryfall image, so they are one entry — but the picker
    // still names the split, or "×4" would hide that one of them is the foil.
    const [agg] = aggregateCollection([
      raw({ finish: "nonfoil", quantity: 3 }),
      raw({ finish: "foil", quantity: 1 }),
    ]);
    expect(agg.printings).toHaveLength(1);
    expect(agg.printings[0].quantity).toBe(4);
    expect(agg.printings[0].finishes).toEqual({ nonfoil: 3, foil: 1 });
  });

  it("keeps finishes separate per printing", () => {
    const [agg] = aggregateCollection([
      raw({ collectorNumber: "263", finish: "foil", quantity: 2 }),
      raw({ setCode: "lea", collectorNumber: "270", finish: "etched", quantity: 1 }),
    ]);
    expect(agg.printings.map((p) => p.finishes)).toEqual([{ foil: 2 }, { etched: 1 }]);
  });

  it("carries the set name and release date from the sets catalog", () => {
    const [agg] = aggregateCollection([raw({ setName: "Commander 2021", releasedAt: "2021-04-23" })]);
    expect(agg.printings[0].setName).toBe("Commander 2021");
    expect(agg.printings[0].releasedAt).toBe("2021-04-23");
  });

  it("tolerates a set with no catalog row", () => {
    const [agg] = aggregateCollection([raw({ setName: null, releasedAt: null })]);
    expect(agg.printings[0].setName).toBeNull();
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
    expect(filterCards(list, { search: "cyclonic", colors: [], type: null, setCodes: [] }).map((c) => c.oracleId)).toEqual(["c"]);
  });
  it("no filters returns everything (identity when empty search + no chips)", () => {
    expect(filterCards(list, { search: "", colors: [], type: null, setCodes: [] })).toHaveLength(4);
  });
  it("colors filter matches when EVERY selected color is in the card identity", () => {
    // R + U selected → only the R/U card matches
    expect(filterCards(list, { search: "", colors: ["R", "U"], type: null, setCodes: [] }).map((c) => c.oracleId)).toEqual(["d"]);
    // R alone matches both R and R/U cards
    expect(filterCards(list, { search: "", colors: ["R"], type: null, setCodes: [] }).map((c) => c.oracleId).sort()).toEqual(["b", "d"]);
  });
  it("type filter is case-insensitive substring on typeLine", () => {
    expect(filterCards(list, { search: "", colors: [], type: "instant", setCodes: [] }).map((c) => c.oracleId).sort()).toEqual(["b", "c"]);
  });
  it("one selected set matches ANY of a card's variant sets, case-insensitive", () => {
    expect(filterCards(list, { search: "", colors: [], type: null, setCodes: ["rtr"] }).map((c) => c.oracleId)).toEqual(["c"]);
    expect(filterCards(list, { search: "", colors: [], type: null, setCodes: ["RTR"] }).map((c) => c.oracleId)).toEqual(["c"]);
  });
  it("many selected sets OR with each other", () => {
    expect(
      filterCards(list, { search: "", colors: [], type: null, setCodes: ["RTR", "2xm", "MID"] })
        .map((c) => c.oracleId).sort(),
    ).toEqual(["b", "c", "d"]);
  });
  it("no selected set is no set filter at all", () => {
    expect(filterCards(list, { search: "", colors: [], type: null, setCodes: [] })).toHaveLength(4);
  });
  it("a card owned in several sets matches on any one of them", () => {
    const multi = [card({ oracleId: "m", name: "Sol Ring", setCodes: ["C21", "LEA"], primarySetCode: "C21" })];
    expect(filterCards(multi, { search: "", colors: [], type: null, setCodes: ["lea"] })).toHaveLength(1);
    expect(filterCards(multi, { search: "", colors: [], type: null, setCodes: ["c21"] })).toHaveLength(1);
    expect(filterCards(multi, { search: "", colors: [], type: null, setCodes: ["mid"] })).toHaveLength(0);
  });
  it("sets AND with the other filters", () => {
    expect(
      filterCards(list, { search: "", colors: ["U"], type: "instant", setCodes: ["RTR", "2XM"] })
        .map((c) => c.oracleId),
    ).toEqual(["c"]);
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
