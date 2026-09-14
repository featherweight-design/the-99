// One case per way this parser has already been wrong.
//
// `check:copy-drift` is a guard, and the thing that makes a guard worthless is
// not being absent — it is passing. Its first version printed "No design table
// quotes a form the code stopped emitting" over rows that plainly did, and four
// separate causes were found by review rather than by the check. Each of those
// causes is a test here, written as the shape that defeated it.
//
// These are NOT tests of the whole command. They are tests of the reading: what
// comes out of a module, what comes out of a table, and what two strings reduce
// to when they are compared. The command's own end-to-end proof is running it.
import { describe, expect, it } from "vitest";
import { jsxText, literals, marks, quotations, words } from "./copy-drift.mjs";

describe("literals", () => {
  it("keeps a nested template whole instead of closing on its inner backtick", () => {
    // The shape from `commander-discovery.ts`. A scanner that closes a backtick
    // string on the next backtick ends the OUTER string here and reads the rest
    // of the file inside-out, so everything after it is lost.
    const src = "const a = `${x ? `${n} commanders` : \"none\"} · ranked by fit`;\n" +
      'const after = "this must still be found at all";';
    const out = literals(src);
    expect(out).toContain("${} · ranked by fit");
    expect(out).toContain("this must still be found at all");
  });

  it("folds a sentence assembled across a plus into one string", () => {
    // `deck-versioning.ts` builds `discard.consequence` this way. A table quotes
    // the sentence whole, so no single fragment could ever match it.
    const src = 'const s = "The deck goes back to v1: " +\n  "99 cards, and nothing else.";';
    expect(literals(src)).toContain("The deck goes back to v1: 99 cards, and nothing else.");
  });

  it("does not fold two arguments that merely sit side by side", () => {
    // The counter-case: `plural(n, "card", "cards")` is two strings, not one.
    expect(literals('plural(n, "card", "cards")')).toEqual(["card", "cards"]);
  });

  it("decodes every escape, not only the em dash", () => {
    // A table holds the rendered character, so an escape left in the key means
    // the two can never be compared. `game-log.ts` writes `’` and `·`.
    expect(literals('const s = "the deck\\u2019s own \\u00b7 mark";')).toContain(
      "the deck’s own · mark",
    );
  });

  it("ignores a string that only exists in a comment", () => {
    const src = '// const dead = "a sentence nobody ships any more at all";\nconst live = "kept";';
    expect(literals(src)).toEqual(["kept"]);
  });
});

describe("jsxText", () => {
  it("joins a sentence split across markup", () => {
    // `rec-card.tsx` renders the lead inside a <strong> and the rest after it.
    // Read node by node this is two fragments and never the sentence a table
    // quotes.
    const src =
      '<div><strong>No synergy data</strong>{" "}' +
      "— EDHREC does not track this commander.</div>";
    expect(jsxText(src).some((t) => /No synergy data — EDHREC does not track/.test(t))).toBe(true);
  });

  it("reads a plain text node, entities resolved", () => {
    // `review-screen.tsx` draws its label this way: not a string literal at all,
    // so no amount of literal-scanning would ever see it.
    expect(jsxText("<span>cards matched &amp; ready to import now</span>")).toContain(
      "cards matched & ready to import now",
    );
  });
});

describe("quotations", () => {
  it("pairs delimiters by parity, not by searching for the next one", () => {
    // THE bug, in the exact shape that produces it. A search-based matcher
    // cannot pair `v1` — too short for its window — so it advances one character
    // and re-pairs from the NEXT backtick. The gap that follows is long enough
    // to match, so the matcher returns the gap AND consumes the opening
    // delimiter of the real quotation, which is then never seen at all.
    //
    // A short span with a short gap after it does not reproduce this: the
    // matcher re-syncs by luck. It has to be a short span, then a long gap.
    const line = "| `v1` | a gap long enough to be matched | `the real quotation, and more` |";
    const out = quotations(line);
    expect(out).toContain("the real quotation, and more");
    expect(out).not.toContain(" a gap long enough to be matched ");
  });

  it("rejoins a span that wraps across two lines", () => {
    const src = "prose `a quotation that runs past the end of\n  its own line` and then more";
    expect(quotations(src)).toContain("a quotation that runs past the end of its own line");
  });

  it("rejoins a wrapped DOUBLE-quoted span too", () => {
    // Parity was tracked on the backtick alone, so this came out as two
    // fragments and was never compared.
    const src = 'note ("the header keeps New deck at zero — the\n   toolbar does not change")';
    expect(quotations(src)).toContain(
      "the header keeps New deck at zero — the toolbar does not change",
    );
  });

  it("takes a quotation longer than 240 characters", () => {
    // An upper bound drops exactly the long quotations most likely to be a whole
    // sentence, and a dropped span is a silent pass.
    const long = "w".repeat(300);
    expect(quotations(`| x | \`${long}\` |`)).toContain(long);
  });

  it("does not let one stray delimiter swallow the rest of the file", () => {
    // The cost of tracking parity: an unbalanced mark would otherwise join every
    // following line into one span. A blank line ends the run.
    const src = 'a stray " mark here\n\n| x | `a quotation long enough to compare` |';
    expect(quotations(src)).toContain("a quotation long enough to compare");
  });
});

describe("words and marks", () => {
  it("reduces a table's placeholders and the code's interpolation to the same holes", () => {
    expect(words("${n} cards matched")).toBe(words("{n} cards matched"));
    expect(words("[N] cards matched")).toBe(words("${qty} cards matched"));
    expect(words("… is on 3 lists")).toBe(words("${name} is on 3 lists"));
  });

  it("treats a curly and a straight apostrophe as the same word", () => {
    expect(words("the deck’s total")).toBe(words("the deck's total"));
  });

  it("separates two sentences that differ only in punctuation", () => {
    const dash = "locks this list as v1 — nothing about the deck changes";
    const colon = "locks this list as v1: nothing about the deck changes";
    expect(words(dash)).toBe(words(colon)); // same sentence
    expect(marks(dash)).not.toBe(marks(colon)); // different punctuation
  });

  it("does not count a hole's own marks as punctuation", () => {
    // `…` reduced to three full stops would read as punctuation the code never
    // ships, and every quotation using it would become a finding.
    expect(marks("… is on 3 lists")).toBe(marks("${name} is on 3 lists"));
  });
});
