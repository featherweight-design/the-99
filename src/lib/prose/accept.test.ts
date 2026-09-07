import { describe, expect, it } from "vitest";
import { acceptProse, CLAIM_BY, HARD_MAX, OK_MAX, OK_MIN } from "./accept";

// The contract's own worked example: 120 characters, first clause boundary at 49.
const PASSING =
  "Kess decks tend to cast the same few spells twice, leaning on cheap draw and graveyard value rather than one combo line.";

describe("acceptProse", () => {
  it("accepts the contract's worked example", () => {
    expect(PASSING.length).toBe(120);
    expect(acceptProse(PASSING)).toBe(true);
  });

  it("accepts a string that is over the target ceiling but under the hard cap", () => {
    const long =
      "Krenko decks tend to go wide early, flooding the board with cheap goblin tokens and looking for the one haste enabler that turns that board into a lethal attack in a single turn.";
    expect(long.length).toBeGreaterThan(OK_MAX);
    expect(long.length).toBeLessThanOrEqual(HARD_MAX);
    expect(acceptProse(long)).toBe(true);
  });

  it("rejects a string below the floor, which reads as a caption in a 640px column", () => {
    const short = "Krenko decks tend to go wide with tokens.";
    expect(short.length).toBeLessThan(OK_MIN);
    expect(acceptProse(short)).toBe(false);
  });

  it("rejects a runaway string", () => {
    expect(acceptProse(`${PASSING} `.repeat(3))).toBe(false);
  });

  it("rejects two sentences, which would be half-clamped on the home card", () => {
    const two =
      "Kess decks tend to cast the same few spells twice. They lean on cheap draw and graveyard value rather than one combo line.";
    expect(two.length).toBeGreaterThan(OK_MIN);
    expect(acceptProse(two)).toBe(false);
  });

  it("rejects a claim that has not landed by the front-loading threshold", () => {
    const late =
      "Across a long game of grinding attrition and repeated value engines Kess decks tend to win by casting the same spell twice.";
    expect(late.search(/[,;—]/)).toBe(-1);
    expect(late.length).toBeGreaterThan(CLAIM_BY);
    expect(acceptProse(late)).toBe(false);
  });

  it("rejects a confident assertion with no hedge", () => {
    const confident =
      "Kess decks will cast the same few spells twice, leaning on cheap draw and graveyard value rather than one combo line.";
    expect(confident.length).toBeGreaterThan(OK_MIN);
    expect(acceptProse(confident)).toBe(false);
  });

  // The limit of the mechanical checks, stated in the contract §4 and worth pinning so
  // nobody later reads a green predicate as a green sentence. A leading subordinate
  // clause puts a comma early, so position passes while the claim is still at the end.
  // Catching it needs syntax; review is the backstop.
  it("passes a leading subordinate clause whose claim is at the end", () => {
    const subordinate =
      "Built around cheap draw, recursion and a graveyard nobody else is using, Kess decks tend to win by casting one spell three times.";
    expect(subordinate.search(/[,;—]/)).toBeLessThan(CLAIM_BY);
    expect(acceptProse(subordinate)).toBe(true);
  });

  it("trims before measuring", () => {
    expect(acceptProse(`  ${PASSING}\n`)).toBe(true);
  });
});
