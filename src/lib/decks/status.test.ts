import { describe, expect, it } from "vitest";
import { countStatus, statusPill } from "./status";

describe("statusPill — the phase", () => {
  // THE ROUND'S WHOLE POINT. A finished-looking list that has never been
  // committed is provisional, and used to announce itself `Complete`.
  it("Draft at a full, owned, resolved list with no version", () =>
    expect(statusPill({
      built: 99, ownedCount: 99, unresolvedCount: 0, unfundedCount: 0, bodySize: 99,
      hasVersion: false,
    })).toBe("Draft"));

  // The overrule of the brief's ruling 1, pinned: a phase that sorted below the
  // counts could only ever fire on the deck that needed no help.
  it("Draft outranks Over, Unresolved and To buy while uncommitted", () => {
    expect(statusPill({ built: 104, ownedCount: 104, bodySize: 99, hasVersion: false })).toBe("Draft");
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 3, bodySize: 99, hasVersion: false })).toBe("Draft");
    expect(statusPill({ built: 99, ownedCount: 40, bodySize: 99, hasVersion: false })).toBe("Draft");
  });

  it("Draft at any length, which is what the word means", () => {
    expect(statusPill({ built: 1, ownedCount: 1, bodySize: 99, hasVersion: false })).toBe("Draft");
    expect(statusPill({ built: 47, ownedCount: 20, bodySize: 99, hasVersion: false })).toBe("Draft");
  });

  it("New only when the list is empty AND nothing was ever committed", () =>
    expect(statusPill({ built: 0, ownedCount: 0, bodySize: 99, hasVersion: false })).toBe("New"));

  // R6's table says "0 cards, never committed"; its cascade snippet tests
  // `built === 0` alone. This is the deck that tells them apart — a v1, a
  // version rail, its games, and nothing in the list — and calling it `New`
  // would be the loudest wrong thing this function could say. It is committed
  // and short, which is `Building`.
  it("a COMMITTED deck cut back to zero is Building, never New", () =>
    expect(statusPill({ built: 0, ownedCount: 0, bodySize: 99, hasVersion: true })).toBe("Building"));

  // The phase is the only thing that moved. Every count answer below it is the
  // answer it has always been.
  it("commits without changing what the counts say", () => {
    const counts = { built: 99, ownedCount: 84, bodySize: 99 };
    expect(statusPill({ ...counts, hasVersion: false })).toBe("Draft");
    expect(statusPill({ ...counts, hasVersion: true })).toBe("To buy");
  });
});

describe("countStatus", () => {
  // The detail row asks this the pill stopped asking, so a draft keeps its
  // figure. One definition, or the row and the pill drift the day a threshold
  // moves.
  it("answers the committed cascade with no phase of its own", () => {
    expect(countStatus({ built: 104, ownedCount: 104, bodySize: 99 })).toBe("Over");
    expect(countStatus({ built: 99, ownedCount: 84, bodySize: 99 })).toBe("To buy");
    expect(countStatus({ built: 99, ownedCount: 99, bodySize: 99 })).toBe("Complete");
  });

  it("agrees with the pill for every committed deck", () => {
    for (const args of [
      { built: 0, ownedCount: 0, bodySize: 99 },
      { built: 47, ownedCount: 47, bodySize: 99 },
      { built: 99, ownedCount: 99, unresolvedCount: 2, bodySize: 99 },
      { built: 104, ownedCount: 3, bodySize: 99 },
    ]) {
      expect(countStatus(args)).toBe(statusPill({ ...args, hasVersion: true }));
    }
  });
});

describe("statusPill — the counts, once a deck is committed", () => {

  it("Building at 1–98 — committed, and short", () => {
    expect(statusPill({ built: 1, ownedCount: 1, bodySize: 99, hasVersion: true })).toBe("Building");
    expect(statusPill({ built: 98, ownedCount: 50, bodySize: 99, hasVersion: true })).toBe("Building");
  });

  it("Over past 99", () => {
    expect(statusPill({ built: 100, ownedCount: 0, bodySize: 99, hasVersion: true })).toBe("Over");
    expect(statusPill({ built: 104, ownedCount: 50, bodySize: 99, hasVersion: true })).toBe("Over");
  });

  // Over is tested before both the ownership test and the unresolved guard: the
  // count is the thing standing between this deck and a legal list, so owning
  // every card of it does not make it Complete.
  it("Over outranks Complete when every card is owned", () =>
    expect(statusPill({ built: 104, ownedCount: 104, unresolvedCount: 0, bodySize: 99, hasVersion: true })).toBe("Over"));

  it("Unresolved at 99 with a line we could not name", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 1, bodySize: 99, hasVersion: true })).toBe("Unresolved"));

  // #357. The bug this vocabulary exists to kill: a 99-card list of which 15
  // cards are not owned used to read "Playable", in the same green as a deck
  // you could sleeve. A shopping list is not a deck.
  it("To buy at 99 with unowned cards", () =>
    expect(statusPill({ built: 99, ownedCount: 84, bodySize: 99, hasVersion: true })).toBe("To buy"));

  it("Complete at 99 with every card owned and every line named", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 0, bodySize: 99, hasVersion: true })).toBe("Complete"));

  // The defect seniority exposed: `HD - Bolg` owned all 99 of its cards and
  // still had 12 to buy, because older finished decks held every copy. Ownership
  // alone called that Complete.
  it("To buy at 99 when every card is owned but copies are spoken for", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unfundedCount: 12, bodySize: 99, hasVersion: true })).toBe("To buy"));

  it("Complete when nothing is unfunded", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unfundedCount: 0, bodySize: 99, hasVersion: true })).toBe("Complete"));

  // A caller that cannot compute the allocation still gets the ownership answer
  // rather than a wrong Complete.
  it("falls back to ownership when unfundedCount is absent", () => {
    expect(statusPill({ built: 99, ownedCount: 84, bodySize: 99, hasVersion: true })).toBe("To buy");
    expect(statusPill({ built: 99, ownedCount: 99, bodySize: 99, hasVersion: true })).toBe("Complete");
  });

  it("Unresolved still outranks a spoken-for shopping list", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 1, unfundedCount: 12, bodySize: 99, hasVersion: true })).toBe(
      "Unresolved",
    ));

  // Unresolved outranks To buy. Both are unfinished, but an unnamed line is the
  // one the player cannot even price — it has to be settled before the shopping
  // list is a shopping list.
  it("Unresolved outranks To buy", () =>
    expect(statusPill({ built: 99, ownedCount: 84, unresolvedCount: 2, bodySize: 99, hasVersion: true })).toBe("Unresolved"));

  // Below 99 an unresolved line changes nothing: the deck is being built either
  // way, and the count is the honest headline.
  it("stays Building when a short deck also has unresolved lines", () =>
    expect(statusPill({ built: 40, ownedCount: 40, unresolvedCount: 5, bodySize: 99, hasVersion: true })).toBe("Building"));

  it("is Building when a committed deck holds nothing but unresolved lines", () =>
    expect(statusPill({ built: 0, ownedCount: 0, unresolvedCount: 3, bodySize: 99, hasVersion: true })).toBe("Building"));

  // The same import onto a deck that has never committed. `built` counts MATCHED
  // cards, so nothing landed and the pill says so — `New` — while the
  // unresolved banner above the list is what explains why. Stated rather than
  // discovered: a reader can reach this by importing a junk list into a new
  // deck, and the two surfaces are saying different halves of one fact.
  it("is New when an uncommitted deck holds nothing but unresolved lines", () =>
    expect(statusPill({ built: 0, ownedCount: 0, unresolvedCount: 3, bodySize: 99, hasVersion: false })).toBe("New"));

  it("never returns the retired Playable label", () => {
    const cases = [
      { built: 0, ownedCount: 0, bodySize: 99 },
      { built: 50, ownedCount: 20, bodySize: 99 },
      { built: 99, ownedCount: 0, bodySize: 99 },
      { built: 99, ownedCount: 99, bodySize: 99 },
      { built: 99, ownedCount: 98, unresolvedCount: 4, bodySize: 99 },
      { built: 120, ownedCount: 120, bodySize: 99 },
    ];
    for (const args of cases) expect(statusPill({ ...args, hasVersion: true })).not.toBe("Playable");
  });

  // A pair's body is 98, so the same three counts land on different sides of
  // every boundary: 98 is where it is Complete and 99 is where it is Over —
  // the exact inversion of the single-commander rows above.
  describe("at a pair's body size of 98", () => {
    it("Complete at 98 with every card owned", () =>
      expect(statusPill({ built: 98, ownedCount: 98, bodySize: 98, hasVersion: true })).toBe("Complete"));

    it("Over at 99, which is a legal list only for one commander", () =>
      expect(statusPill({ built: 99, ownedCount: 99, bodySize: 98, hasVersion: true })).toBe("Over"));

    it("Building at 97", () =>
      expect(statusPill({ built: 97, ownedCount: 97, bodySize: 98, hasVersion: true })).toBe("Building"));

    it("still ranks Unresolved above To buy at 98", () =>
      expect(statusPill({ built: 98, ownedCount: 84, unresolvedCount: 1, bodySize: 98, hasVersion: true })).toBe(
        "Unresolved",
      ));
  });
});

describe("a deck whose gaps are printed", () => {
  it("reads Complete when proxies cover the rest", () => {
    // 92 owned, 7 printed, 99 built. `ownedCount` alone says To buy; the slots
    // are all filled, and the pill has always been a claim about the list.
    expect(statusPill({
      built: 99, ownedCount: 92, coveredCount: 99, unfundedCount: 0, bodySize: 99,
      hasVersion: true,
    })).toBe("Complete");
  });

  it("still reads To buy when the proxies do not close the gap", () => {
    expect(statusPill({
      built: 99, ownedCount: 92, coveredCount: 97, unfundedCount: 2, bodySize: 99,
      hasVersion: true,
    })).toBe("To buy");
  });

  it("defaults to the ownership answer for a caller that cannot count proxies", () => {
    expect(statusPill({ built: 99, ownedCount: 99, bodySize: 99, hasVersion: true })).toBe("Complete");
    expect(statusPill({ built: 99, ownedCount: 92, bodySize: 99, hasVersion: true })).toBe("To buy");
  });
});
