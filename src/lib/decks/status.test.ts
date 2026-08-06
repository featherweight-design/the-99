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
});
