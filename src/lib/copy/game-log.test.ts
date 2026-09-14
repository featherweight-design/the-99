import { describe, expect, it } from "vitest";
import { GAME_AXIS_KEYS } from "../decks/game-axes";
import { PATTERN_MIN, axisCopy, gameLogCopy } from "./game-log";

// Walk every string the module exports, following functions by calling them
// with plausible arguments, so an invariant cannot be broken in a branch no
// test happens to render.
function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") {
    const out: string[] = [];
    for (const args of [[0], [1], [2], [3], [0, 0], [2, 3], [3, 1, 1]]) {
      try {
        const result = (value as (...a: number[]) => unknown)(...args);
        if (typeof result === "string") out.push(result);
      } catch {
        // A string function with a different arity — covered by another tuple.
      }
    }
    return out;
  }
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

describe("game log copy", () => {
  it("has one entry per axis and no extras", () => {
    expect(Object.keys(axisCopy).sort()).toEqual([...GAME_AXIS_KEYS].sort());
  });

  // The pattern threshold is a judgement Design made once. Inlining 3 anywhere
  // else means the next person changes it in one place and not the other.
  it("exports the pattern threshold as the single source", () => {
    expect(PATTERN_MIN).toBe(3);
  });

  // The governing rule of the whole feature: a count out of three games is a
  // count, and dressing it as 67% claims a precision three games cannot carry.
  it("never prints a percentage", () => {
    for (const s of allStrings(gameLogCopy)) expect(s).not.toMatch(/%/);
    for (const s of allStrings(axisCopy)) expect(s).not.toMatch(/%/);
  });

  it("never names net", () => {
    for (const s of allStrings(gameLogCopy)) expect(s).not.toMatch(/\bnet\b/i);
  });

  // A minus sign in a figure would read as a score. The cell says "3 of 3",
  // never "−3".
  it("never prints a signed figure", () => {
    for (const s of allStrings(gameLogCopy.cell)) expect(s).not.toMatch(/[−-]\d/);
  });

  // The empty state DEMONSTRATES the tab's output, so the demonstration has to
  // be an output. It quoted "ran out of gas, 3 of 3 games" for months and no
  // surface printed that: the glosses render on the log form's checkboxes,
  // never in the aggregate. Pinned to the sentence it quotes so the two cannot
  // drift apart again.
  it("pitches a sentence the tab actually writes", () => {
    expect(gameLogCopy.headline.finding(axisCopy.card_flow.label)).toBe(
      `${gameLogCopy.empty.bodyQuote}${gameLogCopy.empty.bodyAfter}`,
    );
  });
});
