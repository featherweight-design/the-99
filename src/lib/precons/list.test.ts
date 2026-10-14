import { describe, expect, it } from "vitest";
import {
  filterPrecons, groupByYear, orderPrecons, parsePreconParams, summarisePrecons,
  type PreconCardFact, type PreconSource,
} from "./list";

const card = (oracleId: string, over: Partial<PreconCardFact> = {}): PreconCardFact =>
  ({ oracleId, name: oracleId, isCommander: false, basic: false, colorIdentity: [], imageUri: null, ...over });

function source(fileName: string, over: Partial<PreconSource> = {}): PreconSource {
  return {
    fileName, name: fileName, setCode: "SET", releaseDate: "2024-01-01", twinOf: null, unmappedCount: 0,
    cards: [
      card(`${fileName}-cmd`, { isCommander: true, name: `${fileName} Commander`, colorIdentity: ["G", "W"] }),
      card("sol-ring"), card("arcane-signet"), card("plains", { basic: true }),
    ],
    ...over,
  };
}

describe("summarisePrecons", () => {
  it("counts distinct non-basic cards, commanders included, and the owned among them", () => {
    const [row] = summarisePrecons([source("A")], new Set(["sol-ring", "plains"]), []);
    expect(row.of).toBe(3);
    expect(row.owned).toBe(1);
    expect(row.identity).toEqual(["W", "G"]);
  });

  it("folds a Collector's Edition twin into its plain edition, which names it", () => {
    const rows = summarisePrecons(
      [source("A"), source("ACE", { name: "A Collector's Edition", twinOf: "A" })], new Set(), []);
    expect(rows.map((r) => r.fileName)).toEqual(["A"]);
    expect(rows[0].twinName).toBe("A Collector's Edition");
  });

  it("lists two commanders once each, and keeps the unmapped count", () => {
    const pair = source("P", { unmappedCount: 2 });
    pair.cards.push(card("partner", { isCommander: true, colorIdentity: ["B"] }));
    const [row] = summarisePrecons([pair], new Set(), []);
    expect(row.commanders.map((c) => c.oracleId)).toEqual(["P-cmd", "partner"]);
    expect(row.identity).toEqual(["W", "B", "G"]);
    expect(row.unmapped).toBe(2);
  });

  it("carries the lead commander's small render beside its full one", () => {
    const withArt = source("P");
    withArt.cards[0] = { ...withArt.cards[0], imageUri: "https://img/n.jpg", imageUriSmall: "https://img/s.jpg" };
    const [row] = summarisePrecons([withArt], new Set(), []);
    expect(row.commanders[0]).toMatchObject({ imageUri: "https://img/n.jpg", imageUriSmall: "https://img/s.jpg" });
  });

  it("names the reader's decks that share it, the larger share first", () => {
    const decks = [
      { id: "d1", name: "Swapped", commanders: ["x"], cards: new Set(["x", "sol-ring"]) },
      { id: "d2", name: "Same", commanders: ["A-cmd"], cards: new Set(["A-cmd", "sol-ring", "arcane-signet"]) },
      { id: "d3", name: "Half", commanders: ["A-cmd"], cards: new Set(["A-cmd", "sol-ring"]) },
    ];
    const [row] = summarisePrecons([source("A")], new Set(), decks);
    expect(row.built.map((b) => b.deckName)).toEqual(["Same", "Half"]);
    expect(row.built[0]).toMatchObject({ shared: 3, sameCommanders: true });
  });
});

describe("summarisePrecons: a linked deck (R3 K9)", () => {
  it("lists a linked deck first, and lists it even when the shared rule does not hold", () => {
    const decks = [
      { id: "d1", name: "Same", commanders: ["A-cmd"], cards: new Set(["A-cmd", "sol-ring", "arcane-signet"]) },
      // Shares 1 of 3 under another commander, below the 60% rule: only the link lists it.
      { id: "d2", name: "Linked", commanders: ["x"], cards: new Set(["x", "sol-ring"]), builtFrom: "A" },
      // Linked to another precon: says nothing here unless the rule holds.
      { id: "d3", name: "Elsewhere", commanders: ["x"], cards: new Set(["x"]), builtFrom: "B" },
    ];
    const [row] = summarisePrecons([source("A")], new Set(), decks);
    expect(row.built).toEqual([
      { deckId: "d2", deckName: "Linked", shared: 1, sameCommanders: false, linked: true },
      { deckId: "d1", deckName: "Same", shared: 3, sameCommanders: true, linked: false },
    ]);
  });
});

describe("filter, order, group", () => {
  const rows = summarisePrecons([
    source("Old", { releaseDate: "2016-11-11", setCode: "C16" }),
    source("New", { releaseDate: "2026-10-02", setCode: "FDC" }),
    source("Mid", { releaseDate: "2026-06-26", setCode: "MSC" }),
    source("Twin", { twinOf: "Mid", name: "Mid Collector’s Edition" }),
  ], new Set(["Old-cmd", "sol-ring", "arcane-signet"]), []);

  it("searches the name, the twin's name, a commander and the set code, accents aside", () => {
    expect(filterPrecons(rows, "fdc", []).map((r) => r.name)).toEqual(["New"]);
    expect(filterPrecons(rows, "collector", []).map((r) => r.name)).toEqual(["Mid"]);
    expect(filterPrecons(rows, "old commander", []).map((r) => r.name)).toEqual(["Old"]);
    expect(filterPrecons(rows, "", ["B"])).toEqual([]);
    expect(filterPrecons(rows, "", ["G", "W"])).toHaveLength(3);
  });

  it("orders newest first, or most owned then newest", () => {
    expect(orderPrecons(rows, "newest").map((r) => r.name)).toEqual(["New", "Mid", "Old"]);
    expect(orderPrecons(rows, "owned").map((r) => r.name)).toEqual(["Old", "New", "Mid"]);
  });

  it("breaks a tie by name, then file name, by code point", () => {
    const tied = summarisePrecons([source("b"), source("A"), source("a")], new Set(), []);
    expect(orderPrecons(tied, "newest").map((r) => r.fileName)).toEqual(["A", "a", "b"]);
  });

  it("groups by release year in the rows' order", () => {
    expect(groupByYear(orderPrecons(rows, "newest")).map((g) => [g.year, g.rows.length])).toEqual([["2026", 2], ["2016", 1]]);
  });

  it("parses the URL, ignoring what it does not name", () => {
    expect(parsePreconParams(new URLSearchParams("q=eldrazi&colour=G,X,W&sort=owned")))
      .toEqual({ q: "eldrazi", colours: ["W", "G"], order: "owned", view: null });
    expect(parsePreconParams(new URLSearchParams("sort=oldest")).order).toBeNull();
  });

  it("parses the view, and ignores one it does not know (T2u)", () => {
    expect(parsePreconParams(new URLSearchParams("view=rows")).view).toBe("rows");
    expect(parsePreconParams(new URLSearchParams("view=tiles")).view).toBe("tiles");
    expect(parsePreconParams(new URLSearchParams("view=grid")).view).toBeNull();
  });
});
