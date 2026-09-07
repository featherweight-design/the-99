import { describe, expect, it } from "vitest";
import { acceptProse, checkProse, CLAIM_BY, HARD_MAX, OK_MAX, OK_MIN } from "./accept";

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

  // Every one of these strings names a commander, and a commander's name can carry a
  // period. Counting those as sentence ends would leave those commanders with no prose
  // at all, permanently, since a rejected string is never stored.
  it("accepts a sentence whose subject is a titled commander", () => {
    const titled =
      "Mr. Orfeo, the Boulder tends to sit behind a wall of cheap blockers, waiting for the one sacrifice outlet that turns them into reach.";
    expect(titled.length).toBeLessThanOrEqual(HARD_MAX);
    expect(acceptProse(titled)).toBe(true);
  });

  it("accepts a sentence carrying an initialism", () => {
    const initials =
      "Kess decks tend to run the same S.O.S. package twice, leaning on cheap draw and graveyard value rather than one combo line.";
    expect(acceptProse(initials)).toBe(true);
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

// The reason exists so a run can report which rule rejected it. A rejection filed under the
// wrong rule is worse than none: it sends the next prompt change at the wrong constraint.
describe("checkProse", () => {
  it("names no rule for a string that satisfies the contract", () => {
    expect(checkProse(PASSING)).toBeNull();
  });

  it("names the band for a string below the floor", () => {
    expect(checkProse("Krenko decks tend to go wide with tokens.")).toBe("length");
  });

  it("names the band for a string over the hard cap", () => {
    expect(checkProse(`${PASSING} `.repeat(3))).toBe("length");
  });

  it("names the sentence count for two sentences", () => {
    expect(
      checkProse(
        "Kess decks tend to cast the same few spells twice. They lean on cheap draw and graveyard value rather than one combo line.",
      ),
    ).toBe("sentences");
  });

  // The rule the shipped run actually failed, ~100 times over: an opening that spends the
  // whole claim budget on the subject leaves the first comma far past the threshold.
  it("names front-loading for a claim that lands after the threshold", () => {
    const late =
      "Urabrask the Hidden decks tend to overwhelm opponents early with haste-enabled aggro, usually backed by burn and extra combat steps to close games fast.";
    expect(late.search(/[,;—]/)).toBeGreaterThan(CLAIM_BY);
    expect(checkProse(late)).toBe("front-loading");
  });

  it("names front-loading for a sentence carrying no break at all", () => {
    const unbroken =
      "Dragonlord Kolaghan decks tend to swarm the board with flying dragons and push hasty attacks that close a game out quickly.";
    expect(unbroken.search(/[,;—]/)).toBe(-1);
    expect(checkProse(unbroken)).toBe("front-loading");
  });

  it("names the hedge for a confident assertion", () => {
    expect(
      checkProse(
        "Kess decks will cast the same few spells twice, leaning on cheap draw and graveyard value rather than one combo line.",
      ),
    ).toBe("hedge");
  });

  // Four rules, first failure wins, so a string breaking two is filed under the earlier one.
  // Pinned because the tally the run prints is only readable if that order is fixed.
  it("reports the earlier rule when a string breaks two", () => {
    expect(checkProse("Kess decks win.")).toBe("length");
  });
});
