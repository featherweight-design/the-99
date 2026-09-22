import { describe, expect, it } from "vitest";

import { climb, findingState } from "./climb";
import type { Bracket } from "./types";

/** Every shape `permitsFor` can return. */
const REACHABLE: readonly Bracket[][] = [[1, 2], [2], [3], [4], [4, 5]];

describe("climb", () => {
  // THREE RUNGS, and only three: the brackets a deck is nowhere near are not drawn.
  it("draws the deck's bracket with one either side", () => {
    expect(climb([3])).toEqual([
      { bracket: 2, role: "below" },
      { bracket: 3, role: "yours" },
      { bracket: 4, role: "above" },
    ]);
  });

  // CLAMPED, so an edge deck draws two rungs rather than a blank one. A rung for bracket 0 or 6
  // is not a thing, and drawing an empty slot for it would read as a bracket with no name.
  it("draws two rungs at the ends rather than an empty one", () => {
    expect(climb([1, 2]).map((r) => r.bracket)).toEqual([1, 2]);
    expect(climb([1, 2])[0]).toEqual({ bracket: 1, role: "yours" });
    const top = climb([4, 5]);
    expect(top.map((r) => r.bracket)).toEqual([3, 4, 5]);
  });

  // `yours` IS THE LOWER MEMBER of a range: the deck sits at the bottom of what it permits until
  // the player says otherwise, so `[4,5]` is a 4 with the declare line above rather than a 5.
  it("puts yours on the lower member of a range", () => {
    for (const permits of REACHABLE) {
      const yours = climb(permits).find((r) => r.role === "yours");
      expect(yours?.bracket).toBe(permits[0]);
    }
  });

  it("never draws two rungs with the same role, on any reachable range", () => {
    for (const permits of REACHABLE) {
      const roles = climb(permits).map((r) => r.role);
      expect(new Set(roles).size).toBe(roles.length);
    }
  });

  it("refuses an empty range rather than drawing a climb with no yours", () => {
    expect(() => climb([])).toThrow(/no rungs/);
  });
});

describe("findingState", () => {
  it("is empty when nothing is in the list, limited or not", () => {
    expect(findingState(0, true)).toBe("empty");
    // EMPTY BEATS `no limit`. The chip answers "how many may I play"; over a zero, nobody asked.
    expect(findingState(0, false)).toBe("empty");
  });

  it("is present for a limited kind with cards in it", () => {
    expect(findingState(3, true)).toBe("present");
  });

  // NOT A VIOLATION DRESSED DIFFERENTLY. No bracket limits how many tutors a deck plays, so
  // collapsing this into `present` would let a reader infer a cap that does not exist.
  it("is notALimit for an unlimited kind with cards in it", () => {
    expect(findingState(6, false)).toBe("notALimit");
  });
});
