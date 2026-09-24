// deckAnalysisCopy.bracketsSheet — proposed. Figures are NOT here: cells use climb.allowed(n) / climb.noCap
// from the limit constants in src/lib/bracket/rules.ts.
export const bracketsSheet = {
  open: "see all brackets",
  title: "All brackets",
  aside: "as we apply them",
  close: "Close all brackets",
  lead:
    "Four rules separate the first three brackets. Here is each one in our words, with what a decklist can "
    + "and cannot tell us. Wizards' post, linked below, has theirs.",
  ruleColumn: "rule",
  readings: {
    gameChangers: "Counted card by card against Wizards' published Game Changer list.",
    massLandDenial: null,
    extraTurns:
      "At Core and Upgraded the rule is about chaining extra turns, and a decklist cannot show that. We count "
      + "them and give no verdict. Only a two-card combo that loops turns puts a deck past Upgraded.",
    twoCardCombos:
      "Upgraded allows them late in a game. A list cannot show when a combo lands, so we ask whether this deck "
      + "can find both halves rather than draw into them. If it can, that is Optimized.",
  },
  tutors: {
    label: "Tutors", // findings.labels.tutors
    chip: "no limit", // findings.noLimit
    scope: "at any bracket",
    reading:
      "Wizards removed the tutor limit in October 2025, finding that tutors are not all alike. We count them in "
      + "the findings. They move no bracket on their own: they only tell us whether a combo can be found rather "
      + "than drawn.",
  },
  high: {
    name: "Optimized · cEDH",
    reading:
      "No card limits on any of the four. Only the banned list applies, and which of the two a deck is, is how you play it.",
  },
  // Foot: BRACKET_RULES_SOURCE.title, provenance.source(BRACKET_RULES_SOURCE.name), provenance.rulesChecked(date).
} as const;
