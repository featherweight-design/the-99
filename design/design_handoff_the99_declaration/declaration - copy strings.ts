// src/lib/copy/deck-analysis.ts — Round 3 additions (the declaration).
// Adds only, with two stated exceptions at the bottom (both consequences of this round).
//
// Rules this block is written under:
//   · the app never argues with a declaration and never writes one the player did not make
//   · a bracket is named by NAME ALONE. Every string below is rendered beside that bracket's
//     mark, and the mark is the numeral — "Optimized (4)" prints it twice. The sole
//     exception is reasoning.title, a heading with no mark beside it.
//   · no copy may imply a tutor COUNT matters — the threshold is the combo's piece count,
//     and the "too many tutors" clause was deleted in October 2025
//   · drift reports a movement the PLAYER caused; it never grades, warns, or offers to fix

// Names come from deckAnalysisCopy.brackets (WotC's, verbatim) and are never re-typed here.
const bracketLabel = (n: BracketNumber) => BRACKET_NAMES[n];

export const declarationCopy = {
  ask: {
    // Round 0's line, verbatim. Round 3 keeps Round 0's WORDS and Round 2's PLACE.
    lead: "Pick one so pods know what to expect.",
    // Chip labels are the bracket NAME alone — the mark beside them draws the numeral.
    // Names come from deckAnalysisCopy.brackets (WotC's, verbatim), never re-typed here.
    skip: "skip this",
    // Shown once skipped, and after that forever. Not "not now": the skip is permanent and
    // the copy must not promise a later ask.
    skipped: "Not declared. The range stands on its own, and we will leave it there.",
    volunteer: "say which",
  },

  declared: {
    // "at a table" rather than "to other players": the declaration's value is that it is the
    // sentence the player says out loud before a game.
    line: (declared: BracketNumber) =>
      \`You said \${bracketLabel(declared)}. That is what this deck says at a table.\`,
    // Sits INLINE at the end of that sentence, not on its own row.
    change: "change",
    // The face resolves to the declared bracket, so the permitted range moves here.
    permitsBelow: (permitsPhrase: string) =>
      \`Your cards permit \${permitsPhrase} — the two have no card limits between them.\`,
  },

  // declaredOutsidePermits.
  //
  // ONE cause. A declaration is only ever 1, 2, 4 or 5, so drift is always a deck crossing
  // out of the range it was declared inside: 1|2 -> [4,5], or 4|5 -> [1,2]. It is reached by
  // the player editing, committing and re-analysing — so the sentence credits them with the
  // movement, which is both true and why the state cannot read as a scolding.
  //
  // REMOVED in R2: a second "the reader overruled the lean" sentence. Declaring 5 where the
  // lean said 4 is a declaration INSIDE [4,5] — it can never set this flag.
  drift: {
    markLabelDeclared: "you said",
    markLabelPermits: "your cards now permit",
    line: (declared: BracketNumber, permitsPhrase: string) =>
      \`You said \${bracketLabel(declared)}. Your last changes moved this deck past that — it now permits \${permitsPhrase}.\`,
    // The load-bearing line of the state. The app re-read the deck; it did not re-declare it.
    stands: "Your declaration stands as you left it.",
    change: "change what you said",
    // Deliberately absent: any string meaning "update", "fix", "out of date", "no longer
    // accurate", or "we recommend". The analysis is automated and the declaration is not;
    // a control that copies one into the other makes the app the author of the player's line.
  },

  // §6.1b as amended on feat/combo-decides. The lean explains a RESOLVED verdict.
  lean: {
    // Replaces Round 2's reserved ringed "≈", and R1's "Why this resolved here": the label
    // names what the block is doing in the words a reader would use to ask for it.
    label: "How we determined this bracket",
    reachable: (a: string, b: string) =>
      \`Your tutors can find both halves of \${a} + \${b}, so the pair is part of the plan rather than a draw away. That is what puts this past \${bracketLabel(3)}.\`,
    drawOnly: (a: string, b: string) =>
      \`This deck holds \${a} + \${b}, and nothing in it searches for either half — the pair is a draw away. That is what keeps this at \${bracketLabel(3)}.\`,
    open: "see the reasoning",
  },

  // The third body of Round 2's receipt modal. One chrome, now three bodies.
  reasoning: {
    // Number in the heading, name in the qualifier — the same rule, in the order a heading wants.
    title: (n: BracketNumber) => \`How we determined bracket \${n}\`,
    qualifierReachable: (n: BracketNumber) => \`\${BRACKET_NAMES[n]} · both halves findable\`,
    qualifierDrawOnly: (n: BracketNumber) => \`\${BRACKET_NAMES[n]} · neither half findable\`,
    // NOT "2 of 2" — a fraction invites a reader to lower a numerator that is not a limit.
    threshold: (n: BracketNumber) =>
      \`A deck reaches \${bracketLabel(n)} when its tutors can cover every piece of one combo — one card that finds both halves, or two that each find a different one.\`,
    piece: (i: number) => \`half \${i === 1 ? "one" : "two"} · in this list\`,
    foundBy: "found by",
    // An empty slot reads as a clean deck; this sentence does not.
    foundByNone: "nothing in this deck searches for it",
    tutorsAreNotALimit:
      "The threshold is this combo's own two halves. How many tutors a deck runs is a fact and never a limit — the count is in the findings, with the rest of what is in this deck.",
    assembled: "assembled in this list",
    source: "Commander Spellbook",
  },

  // ── The Round 2 strings this round changes, and why ─────────────────────────────────
  climbOverrides: {
    // Was: "…it is yours to declare." + a ringed "?". The ask now lives in the verdict block,
    // so the rung pointed at it instead of asking a second time.
    declare:
      "Nothing to change. Four and five share their card limits — the difference is how you play it, and the answer is in the block above.",
    // Was "no cap" beside the combo figure on the "your cards" rung.
    comboReachable: "reachable",
    // Rung labels now carry numbers: "Upgraded", "Optimized", "cEDH".
  },
} as const;

// Live region, on a deck with a lean and no declaration:
//   "Analysis ready. Your cards permit Optimized or cEDH. Your tutors can find both
//    halves of one combo, which puts this past Upgraded. Which of the two this is, is
//    yours to say."
// On a drifted deck, the movement is announced and the declaration is not:
//   "Analysis ready. You said Core. Your last changes moved this deck past that — it now
//    permits Optimized or cEDH."
