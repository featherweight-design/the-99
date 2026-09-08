import { describe, expect, it } from "vitest";
import { discoveryCopy } from "../copy/commander-discovery";
import {
  byFit, byNovelty, clearsFloor, floorPct, nearestDeck, orderDeckSets, unplayedTags,
} from "./novelty";

const tag = (slug: string, count = 1) => ({ slug, label: slug.toUpperCase(), count });

describe("floorPct", () => {
  it("is the collection's share of the support list, rounded", () => {
    expect(floorPct({ collectionSupport: 30, edhrecTotal: 100 })).toBe(30);
    expect(floorPct({ collectionSupport: 1, edhrecTotal: 3 })).toBe(33);
  });

  it("is null without a denominator — never zero", () => {
    expect(floorPct({ collectionSupport: 5, edhrecTotal: null })).toBeNull();
    expect(floorPct({ collectionSupport: 0, edhrecTotal: 0 })).toBeNull();
  });

  // The sentence pairs the two, so they have to be one figure: a percentage off
  // a narrower pool could print a row as clearing a floor that excluded it.
  it("reads the same count the floor decides on", () => {
    const row = { collectionSupport: 40, ownedSupport: 4, edhrecTotal: 100 };
    expect(floorPct(row)).toBe(40);
    expect(clearsFloor(row)).toBe(true);
  });
});

describe("clearsFloor", () => {
  it("passes at exactly 30%", () => {
    expect(clearsFloor({ collectionSupport: 30, edhrecTotal: 100 })).toBe(true);
  });
  it("fails just below", () => {
    expect(clearsFloor({ collectionSupport: 29, edhrecTotal: 100 })).toBe(false);
  });

  it("clears the floor on the whole collection, never on a narrowed pool", () => {
    // 40 of 100 owned in the collection; only 5 of those are free.
    const c = { collectionSupport: 40, edhrecTotal: 100 };
    expect(clearsFloor(c)).toBe(true);
  });

  it("fails a commander with no EDHREC total", () => {
    expect(clearsFloor({ collectionSupport: 40, edhrecTotal: null })).toBe(false);
    expect(clearsFloor({ collectionSupport: 40, edhrecTotal: 0 })).toBe(false);
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
      .toEqual({ deckName: "Atraxa", sharedLabels: ["BLINK", "COUNTERS"], extraShared: 0 });
  });

  it("names one shared tag on its own", () => {
    expect(nearestDeck([tag("sacrifice")], decks))
      .toEqual({ deckName: "Meren", sharedLabels: ["SACRIFICE"], extraShared: 0 });
  });

  it("is null when no deck shares anything", () => {
    expect(nearestDeck([tag("landfall")], decks)).toBeNull();
  });

  // The tiebreak lives in `orderDeckSets`, not here: `nearestDeck` runs once per
  // candidate, so the order is derived once by the caller and only read here.
  it("breaks a tie on deck name, so the clause is stable across renders", () => {
    const tied = [
      { deckName: "Zur", slugs: new Set(["blink"]) },
      { deckName: "Brago", slugs: new Set(["blink"]) },
    ];
    expect(nearestDeck([tag("blink")], orderDeckSets(tied))?.deckName).toBe("Brago");
  });

  it("counts the rest rather than listing every shared tag", () => {
    const wide = [{ deckName: "Atraxa", slugs: new Set(["a", "b", "c", "d"]) }];
    expect(nearestDeck([tag("a"), tag("b"), tag("c"), tag("d")], wide))
      .toEqual({ deckName: "Atraxa", sharedLabels: ["A", "B"], extraShared: 2 });
  });
});

describe("orderDeckSets", () => {
  it("orders by deck name and leaves the caller's array alone", () => {
    const decks = [{ deckName: "Zur" }, { deckName: "Brago" }];
    expect(orderDeckSets(decks).map((d) => d.deckName)).toEqual(["Brago", "Zur"]);
    expect(decks.map((d) => d.deckName)).toEqual(["Zur", "Brago"]);
  });
});

describe("discoveryCopy.justify.sharedList", () => {
  const { sharedList } = discoveryCopy.justify;

  it("reads two names with a conjunction", () =>
    expect(sharedList(["Blink", "Counters"], 0)).toBe("Blink and Counters"));

  it("reads one name alone", () =>
    expect(sharedList(["Sacrifice"], 0)).toBe("Sacrifice"));

  it("counts the rest past two", () =>
    expect(sharedList(["A", "B"], 2)).toBe("A, B and 2 more"));
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
