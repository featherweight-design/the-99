import { describe, expect, it } from "vitest";
import { statusPill } from "./status";

describe("statusPill", () => {
  it("Draft at 0 cards", () => expect(statusPill({ built: 0, ownedCount: 0 })).toBe("Draft"));
  it("Building at 1–98", () => {
    expect(statusPill({ built: 1, ownedCount: 1 })).toBe("Building");
    expect(statusPill({ built: 98, ownedCount: 50 })).toBe("Building");
  });
  it("Playable at 99 with unowned gaps", () => expect(statusPill({ built: 99, ownedCount: 91 })).toBe("Playable"));
  it("Complete at 99 with all owned", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 0 })).toBe("Complete"));
  // The belt-and-braces guard: 99 matched cards is not a finished deck while a
  // line is still unnamed, and the arithmetic alone cannot see that.
  it("Playable at 99 with all owned but an unresolved line", () =>
    expect(statusPill({ built: 99, ownedCount: 99, unresolvedCount: 1 })).toBe("Playable"));

  it("Over past 99", () => {
    expect(statusPill({ built: 100, ownedCount: 0 })).toBe("Over");
    expect(statusPill({ built: 104, ownedCount: 50 })).toBe("Over");
  });

  // Over is tested before both the ownership test and the unresolved guard: the
  // count is the thing standing between this deck and a legal list, so owning
  // every card of it does not make it Complete.
  it("Over outranks Complete when every card is owned", () =>
    expect(statusPill({ built: 104, ownedCount: 104, unresolvedCount: 0 })).toBe("Over"));
});
