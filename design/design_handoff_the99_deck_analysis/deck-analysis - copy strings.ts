// src/lib/copy/deck-analysis.ts — Round 0 (the frame) only.
// Adds only. Nothing here redefines a string that ships today: the mix strip keeps
// RECOMMENDED_MIX_SOURCE_LINE and addPanelCopy.strip.*, which move address and not wording.
//
// Rules this block is written under, from the spec:
//   · every figure carries its denominator in the same string as the figure
//   · no percentages, no nets, nothing blended into a score
//   · a bracket verdict may be a range, and a range is a finished answer

export const deckAnalysisCopy = {
  tab: {
    // No count. Nothing on this tab is countable, and a count implies items.
    label: "Analysis",
    accessibleName: "Analysis of this deck",
  },

  brackets: {
    // WotC / Commander Format Panel vocabulary, February 2025. NOT ours to reword:
    // the whole point of the system is that these five words mean the same thing in
    // every app and at every table. The numeral and the name always travel together —
    // half a pod says "a three", the other half says "upgraded".
    1: "Exhibition",
    2: "Core",
    3: "Upgraded",
    4: "Optimized",
    5: "cEDH",
  },

  chip: {
    // One component, two altitudes: the deck band's badge row and the deck tile's
    // meta line. A range travels unrounded.
    one: (n: number, name: string) => `${n} ${name}`,
    range: (low: number, high: number, lowName: string, highName: string) =>
      `${low}\u2013${high} ${lowName} or ${highName}`,
    // The crown is never drawn without the name: a rising five-rung mark reads as a
    // rating, and a bracket is not one. 5 is a different evening, not a better deck.
    // A deck that has not been read draws NO chip. There is no "unknown" string
    // on purpose — absence is quieter than a dash and says the same thing.
    accessibleName: (text: string) => `${text}. Opens this deck's analysis.`,
  },

  verdict: {
    permitsLabel: "Bracket \u2014 your cards permit",
    declaredLabel: "You play this at",
    range: (low: number, high: number) => `${low} or ${high}`,
    // Brackets 1 and 5 are declared by the player and never inferred.
    undeclared: "Brackets 1 and 5 are yours to declare \u2014 an exhibition deck is a promise about how you play it, not a fact about the cards.",
    declaredNote: (low: number, high: number, chosen: number) =>
      `Your cards permit ${low} or ${high}. You chose ${chosen}.`,
    declare: "Say which this is",
    declareSkip: "or leave the range",
    change: "change this",
    playerCallTag: "your call",
    // In-flight: the numerator is an em dash and the denominator still prints.
    pendingFigure: "\u2014",
    pendingDenominator: (total: number) => `\u2014 of ${total} read`,
    readFrom: (read: number, total: number) => `from ${read} of ${total} read`,
  },

  receipts: {
    heading: "What the verdict was read from",
    ladderHint: "each row shows the brackets it allows",
    // NO "of 99" here. The denominator that matters to a limit is the limit, and it is
    // printed as the rule on the right of the row.
    allowance: (n: number, bracketName: string) =>
      n === 0 ? `none at ${bracketName}` : `${n} at ${bracketName}`,
    notAGate: "not a gate",
    noLimit: "a guide, no limit at any bracket",
    agreement: "Where they agree",
    aboveWhatYouBuilt: "allowed, but above what you built",
    gameChangers: "Game changers",
    landDenial: "Mass land denial",
    extraTurns: "Extra turns",
    combos: "Two-card combos",
    tutors: "Tutors",
  },

  synopsis: {
    heading: "What this deck is",
    // Each named card is a CardDetailTrigger + usePreviewRow: hover previews, click opens
    // the modal. The prose therefore arrives with the oracle ids it names, never as a
    // string for the client to match.
    cardAria: (name: string) => `View details for ${name}`,
    // 1 · present
    writtenAgainst: (count: number, whenAgo: string) => `written against all ${count} \u00b7 ${whenAgo}`,
    // 2 · never generated
    absent: "No summary has been written for this deck yet.",
    write: "Write one",
    writeCost: "about five seconds",
    // 3 · stale
    staleTag: "out of date",
    staleCount: (changed: number, total: number) =>
      `${changed} of ${total} cards have changed since it was written`,
    rewrite: "Write it again",
    staleProvenance: (was: number, total: number) => `written against ${was} of these ${total}`,
    verdictCurrent: "recounted just now",
    // 4 · refused by the accept contract. Never "something went wrong".
    refusedTag: "not written",
    refused:
      "We wrote a summary and it did not check out against your list, so we are not showing it. Nothing about your deck changed.",
    retry: "Try again",
    refusedCount: (failed: number, total: number) => `${failed} of ${total} claims failed checking`,
    // 5 · not yet read
    unread:
      "We have not finished reading this deck. The mix below is counted from your list and is true now; the bracket needs one pass over all 99.",
    readMore: "read the rest",
  },

  comparators: {
    // One line per block, naming what its figures are measured against. This is the
    // whole disambiguation between three strips of small numbers.
    rules: "measured against the bracket rules",
    edhrec: "EDHREC averages",
    nothing: "measured against nothing \u2014 description, not judgement",
  },

  live: {
    // One message per settle, on the existing live region.
    ready: (verdict: string) => `Analysis ready. Your cards permit ${verdict}.`,
    synopsisReady: "Summary written.",
    synopsisRefused: "No summary \u2014 it did not check out against your list.",
  },
} as const;
