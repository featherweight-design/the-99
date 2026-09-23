import { describe, expect, it } from "vitest";

import { presentationFailures } from "./presentation";

const notes = [{ text: "flooded out on turn six", date: "2026-09-01" }];

describe("presentationFailures", () => {
  it("passes a line that carries its denominator", () => {
    expect(presentationFailures("Mana hurt in 3 of 5 games.", notes)).toEqual([]);
  });

  it("catches a percentage, and a win rate", () => {
    expect(presentationFailures("Mana hurt in 60% of games.", notes)).toContain("noPercentage");
    expect(presentationFailures("Your win rate is low.", notes)).toContain("noPercentage");
    expect(presentationFailures("This improved the win-rate.", notes)).toContain("noPercentage");
  });

  it("catches a bare count with no denominator", () => {
    expect(presentationFailures("Mana hurt in 3 games.", notes)).toContain("denominator");
  });

  it("does not ask a card count for a denominator", () => {
    expect(presentationFailures("The deck runs 34 lands against a target of 37.", notes)).toEqual([]);
  });

  it("catches a net figure, spelled or signed", () => {
    expect(presentationFailures("Mana is net negative across the log.", notes)).toContain("noNet");
    expect(presentationFailures("Mana sits at -2 across the log.", notes)).toContain("noNet");
  });

  it("does not read a card's counter notation as a signed figure", () => {
    expect(presentationFailures("Adds another +1/+1 counter payoff.", notes)).toEqual([]);
    expect(presentationFailures("Shrinks their team with -1/-1 counters.", notes)).toEqual([]);
  });

  it("accepts a quotation of anything the player wrote, the intent included", () => {
    expect(presentationFailures('For a deck meant to "go wide with tokens", this fits.', [...notes, { text: "go wide with tokens", date: null }])).toEqual([]);
  });

  it("finds a note with a quotation mark inside it intact, in either outer quotes", () => {
    const withQuote = [{ text: 'I said "keep lands"', date: "2026-09-02" }];
    expect(presentationFailures('On 2026-09-02: "I said "keep lands""', withQuote)).toEqual([]);
    expect(presentationFailures('On 2026-09-02: \u201cI said "keep lands"\u201d', withQuote)).toEqual([]);
  });

  it("accepts a quotation any one of its sources satisfies", () => {
    const twice = [{ text: "flooded", date: "2026-09-01" }, { text: "flooded", date: "2026-09-08" }];
    expect(presentationFailures('On 2026-09-08: "flooded"', twice)).toEqual([]);
    const alsoIntent = [{ text: "flooded", date: "2026-09-01" }, { text: "flooded", date: null }];
    expect(presentationFailures('You said the deck is "flooded"', alsoIntent)).toEqual([]);
    expect(presentationFailures('On 2026-09-15: "flooded"', twice)).toEqual(["quotedNote"]);
  });

  it("still catches a misquote beside a correct quotation", () => {
    expect(presentationFailures('On 2026-09-01 "flooded out on turn six", and "never drew".', notes)).toContain("quotedNote");
  });

  it("requires a quoted note's date in the same text", () => {
    expect(presentationFailures('You wrote "flooded out on turn six".', notes)).toContain("quotedNote");
  });

  it("asks a card count for its denominator", () => {
    expect(presentationFailures("Cut 2 cards for this.", notes)).toContain("denominator");
    expect(presentationFailures("Swaps 2 of 99 cards.", notes)).toEqual([]);
  });

  it("catches a sign after punctuation, not only after a space", () => {
    expect(presentationFailures("delta=-2 across the log", notes)).toContain("noNet");
  });

  it("does not read a range as a sign", () => {
    expect(presentationFailures("Games ran 8-10 turns.", notes)).toEqual([]);
  });

  it("does not read a hyphenated word as a sign", () => {
    expect(presentationFailures("A two-mana ramp spell fits the curve.", notes)).toEqual([]);
  });

  it("passes a note quoted verbatim and catches one that is not", () => {
    expect(presentationFailures('On 2026-09-01 you wrote "flooded out on turn six".', notes)).toEqual([]);
    expect(presentationFailures("On 2026-09-01 you wrote “flooded out on turn six”.", notes)).toEqual([]);
    expect(presentationFailures('You wrote "flooded on turn six".', notes)).toContain("quotedNote");
  });

  // ── The addendum's forms and rules (C-fix, audit findings 6 and 7) ─────────────────────
  it("accepts a possessed denominator and a word numerator, as Design's samples write them", () => {
    expect(presentationFailures("4 of your 99 cards draw anything.", [])).toEqual([]);
    expect(presentationFailures("It paid off in none of the 9 games.", [])).toEqual([]);
    expect(presentationFailures("It is one of 11 cards at four or more.", [])).toEqual([]);
    expect(presentationFailures("It is in 11 cards.", [])).toContain("denominator");
  });

  it("drops a rationale that names a bracket", () => {
    expect(presentationFailures("This keeps the deck in its bracket.", [])).toContain("noBracketClaim");
    expect(presentationFailures("A fine card for Optimized tables.", [])).toContain("noBracketClaim");
    expect(presentationFailures("The core of the deck stays.", [])).toEqual([]);
  });

  it("drops a rationale that promises a result, and keeps a record already logged", () => {
    for (const claim of ["This swap will win you games.", "You would lose less.", "It makes the deck stronger.", "Win more with it."]) {
      expect(presentationFailures(claim, [])).toContain("noResultClaim");
    }
    expect(presentationFailures("You won 1 of 5 games.", [])).toEqual([]);
  });

  it("reads the player's own quoted words as theirs, not the model's claim", () => {
    const intent = [{ text: "I want to win late", date: null }];
    expect(presentationFailures("You said \u201cI want to win late\u201d.", intent)).toEqual([]);
  });
});

