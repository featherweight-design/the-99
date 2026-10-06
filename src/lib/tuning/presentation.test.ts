import { describe, expect, it } from "vitest";

import { presentationFailures } from "./presentation";

const fails = (text: string, quotable: Parameters<typeof presentationFailures>[1]) =>
  presentationFailures(text, quotable).broken;

const notes = [{ text: "flooded out on turn six", date: "2026-09-01" }];

describe("presentationFailures", () => {
  it("passes a line that carries its denominator", () => {
    expect(fails("Mana hurt in 3 of 5 games.", notes)).toEqual([]);
  });

  it("catches a percentage, and a win rate", () => {
    expect(fails("Mana hurt in 60% of games.", notes)).toContain("noPercentage");
    expect(fails("Your win rate is low.", notes)).toContain("noPercentage");
    expect(fails("This improved the win-rate.", notes)).toContain("noPercentage");
  });

  it("catches a bare count with no denominator", () => {
    expect(fails("Mana hurt in 3 games.", notes)).toContain("denominator");
  });

  it("does not ask a card count for a denominator", () => {
    expect(fails("The deck runs 34 lands against a target of 37.", notes)).toEqual([]);
  });

  it("catches a net figure, spelled or signed", () => {
    expect(fails("Mana is net negative across the log.", notes)).toContain("noNet");
    expect(fails("Mana sits at -2 across the log.", notes)).toContain("noNet");
  });

  it("does not read a card's counter notation as a signed figure", () => {
    expect(fails("Adds another +1/+1 counter payoff.", notes)).toEqual([]);
    expect(fails("Shrinks their team with -1/-1 counters.", notes)).toEqual([]);
  });

  it("accepts a quotation of anything the player wrote, the intent included", () => {
    expect(fails('For a deck meant to "go wide with tokens", this fits.', [...notes, { text: "go wide with tokens", date: null }])).toEqual([]);
  });

  it("finds a note with a quotation mark inside it intact, in either outer quotes", () => {
    const withQuote = [{ text: 'I said "keep lands"', date: "2026-09-02" }];
    expect(fails('On 2026-09-02: "I said "keep lands""', withQuote)).toEqual([]);
    expect(fails('On 2026-09-02: \u201cI said "keep lands"\u201d', withQuote)).toEqual([]);
  });

  it("accepts a quotation any one of its sources satisfies", () => {
    const twice = [{ text: "flooded", date: "2026-09-01" }, { text: "flooded", date: "2026-09-08" }];
    expect(fails('On 2026-09-08: "flooded"', twice)).toEqual([]);
    const alsoIntent = [{ text: "flooded", date: "2026-09-01" }, { text: "flooded", date: null }];
    expect(fails('You said the deck is "flooded"', alsoIntent)).toEqual([]);
    expect(fails('On 2026-09-15: "flooded"', twice)).toEqual(["quotedNote"]);
  });

  it("still catches a misquote beside a correct quotation", () => {
    expect(fails('On 2026-09-01 "flooded out on turn six", and "never drew".', notes)).toContain("quotedNote");
  });

  it("requires a quoted note's date in the same text", () => {
    expect(fails('You wrote "flooded out on turn six".', notes)).toContain("quotedNote");
  });

  it("asks a card count for its denominator", () => {
    expect(fails("Cut 2 cards for this.", notes)).toContain("denominator");
    expect(fails("Swaps 2 of 99 cards.", notes)).toEqual([]);
  });

  it("catches a sign after punctuation, not only after a space", () => {
    expect(fails("delta=-2 across the log", notes)).toContain("noNet");
  });

  it("does not read a range as a sign", () => {
    expect(fails("Games ran 8-10 turns.", notes)).toEqual([]);
  });

  it("does not read a hyphenated word as a sign", () => {
    expect(fails("A two-mana ramp spell fits the curve.", notes)).toEqual([]);
  });

  it("passes a note quoted verbatim and catches one that is not", () => {
    expect(fails('On 2026-09-01 you wrote "flooded out on turn six".', notes)).toEqual([]);
    expect(fails("On 2026-09-01 you wrote “flooded out on turn six”.", notes)).toEqual([]);
    expect(fails('You wrote "flooded on turn six".', notes)).toContain("quotedNote");
  });

  // ── The addendum's forms and rules (C-fix, audit findings 6 and 7) ─────────────────────
  it("accepts a possessed denominator and a word numerator, as Design's samples write them", () => {
    expect(fails("4 of your 99 cards draw anything.", [])).toEqual([]);
    expect(fails("It paid off in none of the 9 games.", [])).toEqual([]);
    expect(fails("It is one of 11 cards at four or more.", [])).toEqual([]);
    expect(fails("It is in 11 cards.", [])).toContain("denominator");
  });

  it("drops a rationale that names a bracket", () => {
    expect(fails("This keeps the deck in its bracket.", [])).toContain("noBracketClaim");
    expect(fails("A fine card for Optimized tables.", [])).toContain("noBracketClaim");
    expect(fails("The core of the deck stays.", [])).toEqual([]);
  });

  it("drops a rationale that promises a result, and keeps a record already logged", () => {
    for (const claim of ["This swap will win you games.", "You would lose less.", "It makes the deck stronger.", "Win more with it."]) {
      expect(fails(claim, [])).toContain("noResultClaim");
    }
    expect(fails("You won 1 of 5 games.", [])).toEqual([]);
  });

  it("reads the player's own quoted words as theirs, not the model's claim", () => {
    const intent = [{ text: "I want to win late", date: null }];
    expect(fails("You said \u201cI want to win late\u201d.", intent)).toEqual([]);
  });

  it("holds a quoted note to its own day, not one that contains it", () => {
    const sept = [{ text: "stuck on lands", date: "6 Sep" }];
    expect(fails('On 6 Sep you wrote "stuck on lands".', sept)).toEqual([]);
    expect(fails('On 16 Sep you wrote "stuck on lands".', sept)).toContain("quotedNote");
  });

  it("catches the word bracket at a sentence start, and lets ordinary prose about winning through", () => {
    expect(fails("Bracket 3 stays within reach.", [])).toContain("noBracketClaim");
    expect(fails("It gives the deck a second way to win.", [])).toEqual([]);
    expect(fails("A blocker that is hard to beat.", [])).toEqual([]);
  });

  it("holds a count spelled as a word to a denominator too", () => {
    expect(fails("It lost three games.", [])).toContain("denominator");
    expect(fails("It lost three of 5 games.", [])).toEqual([]);
    expect(fails("The one card that matters.", [])).toEqual([]);
  });

  // The prompt (`tuning/prompt.ts`) asks the model to quote the intent or this run's notes
  // whole, in quotation marks, or cite a part WITHOUT them — but Design's own format for a
  // part-quote is unquoted either way, so a model that puts quote marks around a genuine part
  // anyway is repaired to the bare form rather than dropped.
  it("repairs a genuine part-quote wrapped in quotation marks to its bare form, rather than dropping it", () => {
    const intent = [{ text: "grind the table out and win late", date: null }];
    expect(presentationFailures('You said “win late” this game.', intent))
      .toEqual({ broken: [], text: "You said win late this game." });
    const notesField = [{ text: "swap out Sol Ring for more removal", date: null }];
    expect(presentationFailures('You asked for "more removal" this run.', notesField))
      .toEqual({ broken: [], text: "You asked for more removal this run." });
  });

  it("still catches a quote that names no source at all, whole or part", () => {
    const intent = [{ text: "grind the table out and win late", date: null }];
    const out = presentationFailures('You said “go wide with tokens”.', intent);
    expect(out.broken).toContain("quotedNote");
    // Not repaired — nothing to repair it to — the broken caller never uses `text`.
    expect(out.text).toBe('You said “go wide with tokens”.');
  });
});

