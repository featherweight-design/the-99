// Suggested changes v2 (plan 2026-10-27, UI PR 5): the tile and the intake. ONE exported object so it can go to
// /copy-review as a block. PLACEHOLDERS owed to /copy-review, carried verbatim from the handoff's copy file
// (design/design_handoff_the99_suggested_changes_v2, `suggested-changes-v2 · copy strings.ts`, the `tile` and `intake`
// blocks; approved 2026-10-28). The wait, results, bar, confirm, history and about blocks arrive with PR 6 and PR 7.
// US English, no em dashes, and never the words AI, model or LLM.
//
// Reuses, never restates: creditsCopy (the credit line), deckDescriptionCopy.limits (the Kept for this deck box),
// tuningHubCopy (the tile's name and cost), BRACKET_NAMES (the bracket names), strategyName (the focus).
// Strings the boards draw that the handoff's copy file lacks are marked `PLACEHOLDER for /copy-review`.

export const suggestedChangesV2Copy = {
  tile: {
    purpose: "Say what you want changed. You get more cards to add and to cut than you need, and pick.",
    under: (total: number) => `Swaps cards in and out of a deck at 99. This one is at ${total}: top it off first.`,
    over: (n: number) => `Swaps cards in and out of a deck at 99. This one is ${n} over: cut it to 99 first.`,
    topOff: "Top off on Your deck →",
    proposedCuts: "Proposed cuts →",
  },
  intake: {
    lead: "Say how many cards to change and what you’re after. You get more of each than you asked for, and you pick.",
    count: {
      title: "How many cards?",
      sub: "cards in · the same number come out",
      line: (n: number, pool: number) => `${n} in, ${n} out. You’ll pick from about ${pool} of each.`,
      range: "1 to 20",
      atMax: "20 at most",
      // PLACEHOLDER for /copy-review: the stepper's accessible names (the board draws only − and +).
      fewer: "Fewer cards",
      more: "More cards",
      countLabel: "Cards to change",
    },
    request: {
      title: "What are you looking to change?",
      placeholder: "In your own words, or leave it empty.",
      tagHelp: "tag a card",
    },
    noticed: {
      head: "What we noticed",
      help: "Tap one to add its words to your request. Change them as you like.",
      kinds: { role: "role", focus: "focus", game: "game" },
      // The sentence a tap appends.
      roleShort: (role: string, have: number, target: number) => `More ${role}: the deck runs ${have} of a target ${target}.`,
      focus: (focus: string) => `Lean into ${focus}, the deck’s focus.`,
      // PLACEHOLDER for /copy-review: the chips' own faces, as the Intake board draws them. The worst role gap, then the
      // second one; the focus; the newest dated game note, quoted, with its date as the chip's figure.
      roleShortChip: (role: string) => `Short on ${role}`,
      roleOf: (have: number, target: number) => `${have} of ${target}`,
      roleIsChip: (role: string, have: number, target: number) => `${role} is ${have} of ${target}`,
      focusChip: (focus: string) => `Lean into ${focus}`,
      focusMeta: "the focus",
      gameChip: (note: string) => `“${note}”`,
      // PLACEHOLDER for /copy-review: the sentence a game note's chip appends (the board draws the chip, not its words).
      gameSentence: (note: string, date: string) => `In my ${date} game: “${note}”.`,
    },
    bracket: {
      head: "Bracket",
      now: (b: number, name: string) => `now ${b} · ${name}`,
      keep: (b: number, name: string) => `Keep at ${b} · ${name}`,
      down: (b: number, name: string) => `Down to ${b} · ${name}`,
      up: (b: number, name: string) => `Up to ${b} · ${name}`,
      noteKeep: (b: number, name: string) => `Nothing it suggests moves the deck out of ${b} · ${name}. A card that would is left out.`,
      noteDown: (b: number, name: string) => `Cuts lead with what keeps the deck out of ${b} · ${name}; additions stay inside it.`,
      noteUp: (b: number, name: string) => `Additions lean toward what takes the deck to ${b} · ${name}, and each one that does says so.`,
      // PLACEHOLDER for /copy-review: a deck read as a range ("Exhibition or Core"). The board draws a single bracket only.
      nowRange: (low: number, high: number, face: string) => `now ${low} or ${high} · ${face}`,
      keepRange: (low: number, high: number, face: string) => `Keep at ${low} or ${high} · ${face}`,
      noteKeepRange: (low: number, high: number, face: string) => `Nothing it suggests moves the deck out of ${low} or ${high} · ${face}. A card that would is left out.`,
    },
    restrictions: { title: "Any restrictions?", sub: "kept for this deck, so the next run starts with them" },
    send: "Suggest changes",
    usual: { 3: "usually under 20 seconds", 10: "usually about 40 seconds", 20: "usually about a minute, now and then two" },
    reads: "Your words lead. The run also reads",
    reads2: ", in that order.",
    // PLACEHOLDER for /copy-review: the footer's first part (the deck's overview, when it has one; the other parts reuse
    // deckTuningCopy.manifest and deckDescriptionCopy.manifest) and its link to History (Intake board A).
    readsOverview: "the overview",
    lastRun: (date: string) => `Last run ${date} · History ›`,
    same: {
      body: (date: string) => `Same request as your ${date} run, on the same list. A new run uses a credit and will likely name many of the same cards.`,
      again: "Run it again",
      open: (date: string) => `Open ${date}’s run`,
    },
    drift: (total: number) => `The deck is at ${total} now. Suggested changes keeps a deck at 99, so it waits until you’re back there.`,
  },
} as const;
