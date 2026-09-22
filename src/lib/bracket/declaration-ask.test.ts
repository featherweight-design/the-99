import { describe, expect, it } from "vitest";

import { declarationAsk } from "./declaration-ask";
import type { Bracket } from "./types";

const RANGES: readonly Bracket[][] = [[1, 2], [4, 5]];
const SINGLES: readonly Bracket[][] = [[2], [3], [4]];

describe("declarationAsk", () => {
  it("asks on a range nobody has answered", () => {
    for (const permits of RANGES) {
      expect(declarationAsk(permits, null)).toEqual({ kind: "ask", permits });
    }
  });

  it("draws the one bracket once a range is answered from inside it", () => {
    expect(declarationAsk([1, 2], 2)).toEqual({ kind: "answered", declared: 2, permits: [1, 2] });
    expect(declarationAsk([4, 5], 5)).toEqual({ kind: "answered", declared: 5, permits: [4, 5] });
  });

  // A SINGLE BRACKET IS NOT A QUESTION, so there is no line at all — not an empty one, and not
  // an ask the player cannot answer.
  it("draws nothing for a single permitted bracket", () => {
    for (const permits of SINGLES) {
      expect(declarationAsk(permits, null)).toEqual({ kind: "none" });
    }
  });

  // THE DRIFT READING. The declaration is never corrected, never inferred and never cleared —
  // the deck keeps what was said and the surface reports that the cards moved.
  it("reports drift when the cards no longer permit the answer", () => {
    expect(declarationAsk([1, 2], 5)).toEqual({
      kind: "drifted", declared: 5, permits: [1, 2], stillAsking: true,
    });
  });

  // AND THE ORDINARY ASK FOLLOWS ONLY WHEN THE NEW READING IS ITSELF A RANGE. This is the pair
  // a single test of drift would miss: the same declaration, drifted, asks again on a range and
  // says nothing further on a single bracket.
  it("asks again after drift only when the new reading is a range", () => {
    expect(declarationAsk([4, 5], 1)).toMatchObject({ kind: "drifted", stillAsking: true });
    expect(declarationAsk([3], 1)).toMatchObject({ kind: "drifted", stillAsking: false });
  });

  // A DECLARATION IS NEVER CLEARED BY THIS READING. Whatever the cards now permit, the answer
  // travels through — swept, because "never cleared" is a claim about every input.
  it("carries the declaration through every reading that has one", () => {
    for (const permits of [...RANGES, ...SINGLES]) {
      for (const declared of [1, 2, 3, 4, 5] as Bracket[]) {
        const ask = declarationAsk(permits, declared);
        if (ask.kind === "answered") expect(ask.declared).toBe(declared);
        if (ask.kind === "drifted") expect(ask.declared).toBe(declared);
        expect(ask.kind).not.toBe("ask");
      }
    }
  });

  // An unanswered single bracket and an unanswered range are different readings, and the
  // difference is the whole point of there being no skip: silence leaves the version
  // unanswered and the ask stays.
  it("keeps an unanswered range asking rather than collapsing it to none", () => {
    expect(declarationAsk([1, 2], null).kind).toBe("ask");
    expect(declarationAsk([2], null).kind).toBe("none");
  });
});
