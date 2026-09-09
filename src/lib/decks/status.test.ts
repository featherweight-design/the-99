import { describe, expect, it } from "vitest";
import { statusPill } from "./status";

describe("statusPill", () => {
  it("Draft at 0 cards", () => expect(statusPill({ built: 0, ownedCount: 0, bodySize: 99 })).toBe("Draft"));

  it("Building at 1–98", () => {
    expect(statusPill({ built: 1, ownedCount: 1, bodySize: 99 })).toBe("Building");
    expect(statusPill({ built: 98, ownedCount: 50, bodySize: 99 })).toBe("Building");
  });

  it("Over past 99", () => {
    expect(statusPill({ built: 100, ownedCount: 0, bodySize: 99 })).toBe("Over");
    expect(statusPill({ built: 104, ownedCount: 50, bodySize: 99 })).toBe("Over");
  });

  // Over is tested before both the ownership test and the unresolved guard: the
  // count is the thing standing between this deck and a legal list, so owning
  // every card of it does not make it Complete.
  it("Over outranks Complete when every card is owned", () =>
    expect(statusPill({ built: 104, ownedCount: 104, unresolvedCount: 0, bodySize: 99 })).toBe("Over"));

  it("Unresolved at 99 with a line we could not name", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 1, bodySize: 99 })).toBe("Unresolved"));

  // #357. The bug this vocabulary exists to kill: a 99-card list of which 15
  // cards are not owned used to read "Playable", in the same green as a deck
  // you could sleeve. A shopping list is not a deck.
  it("To buy at 99 with unowned cards", () =>
    expect(statusPill({ built: 99, ownedCount: 84, bodySize: 99 })).toBe("To buy"));

  it("Complete at 99 with every card owned and every line named", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 0, bodySize: 99 })).toBe("Complete"));

  // The defect seniority exposed: `HD - Bolg` owned all 99 of its cards and
  // still had 12 to buy, because older finished decks held every copy. Ownership
  // alone called that Complete.
  it("To buy at 99 when every card is owned but copies are spoken for", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unfundedCount: 12, bodySize: 99 })).toBe("To buy"));

  it("Complete when nothing is unfunded", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unfundedCount: 0, bodySize: 99 })).toBe("Complete"));

  // A caller that cannot compute the allocation still gets the ownership answer
  // rather than a wrong Complete.
  it("falls back to ownership when unfundedCount is absent", () => {
    expect(statusPill({ built: 99, ownedCount: 84, bodySize: 99 })).toBe("To buy");
    expect(statusPill({ built: 99, ownedCount: 99, bodySize: 99 })).toBe("Complete");
  });

  it("Unresolved still outranks a spoken-for shopping list", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 1, unfundedCount: 12, bodySize: 99 })).toBe(
      "Unresolved",
    ));

  // Unresolved outranks To buy. Both are unfinished, but an unnamed line is the
  // one the player cannot even price — it has to be settled before the shopping
  // list is a shopping list.
  it("Unresolved outranks To buy", () =>
    expect(statusPill({ built: 99, ownedCount: 84, unresolvedCount: 2, bodySize: 99 })).toBe("Unresolved"));

  // Below 99 an unresolved line changes nothing: the deck is being built either
  // way, and the count is the honest headline.
  it("stays Building when a short deck also has unresolved lines", () =>
    expect(statusPill({ built: 40, ownedCount: 40, unresolvedCount: 5, bodySize: 99 })).toBe("Building"));

  it("stays Draft when a deck of nothing but unresolved lines is opened", () =>
    expect(statusPill({ built: 0, ownedCount: 0, unresolvedCount: 3, bodySize: 99 })).toBe("Draft"));

  it("never returns the retired Playable label", () => {
    const cases = [
      { built: 0, ownedCount: 0, bodySize: 99 },
      { built: 50, ownedCount: 20, bodySize: 99 },
      { built: 99, ownedCount: 0, bodySize: 99 },
      { built: 99, ownedCount: 99, bodySize: 99 },
      { built: 99, ownedCount: 98, unresolvedCount: 4, bodySize: 99 },
      { built: 120, ownedCount: 120, bodySize: 99 },
    ];
    for (const args of cases) expect(statusPill(args)).not.toBe("Playable");
  });

  // A pair's body is 98, so the same three counts land on different sides of
  // every boundary: 98 is where it is Complete and 99 is where it is Over —
  // the exact inversion of the single-commander rows above.
  describe("at a pair's body size of 98", () => {
    it("Complete at 98 with every card owned", () =>
      expect(statusPill({ built: 98, ownedCount: 98, bodySize: 98 })).toBe("Complete"));

    it("Over at 99, which is a legal list only for one commander", () =>
      expect(statusPill({ built: 99, ownedCount: 99, bodySize: 98 })).toBe("Over"));

    it("Building at 97", () =>
      expect(statusPill({ built: 97, ownedCount: 97, bodySize: 98 })).toBe("Building"));

    it("still ranks Unresolved above To buy at 98", () =>
      expect(statusPill({ built: 98, ownedCount: 84, unresolvedCount: 1, bodySize: 98 })).toBe(
        "Unresolved",
      ));
  });
});
