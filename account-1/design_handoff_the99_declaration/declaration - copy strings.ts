// src/lib/copy/deck-analysis.ts — Round 3 additions (the declaration).
// Adds only, with two stated exceptions at the bottom (both consequences of this round).
//
// Rules this block is written under:
//   · a declaration is made on ONE DECK STATE — the DRAFT while it is being edited, and the
//     version once a commit copies it there. The analysis reads deck_cards and
//     decks.declaredBracket in one snapshot (load.ts:77), so a re-analysis produces NO version.
//     The app never revisits a committed answer, never carries one forward, and NEVER QUOTES
//     THE PLAYER ("you said…")
//   · the app never argues with a declaration and never writes one the player did not make
//   · a bracket is named by NAME ALONE. Every string below is rendered beside that bracket's
//     mark, and the mark is the numeral — "Optimized (4)" prints it twice. The sole
//     exception is reasoning.title, a heading with no mark beside it.
//   · no copy may imply a tutor COUNT matters — the threshold is the combo's piece count,
//     and the "too many tutors" clause was deleted in October 2025
//   · a later version reading differently is a DIFF between two versions — not a movement, not
//     a fault, and not addressed to anyone. No direction, no control, no second person.

// Names come from deckAnalysisCopy.brackets (WotC's, verbatim) and are never re-typed here.
const bracketLabel = (n: BracketNumber) => BRACKET_NAMES[n];

export const declarationCopy = {
  ask: {
    // Round 0's line, verbatim. Round 3 keeps Round 0's WORDS and Round 2's PLACE.
    lead: "Pick one so pods know what to expect.",
    // Chip labels are the bracket NAME alone — the mark beside them draws the numeral.
    // Names come from deckAnalysisCopy.brackets (WotC's, verbatim), never re-typed here.
    //
    // R5: there is NO skip. Two chips are the entire control. A player who says nothing leaves
    // this version unanswered, and a later version with a range is asked on its own account —
    // so there is no "skipped" copy, no "say which", and nothing to store for a refusal.
  },

  declared: {
    // A statement of record, scoped to the version it was made on — NOT testimony.
    // R5 removed "You said X. That is what this deck says at a table.": the app does not
    // quote the player, and a declaration made on v1 is never stale, because it was never a
    // claim about any version but v1.
    // "for version n" ONLY once a commit exists to name. On a draft the clause is omitted —
    // naming a version that does not exist is the error R5 made in prose.
    line: (declared: BracketNumber, version: number | null) =>
      version === null
        ? \`Declared \${bracketLabel(declared)}.\`
        : \`Declared \${bracketLabel(declared)} for version \${version}.\`,
    // Inline at the end of that sentence. Edits THIS version's answer while it is current;
    // it is deliberately one word, and deliberately not "change what you said".
    change: "change",
    permitsBelow: (permitsPhrase: string, isTopRange: boolean) =>
      isTopRange
        ? \`Your cards permit \${permitsPhrase} — the two have no card limits between them.\`
        // 1/2 DO differ by a card limit (the extra-turn limit), per the R1 audit.
        : \`Your cards permit \${permitsPhrase} — the two differ in what you are trying to do.\`,
  },

  // THE DRAFT moved outside what is declared on it, with no commit since (§A5).
  //
  // NOT a comparison: a diff needs two settled readings and a draft is one moving one, so
  // versionChange.line would have to print a version number that has no value. The question
  // itself changed — Core is not an answer to "4 or 5" — so the draft is UNANSWERED rather
  // than wrongly answered, and ask.lead + the chips follow this line whenever the draft's
  // reading is a range. On a single-bracket draft there is nothing to ask and it stands alone.
  //
  // PASSIVE ON PURPOSE. "was declared" reports the record; "you said" would put the sentence
  // back in the player's mouth. And the superseded answer is STATED rather than deleted — a
  // declaration vanishing unexplained is worse than being asked again.
  // PRECEDENCE: suppressed entirely whenever versionChange is on screen. A commit refuses to
  // copy an out-of-range declaration, so both are true and both say the same thing — and the
  // version row is the stronger statement (old declaration, new reading, a date).
  //   if (versionChange) row; else if (draftMovedOut) line; then ask if permits.length > 1.
  draftMovedOut: {
    line: (declared: BracketNumber) =>
      \`\${bracketLabel(declared)} was declared, and this deck has since moved out of it.\`,
    // No control of its own.
  },

  // Replaces the whole R2–R4 `drift` block. COMMITTED versions only.
  //
  // WITHDRAWN with it: "You said X", "Your last changes moved this deck past that",
  // "brought this deck inside", "Your declaration stands as you left it",
  // "change what you said", and the up/down sentence pair. All of them existed to soften a
  // claim the app should never have been making — that the player's standing statement had
  // gone out of date. A declaration is made ON A VERSION, so nothing goes out of date.
  //
  // What is left is a diff. One sentence, no direction (a comparison of two readings cannot
  // be false in one direction), no control, no second person. Cardinality picks one verb.
  versionChange: {
    markLabelPrevious: (v: number) => \`version \${v}\`,
    markLabelCurrent: "this version",
    line: (
      current: { phrase: string; isRange: boolean },
      previous: { version: number; phrase: string; declared: BracketNumber | null },
    ) => {
      const now = current.isRange
        ? \`This version permits \${current.phrase}.\`
        : \`This version reads as \${current.phrase}.\`;
      const then = previous.declared === null
        ? \`Version \${previous.version} read as \${previous.phrase}.\`
        : \`Version \${previous.version} read as \${previous.phrase} and was declared \${bracketLabel(previous.declared)}.\`;
      return \`\${now} \${then}\`;
    },
    // No control of any kind. If `current.isRange`, ask.lead + the chips follow underneath,
    // because this version has never answered a question — that is not a re-ask.
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

// Live region, on a version with a lean and no declaration:
//   "Analysis ready. Your cards permit Optimized or cEDH. Your tutors can find both
//    halves of one combo, which puts this past Upgraded. Which of the two this is, is
//    yours to say."
// On a COMMITTED version that reads differently from the last one:
//   "Analysis ready. This version reads as Upgraded. Version 1 read as Optimized or cEDH and
//    was declared cEDH."
// On a DRAFT whose reading has moved outside what is declared on it (§3a) — the ask returns,
// so the announcement ends on the question rather than on the comparison:
//   "Analysis ready. Your cards permit Optimized or cEDH. Core was declared, and this deck has
//    since moved out of it. Which of the two this is, is yours to say."
