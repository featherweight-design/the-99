import { describe, expect, it } from "vitest";

import { populationLine, verdictHead } from "./verdict-head";
import type { Bracket } from "./types";

/** Every shape `permitsFor` can return, so no case here is hypothetical. */
const REACHABLE: readonly Bracket[][] = [[1, 2], [2], [3], [4], [4, 5]];

describe("verdictHead", () => {
  it("names both brackets on a range, and draws the split chip", () => {
    expect(verdictHead([1, 2])).toEqual({
      face: "Exhibition or Core", split: true, glyphBracket: 1,
    });
    expect(verdictHead([4, 5])).toEqual({
      face: "Optimized or cEDH", split: true, glyphBracket: 4,
    });
  });

  it("names the one bracket on a single, with no chip and no glyph", () => {
    expect(verdictHead([3])).toEqual({ face: "Upgraded", split: false, glyphBracket: null });
    expect(verdictHead([2])).toEqual({ face: "Core", split: false, glyphBracket: null });
  });

  // EXACTLY TWO OF THE FIVE REACHABLE SHAPES ARE RANGES. Swept rather than asserted one at a
  // time, because the claim is about the whole set: the rules hand 1-vs-2 and 4-vs-5 to the
  // player, and the 3-vs-4 boundary resolves rather than splitting.
  it("splits on exactly the two shapes the rules hand to the player", () => {
    const split = REACHABLE.filter((p) => verdictHead(p).split);
    expect(split).toEqual([[1, 2], [4, 5]]);
  });

  // THE GLYPH TAKES THE LOWER MEMBER'S INK, derived rather than listed — so a range that does
  // not exist today could not arrive drawing nothing.
  it("inks the glyph from the lower member, on every range", () => {
    for (const permits of REACHABLE) {
      const head = verdictHead(permits);
      if (head.split) expect(head.glyphBracket).toBe(permits[0]);
      else expect(head.glyphBracket).toBeNull();
    }
  });

  // A face is never a numeral: the mark beside it draws that, and a face carrying one would
  // read as the rank twice.
  it("never puts a numeral in the face", () => {
    for (const permits of REACHABLE) expect(verdictHead(permits).face).not.toMatch(/\d/);
  });

  // `permitsFor` cannot return an empty range, so a caller that produces one built it by hand —
  // and a face built from it would be the empty string beside a mark drawing nothing.
  it("refuses an empty range rather than drawing an empty face", () => {
    expect(() => verdictHead([])).toThrow(/empty permitted range/);
  });
});

describe("populationLine", () => {
  it("reports the count and its denominator together", () => {
    expect(populationLine({ counts: { "4": 120 }, declaredTotal: 500 }, 4)).toEqual({
      kind: "present", declaredTotal: 500, said: 120, name: "Optimized",
    });
  });

  // ABSENT IS NOT ZERO, and 27 commanders are in the first case. A line reading "0 of 0 said
  // Upgraded" claims a measurement nobody took.
  it("is absent for a commander with no declarations, never a zero", () => {
    expect(populationLine(null, 3)).toEqual({ kind: "absent" });
    expect(populationLine({ counts: {}, declaredTotal: 0 }, 3)).toEqual({ kind: "absent" });
  });

  // ...but a bracket nobody chose, out of a total that exists, really is zero of it. The two
  // zeroes mean different things and only one of them is drawable.
  it("reports a real zero when the total is known and the bracket is unchosen", () => {
    expect(populationLine({ counts: { "1": 40 }, declaredTotal: 40 }, 5)).toEqual({
      kind: "present", declaredTotal: 40, said: 0, name: "cEDH",
    });
  });
});
