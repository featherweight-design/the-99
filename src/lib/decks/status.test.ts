import { describe, expect, it } from "vitest";
import { statusPill } from "./status";

describe("statusPill", () => {
  it("Draft at 0 cards", () => expect(statusPill({ built: 0, ownedCount: 0 })).toBe("Draft"));

  it("Building at 1–98", () => {
    expect(statusPill({ built: 1, ownedCount: 1 })).toBe("Building");
    expect(statusPill({ built: 98, ownedCount: 50 })).toBe("Building");
  });

  it("Over past 99", () => {
    expect(statusPill({ built: 100, ownedCount: 0 })).toBe("Over");
    expect(statusPill({ built: 104, ownedCount: 50 })).toBe("Over");
  });

  // Over is tested before both the ownership test and the unresolved guard: the
  // count is the thing standing between this deck and a legal list, so owning
  // every card of it does not make it Complete.
  it("Over outranks Complete when every card is owned", () =>
    expect(statusPill({ built: 104, ownedCount: 104, unresolvedCount: 0 })).toBe("Over"));

  it("Unresolved at 99 with a line we could not name", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 1 })).toBe("Unresolved"));

  // #357. The bug this vocabulary exists to kill: a 99-card list of which 15
  // cards are not owned used to read "Playable", in the same green as a deck
  // you could sleeve. A shopping list is not a deck.
  it("To buy at 99 with unowned cards", () =>
    expect(statusPill({ built: 99, ownedCount: 84 })).toBe("To buy"));

  it("Complete at 99 with every card owned and every line named", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 0 })).toBe("Complete"));

  // Unresolved outranks To buy. Both are unfinished, but an unnamed line is the
  // one the player cannot even price — it has to be settled before the shopping
  // list is a shopping list.
  it("Unresolved outranks To buy", () =>
    expect(statusPill({ built: 99, ownedCount: 84, unresolvedCount: 2 })).toBe("Unresolved"));

  // Below 99 an unresolved line changes nothing: the deck is being built either
  // way, and the count is the honest headline.
  it("stays Building when a short deck also has unresolved lines", () =>
    expect(statusPill({ built: 40, ownedCount: 40, unresolvedCount: 5 })).toBe("Building"));

  it("stays Draft when a deck of nothing but unresolved lines is opened", () =>
    expect(statusPill({ built: 0, ownedCount: 0, unresolvedCount: 3 })).toBe("Draft"));

  it("never returns the retired Playable label", () => {
    const cases = [
      { built: 0, ownedCount: 0 },
      { built: 50, ownedCount: 20 },
      { built: 99, ownedCount: 0 },
      { built: 99, ownedCount: 99 },
      { built: 99, ownedCount: 98, unresolvedCount: 4 },
      { built: 120, ownedCount: 120 },
    ];
    for (const args of cases) expect(statusPill(args)).not.toBe("Playable");
  });
});
