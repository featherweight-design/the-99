// src/lib/copy/deck-analysis.ts — Round 2 additions (the verdict).
// Adds only. Nothing here redefines a Round 0 string; deckAnalysisCopy.brackets,
// .verdict.* and .chip.* stand as written.
//
// Rules this block is written under:
//   · every figure carries its denominator in the same string as the figure
//   · the rules text is QUOTED, never paraphrased — quote and reading are separate
//     constants so a copy edit cannot silently rewrite a rule
//   · nothing grades: no "fails", no "too many", no "violation" in player-facing copy
//   · every outside source is named and linked

export const verdictCopy = {
  climb: {
    heading: "Where you sit, and what moves you",
    // Three rungs only. The brackets a deck is nowhere near are not drawn, which is
    // what removed the repeated "ruled out — 2 game changers" line.
    roleBelow: "to drop to here",
    roleHere: "where your cards are",
    roleHereShort: "your cards",      // 390
    roleAbove: "already allowed",
    roleDeclare: "to claim this",     // the 4–5 rung only

    // What would take you down. Names the cards when there are one or two, the count
    // when there are more. Phrased as a fact about the limit, never as advice.
    dropCut: (n: number, rule: string) => `Cut ${n} ${rule}, only ${n} fewer allowed.`,
    dropCutGameChangers: (cut: number, allowed: number) =>
      `Cut ${cut} game changers, only ${allowed} allowed.`,
    dropCutNamed: (card: string, why: string) => `Cut ${card} — ${why}.`,

    aboveAllowed: "Nothing rules it out. It permits more than this deck uses.",
    aboveNoLimits: "No card limits beyond the banned list.",
    // The 4–5 rung. The only ringed "?" left on the climb.
    declare:
      "Nothing to change. Four and five share their card limits — the difference is how you play it, and it is yours to declare.",

    // Allowances, beside the figure, in --fg-faint. Short on purpose: the rung already
    // names the bracket, so "3 allowed" cannot mean anything else.
    allowed: (n: number) => `${n} allowed`,
    // Where the rule reports a figure without capping it (extra turns at 2 and 3),
    // AND on any rung at bracket 4 or 5, which cap nothing at all. Ruled 2026-09-22:
    // the canvas drew "3 allowed" beside a bracket-4 figure, which is bracket 3's
    // allowance on a rung that is not bracket 3's. `limits` covers 1-3 only.
    // Optional tightening, not shipped: at 4 and 5 EVERY figure reads this, so the
    // slot could be empty per figure and the rung could say it once.
    noCap: "no cap",

    // The one link out of the climb. The full four-rules-by-three-brackets reference
    // lives behind it; it is the only place they all appear together.
    allBrackets: "see all brackets",
  },

  findings: {
    heading: "What is in this deck",
    labels: {
      gameChangers: "Game changers",
      landDenial: "Mass land denial",
      extraTurns: "Extra turns",
      combos: "Two-card infinites",
      tutors: "Tutors",
    },
    // A zero gets this and no control. An affordance onto nothing is worse than none.
    empty: "nothing in the list",
    // Tutors only. The clause was deleted in October 2025, so the count is a fact and
    // the chip says so where the figure is, not in a footnote.
    noLimit: "no limit",
    // Truncation in the tile / row. Never a bare "+3" without names before it.
    names: (shown: string[], rest: number) =>
      rest > 0 ? `${shown.join(" · ")} · +${rest}` : shown.join(" · "),
    comboPair: (a: string, b: string) => `${a} + ${b}`,

    // The control. An arrow, not a caret: it opens a modal, and a caret promises an
    // expand. Singular when there is one card.
    open: (n: number) => (n === 1 ? "see the card" : "see the cards"),
    openCombo: "see the combo",
    openAria: (n: number, rule: string) => `Show the ${n} ${rule} in this deck`,
  },

  receipt: {
    // One modal, two bodies. Header is glyph, name, count, close in both.
    title: (rule: string) => rule,
    // Combo body. Steps and tags are Spellbook's own wording, never ours.
    manaNeeded: "Mana needed",
    inThisDeck: "In this deck",
    bothPresent: "both copies present",
    steps: "Steps",
    // "intentional" is not inferable and is deliberately ignored. The foot states what
    // we know and stops; it must not appear to have answered the other half.
    assembled: "assembled in this list",
    // The card modal stacks over the receipt; dismissing it returns to the receipt.
    // Both labels ship because a reader on the phone can see both sheets at once and
    // must be able to tell which × they are pressing.
    closeCardAria: "Close this card",
    closeReceiptAria: (rule: string) => `Close ${rule}`,
    spellbook: "Commander Spellbook",

  },

  ranges: {
    intentLow:
      "Nothing in the 99 pushes past Core. Which of the two this is, is yours to say — an exhibition deck is a promise about how you play it, not a fact about the cards.",
    intentHigh:
      "Bracket 3 only permits up to three game changers. Four and five have no card limits between them, so which one this is, is how you play it.",
    intentHighShort:
      "Bracket 3 only permits up to three game changers. Which of the two this is, is how you play it.", // 390
    singleExact: (ruledOut: string) => `${ruledOut} Nothing else in the 99 reaches further.`,
    declareGlyphAria: "Yours to declare",
    // NOT SHIPPING pending the spec amendment: permits [3,4]. If it stays, a deck at 3
    // with a two-card infinite needs a second glyph meaning "not knowable from a list",
    // distinct from the declaration "?" — see the canvas, section 1a.
  },

  population: {
    // Below a hairline in the verdict block's foot, so it can never look like a reason.
    label: "What other players say",
    // The denominator is INSIDE the sentence and cannot be dropped by a layout change.
    // Never a bare "3,884 decks": only ~22.4% of decks declare a bracket at all.
    line: (declared: number, commander: string, n: number, name: string) =>
      `Of the ${declared.toLocaleString()} ${commander} decks that declared a bracket, ${n.toLocaleString()} said ${name}.`,
    // The 27 commanders with no counts. Absent, never zero — a zero reads as
    // "nobody plays this", which is a different and false claim.
    absent: (commander: string) => `EDHREC has no declared brackets for ${commander}.`,
  },

  provenance: {
    // Collapsed by default. Read once, mid-argument.
    toggle: "How we make these decisions",
    lead:
      "Four things decide a bracket. One of them is a published list, so we can be exact. The other three we work out by reading your cards — here is where each answer comes from, and what it might miss.",

    // One row per finding: where it comes from, then what it misses and why.
    // This REPLACES the raw coverage strings (`2 sources`, `no misses among the 56`,
    // `known miss: …`), which are engineering notes rather than sentences.
    gameChangers: {
      from: "Wizards publishes the list, and we check your 99 against it. This count is exact.",
      source: "the Commander Format Panel's bracket rules",
      // No "misses" line, deliberately. It is the contrast that makes the other three legible.
    },
    landDenial: {
      from: "There is no official list, so we use two community-maintained ones. Between them they name 23 of the 24 cards we would expect.",
      // SLOT: engineering supplies both names and URLs with the coverage constants.
      sources: ["source one", "source two"],
      misses: "We miss Wave of Vitriol, which destroys everyone's lands without saying so in words we can match.",
    },
    extraTurns: {
      from: "We read the rules text. 56 cards say they give you an extra turn, and we find all of them.",
      sources: ["Scryfall", "source two"], // SLOT: second name from code
      misses: "We miss turns made by one card looping on itself, like Nexus of Fate.",
    },
    combos: {
      from: "We use Commander Spellbook's index of known combos.",
      sources: ["Commander Spellbook"],
      misses: "We miss combos needing three or more cards, and ones that only work with a particular printing.",
    },

    // Why the panel exists at all. Without this the four rows read as trivia.
    why: "If someone at the table disagrees with your bracket, the argument is usually about one of these four. Knowing which one we are least sure of is how you settle it.",
  },

  live: {
    ready: (verdict: string) => `Analysis ready. Your cards permit ${verdict}.`,
    readyWithReason: (verdict: string, reason: string) =>
      `Analysis ready. Your cards permit ${verdict}. ${reason}`,
    receiptOpened: (n: number, rule: string) => `${n} ${rule} shown.`,
  },
} as const;
