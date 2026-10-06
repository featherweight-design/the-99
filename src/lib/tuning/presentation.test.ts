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

  // Round-1 review findings on the repair logic, each pinned as the exact shape that defeated
  // an earlier version.
  describe("repair logic — round-1 review findings", () => {
    it("catches a fabrication wrapped in MIXED straight/curly quote marks, both ways", () => {
      const intent = [{ text: "go wide", date: null }];
      expect(fails('You said “never drew".', intent)).toContain("quotedNote");
      expect(fails('You said "never drew”.', intent)).toContain("quotedNote");
    });

    it("masks a verified partial quote from the result/bracket claim checks, not only a whole one", () => {
      const intent = [{ text: "I want a stronger deck", date: null }];
      // "stronger" is a genuine part of the intent, quoted — must be repaired and kept, never
      // flagged noResultClaim just because the claim word still sits inside the quote marks.
      expect(presentationFailures('You said “stronger”.', intent))
        .toEqual({ broken: [], text: "You said stronger." });
    });

    it("rejects a span that merely CONTAINS a real fragment plus fabricated words", () => {
      const intent = [{ text: "go wide", date: null }];
      // "go wide" is genuinely part of the intent; "go wide with dragons" is not — the source
      // must contain the span, never the reverse.
      expect(fails('You said “go wide with dragons”.', intent)).toContain("quotedNote");
    });

    it("never partially matches a DATED game note — only the intent/notes may be cited in part", () => {
      const notes = [{ text: "flooded out on turn six", date: "2026-09-01" }];
      expect(fails('On 1 Sep: "flooded out".', notes)).toContain("quotedNote");
    });

    it("repairs a standalone partial quote without corrupting a separate WHOLE quotation of a source containing its own embedded quote marks", () => {
      const intent = [{ text: 'I said "keep lands"', date: null }];
      const out = presentationFailures(
        'You said “I said "keep lands"”, and "keep lands".',
        intent,
      );
      expect(out.broken).toEqual([]);
      // The whole quotation is untouched, verbatim, embedded quote marks and all; only the
      // separately quoted fragment after it is repaired to its bare form.
      expect(out.text).toBe('You said “I said "keep lands"”, and keep lands.');
    });
  });

  // Round-2 review findings, each pinned as the exact shape that defeated the round-1 version.
  describe("repair logic — round-2 review findings", () => {
    it("still catches a fabricated quote sitting right after a whole quotation, and repairs a genuine one too", () => {
      const notes = [{ text: 'I said "keep lands"', date: null }];
      expect(fails('You said "I said "keep lands"", and "never drew".', notes)).toContain("quotedNote");
      const out = presentationFailures('You said "I said "keep lands"", and "keep lands".', notes);
      expect(out.broken).toEqual([]);
      expect(out.text).toBe('You said "I said "keep lands"", and keep lands.');
    });

    it("never rejects a valid whole quotation for omitting a DIFFERENT note's date, just because that note's words happen to sit inside it", () => {
      const notes = [
        { text: 'I said "keep lands"', date: "1 Sep" },
        { text: "keep lands", date: "2 Sep" },
      ];
      expect(fails('On 1 Sep: "I said "keep lands"".', notes)).toEqual([]);
      // Same check, sources in the other order.
      const reordered = [notes[1], notes[0]];
      expect(fails('On 1 Sep: "I said "keep lands"".', reordered)).toEqual([]);
    });

    it("keeps a model claim outside two IDENTICAL sources' shared quote, instead of corrupting it via stale offsets", () => {
      const both = [{ text: "keep lands", date: null }, { text: "keep lands", date: null }];
      expect(fails('You said "keep lands"; stronger.', both)).toContain("noResultClaim");
    });

    it("still catches a result claim the model built AROUND a single verified word, not only one wholly inside player text", () => {
      const intent = [{ text: "grind the table out and win late", date: null }];
      const out = presentationFailures('This will "win" more.', intent);
      expect(out.broken).toContain("noResultClaim");
      expect(out.text).toBe("This will win more.");
      // The exemption still holds for a claim wholly inside the player's own words.
      const wholeIntent = [{ text: "I want to win more games", date: null }];
      expect(presentationFailures('You said "win more" games.', wholeIntent).broken).not.toContain("noResultClaim");
    });
  });

  // Round-3 review findings, each pinned as the exact shape that defeated the round-2 version.
  describe("repair logic — round-3 review findings", () => {
    it("catches a fabricated outer quote with a genuine inner quote nested inside it", () => {
      const intent = [{ text: "go wide", date: null }];
      expect(fails('You said “please "go wide" with dragons”.', intent)).toContain("quotedNote");
    });

    it("repairs a genuine partial quote that itself contains a nested quote, preserving the nested marks", () => {
      const notes = [{ text: 'please cut "Sol Ring" for more removal', date: null }];
      const out = presentationFailures('You asked to “cut "Sol Ring"”.', notes);
      expect(out.broken).toEqual([]);
      expect(out.text).toBe('You asked to cut "Sol Ring".');
    });

    it("checks percentage, net and denominator against the REPAIRED text, not the still-quoted original", () => {
      const notes = [{ text: "swap two cards for removal", date: null }];
      expect(fails('Cut "two" cards for this.', notes)).toContain("denominator");
      const rateNotes = [{ text: "this improves our win a lot this run", date: null }];
      expect(fails('Better "win" rate.', rateNotes)).toContain("noPercentage");
    });

    it("catches a claim whose two halves overlap — one masked, one not — that a single non-overlapping scan would miss", () => {
      const intent = [{ text: "I think I will win eventually", date: null }];
      const out = presentationFailures('This swap "will win" more games.', intent);
      expect(out.broken).toContain("noResultClaim");
      expect(out.text).toBe("This swap will win more games.");
    });

    it("rejects an ambiguous overlap between two sources' own text rather than merging or corrupting it", () => {
      const sources = [{ text: 'foo"bar', date: null }, { text: 'bar" baz', date: null }];
      expect(fails('"foo"bar" baz"', sources)).toContain("quotedNote");
    });
  });
});

