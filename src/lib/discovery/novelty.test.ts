import { describe, expect, it } from "vitest";
import { byFit, byNovelty, clearsFloor, floorPct, nearestDeck, unplayedTags } from "./novelty";

const tag = (slug: string, count = 1) => ({ slug, label: slug.toUpperCase(), count });

describe("floorPct", () => {
  it("is the owned share of the support list, rounded", () => {
    expect(floorPct({ ownedSupport: 30, edhrecTotal: 100 })).toBe(30);
    expect(floorPct({ ownedSupport: 1, edhrecTotal: 3 })).toBe(33);
  });

  it("is null without a denominator — never zero", () => {
    expect(floorPct({ ownedSupport: 5, edhrecTotal: null })).toBeNull();
    expect(floorPct({ ownedSupport: 0, edhrecTotal: 0 })).toBeNull();
  });
});

describe("clearsFloor", () => {
  it("passes at exactly 30%", () => {
    expect(clearsFloor({ ownedSupport: 30, edhrecTotal: 100 })).toBe(true);
  });
  it("fails just below", () => {
    expect(clearsFloor({ ownedSupport: 29, edhrecTotal: 100 })).toBe(false);
  });
  it("fails without a denominator rather than passing by default", () => {
    expect(clearsFloor({ ownedSupport: 99, edhrecTotal: null })).toBe(false);
  });
});

describe("unplayedTags", () => {
  it("is a set difference on slugs, ordered by count then slug", () => {
    const got = unplayedTags(
      [tag("blink", 2), tag("counters", 9), tag("sacrifice", 9)],
      new Set(["blink"]),
    );
    expect(got.map((t) => t.slug)).toEqual(["counters", "sacrifice"]);
  });

  it("returns every tag when nothing has been played", () => {
    expect(unplayedTags([tag("blink")], new Set()).length).toBe(1);
  });

  it("returns nothing for an untagged commander", () => {
    expect(unplayedTags([], new Set(["blink"]))).toEqual([]);
  });
});

describe("nearestDeck", () => {
  const decks = [
    { deckName: "Atraxa", slugs: new Set(["counters", "blink"]) },
    { deckName: "Meren", slugs: new Set(["sacrifice"]) },
  ];

  it("picks the deck sharing the most tags", () => {
    expect(nearestDeck([tag("counters"), tag("blink"), tag("sacrifice")], decks))
      .toEqual({ deckName: "Atraxa", shared: "BLINK and COUNTERS" });
  });

  it("names one shared tag without a conjunction", () => {
    expect(nearestDeck([tag("sacrifice")], decks))
      .toEqual({ deckName: "Meren", shared: "SACRIFICE" });
  });

  it("is null when no deck shares anything", () => {
    expect(nearestDeck([tag("landfall")], decks)).toBeNull();
  });

  it("breaks a tie on deck name, so the clause is stable across renders", () => {
    const tied = [
      { deckName: "Zur", slugs: new Set(["blink"]) },
      { deckName: "Brago", slugs: new Set(["blink"]) },
    ];
    expect(nearestDeck([tag("blink")], tied)?.deckName).toBe("Brago");
  });

  it("counts the rest rather than listing every shared tag", () => {
    const wide = [{ deckName: "Atraxa", slugs: new Set(["a", "b", "c", "d"]) }];
    expect(nearestDeck([tag("a"), tag("b"), tag("c"), tag("d")], wide)?.shared)
      .toBe("A, B and 2 more");
  });
});

const r = (oracleId: string, ownedSupport: number, unplayedCount: number) =>
  ({ oracleId, ownedSupport, unplayedCount });

describe("orderings", () => {
  it("fit sorts on raw overlap, never on a ratio", () => {
    // Ruling 3: fit sorts on overlap. A 40-card list with 20 owned ranks BELOW
    // a 600-card list with 30 owned, and that is the settled behaviour.
    expect([r("a", 20, 0), r("b", 30, 0)].sort(byFit).map((x) => x.oracleId))
      .toEqual(["b", "a"]);
  });

  it("fit breaks ties on oracle id, so two renders agree", () => {
    expect([r("b", 5, 0), r("a", 5, 0)].sort(byFit).map((x) => x.oracleId))
      .toEqual(["a", "b"]);
  });

  it("novelty sorts on unplayed tags, then overlap, then id", () => {
    const rows = [r("a", 90, 1), r("b", 10, 4), r("c", 50, 4)];
    expect(rows.sort(byNovelty).map((x) => x.oracleId)).toEqual(["c", "b", "a"]);
  });
});
