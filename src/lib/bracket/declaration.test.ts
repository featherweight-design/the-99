import { describe, expect, it } from "vitest";

import { declarationRefusal } from "./declaration";
import type { Bracket } from "./types";

// Every shape `permitsFor` can return, so no case here is hypothetical.
const RANGES: readonly Bracket[][] = [[1, 2], [2], [3], [4], [4, 5]];

describe("declarationRefusal", () => {
  it("admits either half of a real range", () => {
    expect(declarationRefusal([1, 2], 1)).toBeNull();
    expect(declarationRefusal([1, 2], 2)).toBeNull();
    expect(declarationRefusal([4, 5], 4)).toBeNull();
    expect(declarationRefusal([4, 5], 5)).toBeNull();
  });

  // The two ranges are the only shapes a player is ever asked about — `permitsFor` returns
  // `[1,2] | [2] | [3] | [4] | [4,5]`, so exactly two of its five outputs carry a choice.
  it("admits a declaration for exactly the two ranges, and refuses the three singles", () => {
    const admitted = RANGES.filter((p) => p.some((b) => declarationRefusal(p, b) === null));
    expect(admitted).toEqual([[1, 2], [4, 5]]);
  });

  // NOT "your cards do not allow that" — they do. There was no question.
  it("refuses a single-permit deck as no-choice, naming what it permits", () => {
    expect(declarationRefusal([3], 3)).toEqual({ kind: "no-choice", permits: [3] });
    expect(declarationRefusal([2], 2)).toEqual({ kind: "no-choice", permits: [2] });
  });

  // ORDER MATTERS, and this is the case that proves it. A single-permit deck asked to declare a
  // bracket it does NOT permit is still no-choice: the membership test would be a true
  // statement about the wrong question. Swap the two checks and this reads "not-permitted".
  it("reports no-choice before membership, even when the value is also unpermitted", () => {
    expect(declarationRefusal([3], 5)).toEqual({ kind: "no-choice", permits: [3] });
  });

  it("refuses a bracket the cards do not permit", () => {
    expect(declarationRefusal([1, 2], 4)).toEqual({ kind: "not-permitted", permits: [1, 2] });
    expect(declarationRefusal([4, 5], 1)).toEqual({ kind: "not-permitted", permits: [4, 5] });
  });

  // The column's check constraint refuses these too. This refuses them first, with a reason —
  // a constraint violation reaches the player as a failed action and no sentence.
  it.each([0, 6, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses %p as out of range",
    (value) => {
      expect(declarationRefusal([1, 2], value)).toEqual({ kind: "out-of-range" });
    },
  );

  // THE APP NEVER DEFAULTS AND NEVER INFERS. There is no input to this function that records a
  // declaration without naming one: an empty permit list refuses, and no value is treated as a
  // default. Asserted as a sweep rather than a sentence, because "never defaults" is a claim
  // about every input rather than about the ones someone thought of.
  it("records nothing for an empty permit list, whatever is named", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      expect(declarationRefusal([], value)).toEqual({ kind: "no-choice", permits: [] });
    }
  });

  // OUT-OF-RANGE BY KIND, never merely "not null".
  //
  // The first version asserted `not.toBeNull()` across every range, which the `no-choice`
  // branch satisfies for `[2]`, `[3]` and `[4]` — so 12 of its 20 iterations passed with the
  // out-of-range check deleted outright, and only the two real ranges carried the case. Naming
  // the kind is what makes every iteration load-bearing.
  it("reports out-of-range by kind for every range, single or not", () => {
    for (const permits of RANGES) {
      for (const value of [0, 6, 99, -3, 2.5]) {
        expect(declarationRefusal(permits, value)).toEqual({ kind: "out-of-range" });
      }
    }
  });
});
