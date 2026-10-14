// deckAnalysisCopy.bracketsSheet — proposed (R3: no aside, no reader marking, five bracket columns). Figures are NOT here: cells use climb.allowed(n) / climb.noCap
// from the limit constants in src/lib/bracket/rules.ts.
//
// R2 (Hugh, 2026-09-24): each rule keeps our reading and adds ONE quoted Wizards line. Quotes are verbatim and
// each names the post that carries it (audit finding 3). The Feb 2026 post in BRACKET_RULES_SOURCE does not carry
// them as text; they come from the two posts below. Proposed additions to src/lib/bracket/sources.ts:
//   BRACKETS_INTRO_SOURCE  = { name: "Wizards of the Coast", title: "Introducing Commander Brackets Beta",
//     url: "https://magic.wizards.com/en/news/announcements/introducing-commander-brackets-beta", published: "2025-02-11" }
//   BRACKETS_OCT25_SOURCE  = { name: "Wizards of the Coast", title: "Commander Brackets Beta Update – October 21, 2025",
//     url: "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025", published: "2025-10-21" }
type Quote = { text: string; source: "intro" | "oct25" };

export const bracketsSheet = {
  open: "see all brackets",
  title: "All brackets",
  close: "Close all brackets",
  lead: "What each bracket allows in a deck, then how we read each rule, with one line of Wizards' own under it.",
  corner: "cards allowed", // table corner; cells are the bare number, or climb.noCap (at 4 and 5 too, as the climb prints)
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
  // Rendered in curly quotes, italic, under the reading. Never edit the text; re-quote from the post.
  quotes: {
    gameChangers: { text: "Up to three cards from the Game Changers list.", source: "intro" }, // Bracket 3, Deck Building
    massLandDenial: { text: "you should not expect to see these cards anywhere in Brackets 1–3.", source: "intro" },
    extraTurns: {
      text: "Extra-turn cards should only appear in low quantities and are not intended to be chained in succession or looped.",
      source: "intro", // Brackets 2 and 3, Deck Building
    },
    twoCardCombos: { text: "No intentional early-game two-card infinite combos.", source: "intro" }, // Bracket 3
    tutors: { text: "remove the tutor restrictions from Commander Brackets entirely", source: "oct25" },
    high: { text: "There are no restrictions (other than the banned list).", source: "intro" }, // Brackets 4 and 5
  } satisfies Record<string, Quote>,
  quoteTag: { intro: "Wizards · Feb 2025", oct25: "Wizards · Oct 2025" },
  quotedFrom: "Quoted from", // foot: then one link per source, labelled by month, e.g. "Feb 2025"
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
    name: "Optimized and cEDH", // notes-list entry, under both chip marks
    reading:
      "No card limits on any of the four. Only the banned list applies, and which of the two a deck is, is how you play it.",
  },
  // Foot: BRACKET_RULES_SOURCE.title, provenance.source(BRACKET_RULES_SOURCE.name), provenance.rulesChecked(date),
  // then quotedFrom + the two quote sources.
} as const;
