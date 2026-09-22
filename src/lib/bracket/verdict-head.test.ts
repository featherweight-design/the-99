import { describe, expect, it } from "vitest";

import { populationLine, populationSubject, verdictHead, verdictSubLine } from "./verdict-head";
import type { Bracket } from "./types";
import { BRACKET_NAMES } from "../copy/deck-analysis";

/** Every shape `permitsFor` can return, so no case here is hypothetical. */
const REACHABLE: readonly Bracket[][] = [[1, 2], [2], [3], [4], [4, 5]];

describe("verdictHead", () => {
  it("names both brackets on a range, and draws the split chip", () => {
    expect(verdictHead([1, 2])).toEqual({
      face: "Exhibition or Core", split: true, chip: 1,
    });
    expect(verdictHead([4, 5])).toEqual({
      face: "Optimized or cEDH", split: true, chip: 4,
    });
  });

  it("names the one bracket on a single, with no split", () => {
    expect(verdictHead([3])).toEqual({ face: "Upgraded", split: false, chip: 3 });
    expect(verdictHead([2])).toEqual({ face: "Core", split: false, chip: 2 });
  });

  // ROUND 3: ANSWERING RESOLVES THE FACE. Every member of both ranges, because the upper one
  // (`[5]`, `[2]` as an answer to `[1,2]`) is not itself a reachable `permits` shape and a face
  // built by re-reading the answer as a range would throw on exactly those.
  it("resolves a range to the answer's own face and chip", () => {
    for (const permits of [[1, 2], [4, 5]] as Bracket[][]) {
      for (const answered of permits) {
        const head = verdictHead(permits, answered);
        expect(head.split).toBe(false);
        expect(head.chip).toBe(answered);
        expect(head.face).toBe(BRACKET_NAMES[answered]);
      }
    }
    expect(verdictHead([4, 5], 5).face).toBe("cEDH");
    expect(verdictHead([1, 2], 1).face).toBe("Exhibition");
  });

  // An answer the range does not hold is drift, and a single bracket asks nothing. A caller
  // passing either has re-derived `declarationAsk` wrongly, and a confident face would hide it.
  it("refuses an answer that does not answer the range", () => {
    expect(() => verdictHead([4, 5], 2)).toThrow();
    expect(() => verdictHead([3], 3)).toThrow();
  });

  // EXACTLY TWO OF THE FIVE REACHABLE SHAPES ARE RANGES. Swept rather than asserted one at a
  // time, because the claim is about the whole set: the rules hand 1-vs-2 and 4-vs-5 to the
  // player, and the 3-vs-4 boundary resolves rather than splitting.
  it("splits on exactly the two shapes the rules hand to the player", () => {
    const split = REACHABLE.filter((p) => verdictHead(p).split);
    expect(split).toEqual([[1, 2], [4, 5]]);
  });

  // THE PILL TAKES THE LOWER MEMBER'S INK on a range, derived rather than listed — so a range
  // that does not exist today could not arrive drawing nothing.
  it("inks the pill from the lower member, on every shape", () => {
    for (const permits of REACHABLE) expect(verdictHead(permits).chip).toBe(permits[0]);
  });

  // A face is never a numeral: the mark beside it draws that, and a face carrying one would
  // read as the rank twice.
  it("never puts a numeral in the face", () => {
    for (const permits of REACHABLE) expect(verdictHead(permits).face).not.toMatch(/\d/);
  });

  // `permitsFor` cannot return an empty range, so a caller that produces one built it by hand —
  // and a face built from it would be the empty string beside a mark drawing nothing.
  // FAILS CLOSED ON ANY SHAPE `permitsFor` CANNOT RETURN. An empty range renders the empty
  // string beside a mark drawing nothing; a three-member one silently discards its interior and
  // renders "Exhibition or Upgraded" — a face naming a range nobody permitted, which is worse
  // because it looks like an answer.
  // EVERY SHAPE `permitsFor` CANNOT RETURN, not merely the wrong lengths. A length test accepts
  // `[1,3]`, `[2,5]` and `[5,4]`: two of them render a confident face for a range nobody
  // permitted, and the reversed pair renders its names backwards with the glyph inked from the
  // higher bracket. A fabricated answer is worse than an empty one because it looks like one.
  it.each([[[]], [[1, 2, 3]], [[1, 2, 4, 5]], [[1, 3]], [[2, 5]], [[5, 4]], [[3, 4]], [[5]]])(
    "refuses %j rather than drawing a fabricated face",
    (permits) => {
      expect(() => verdictHead(permits as Bracket[])).toThrow(/has no reading/);
    },
  );
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

describe("the sub-line", () => {
  const sub = (permits: Bracket[], violations: Parameters<typeof verdictSubLine>[0]["violations"] = []) =>
    verdictSubLine({ permits, violations });

  it("asks for intent on a range, at the range's lower member", () => {
    expect(sub([1, 2])).toEqual({ kind: "intent", low: 1 });
    expect(sub([4, 5])).toEqual({ kind: "intent", low: 4 });
  });

  it("names the rules that ruled the bracket below out", () => {
    expect(
      sub([3], [
        { rule: "gameChangers", bracket: 2, have: 2, limit: 0 },
        { rule: "gameChangers", bracket: 1, have: 2, limit: 0 },
      ]),
    ).toEqual({
      kind: "ruledOut",
      below: 2,
      reasons: [{ rule: "gameChangers", have: 2, limit: 0 }],
    });
  });

  // EVERY rule at that bracket, not the first. A deck can pass two limits at once, and naming
  // one would let a reader cut those cards and find the answer unmoved.
  it("keeps every rule that ruled it out", () => {
    const reading = sub([2], [
      { rule: "extraTurns", bracket: 1, have: 1, limit: 0 },
      { rule: "gameChangers", bracket: 1, have: 1, limit: 0 },
    ]);
    expect(reading).toEqual({
      kind: "ruledOut",
      below: 1,
      reasons: [
        { rule: "extraTurns", have: 1, limit: 0 },
        { rule: "gameChangers", have: 1, limit: 0 },
      ],
    });
  });

  // `slotDeck` reports the loop clause at 2 AND 3, so a rule can appear twice under one bracket
  // the day another clause does the same. A sentence must not say the same thing twice.
  it("says each rule once", () => {
    const reading = sub([3], [
      { rule: "extraTurns", bracket: 2, have: 1, limit: 0 },
      { rule: "extraTurns", bracket: 2, have: 1, limit: 0 },
    ]);
    expect(reading).toEqual({
      kind: "ruledOut",
      below: 2,
      reasons: [{ rule: "extraTurns", have: 1, limit: 0 }],
    });
  });

  // THE READING THE CANVAS NEVER DREW. `[4]` arrives with `violatesB3` false, so there is no
  // violation at bracket 3 at all and a violations-only reading would draw an empty sentence on
  // a real deck.
  it("reads [4] as assembled rather than as an empty list of rules", () => {
    expect(sub([4])).toEqual({ kind: "assembled", below: 3 });
  });

  it("refuses a range permitsFor cannot return", () => {
    expect(() => sub([1, 3] as Bracket[])).toThrow(/no reading/);
  });
});

describe("who the population line is about", () => {
  const cards = [
    { oracleId: "a", name: "Kraum, Ludevic's Opus" },
    { oracleId: "b", name: "Tymna the Weaver" },
    { oracleId: "c", name: "Sol Ring" },
  ];

  it("names both commanders over a pair row", () => {
    expect(populationSubject("pair", ["a", "b"], cards)).toBe("Kraum, Ludevic's Opus and Tymna the Weaver");
  });

  // A COMMANDER ROW IS THE PRIMARY'S. Naming both would attribute a partner deck's counts to a
  // pairing EDHREC never counted.
  it("names only the primary over a commander row", () => {
    expect(populationSubject("commander", ["a", "b"], cards)).toBe("Kraum, Ludevic's Opus");
  });

  it("returns null when a commander is not among the cards", () => {
    expect(populationSubject("pair", ["a", "z"], cards)).toBeNull();
    expect(populationSubject("commander", [], cards)).toBeNull();
  });
});
