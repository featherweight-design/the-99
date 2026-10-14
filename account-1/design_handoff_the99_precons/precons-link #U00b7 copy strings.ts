// Precons R3 addendum: built-from link and v0. Proposed additions.
// `preconLinkCopy` → src/lib/copy/precons.ts; `history.origin*` → src/lib/copy/deck-versioning.ts.
// Placeholders until /copy-review. No verdict word on any share; selection says select / unselect.

export const preconLinkCopy = {
  suggestion: {
    lead: (precon: string) => `Looks like this started as ${precon}.`,
    leadOtherCommander: (precon: string) => `Looks like this started as ${precon}, with a different commander.`,
    metaSame: (shared: number, of: number) => `${shared} of its ${of} cards are in this deck · same commander`,
    metaOther: (shared: number, of: number, commander: string) =>
      `${shared} of its ${of} cards are in this deck · led by ${commander}`,
    leadTwo: "Looks like this started as one of two precons",
    metaTwo: "link the one it came from",
    rowMeta: (set: string, released: string, commanderClause: string, shared: number, of: number) =>
      `${set} · ${released} · ${commanderClause} · ${shared} of its ${of} cards are in this deck`,
    link: "Link it",
    linkOne: "Link",
    dismissAria: (precon: string) => `Dismiss the suggestion that this started as ${precon}`,
  },
  versionsRow: {
    head: "Built from a precon?",
    body: "Link it, and this history starts from the box as v0. Your cards don’t change.",
    cta: "Link a precon",
  },
  confirm: {
    title: (deck: string, precon: string) => `Link ${deck} to ${precon}`,
    lead: "Its history gains a v0, the precon’s list, before v1. Nothing in the deck changes.",
    facts: {
      v0: (precon: string) => `${precon} · 100 cards · before v1`,
      shared: (shared: number, of: number) => `${shared} of its ${of}`,
      v1: "now diffs against v0",
    },
    submit: "Link",
    pending: "Linking…",
    failed: "That didn’t link. Try again.",
  },
  pickPrecon: {
    title: (deck: string) => `Which precon was ${deck} built from?`,
    lead: "Link the precon you started from, and its list becomes v0, before v1.",
    label: "Shares the most with this deck",
    figSub: "in this deck",
    foot: "Linking adds v0 before v1. Your cards don’t change.",
    footNone: "Select a precon to link.",
    submit: (precon: string) => `Link ${precon}`,
    selectAria: (name: string) => `Select ${name}`,
    unselectAria: (name: string) => `Unselect ${name}`,
  },
  pickDeck: {
    entry: "Link a deck",
    title: (precon: string) => `Link a deck to ${precon}`,
    lead: "Pick the deck you built from this precon. Its list becomes that deck’s v0.",
    search: "Search your decks",
    label: "Your decks, most shared first",
    figSub: "shared",
    linkedElsewhere: (precon: string) => `built from ${precon} · linking moves it here`,
    foot: "Linking adds v0 before v1. Its cards don’t change.",
    submit: (deck: string) => `Link ${deck}`,
  },
  linked: {
    preconSentence: (deck: string, kept: number, of: number) => `Your deck ${deck} was built from this. ${kept} of its ${of} cards are still in it.`,
    rowClause: "built from this",
    dock: (precon: string, deck: string) => `${precon} · your deck ${deck} was built from this`,
  },
  unlink: {
    entry: "Unlink",
    entryLong: "Unlink from this precon",
    title: (deck: string, precon: string) => `Unlink ${deck} from ${precon}?`,
    lead: "v0, the precon’s list, leaves this deck’s history. v1 goes back to having nothing before it.",
    facts: { history: "v0 leaves · v1 is first again" },
    submit: "Unlink",
    pending: "Unlinking…",
    failed: "That didn’t unlink. Try again.",
  },
} as const;

// deck-versioning.ts, history: the v0 row and its panel, and v1's line against it.
export const historyOriginCopy = {
  originDivider: "from the precon · before your first commit",
  originNote: (precon: string) => `${precon}, as the box lists it`,
  originMeta: (set: string, released: string) => `the precon · ${set} · released ${released} · 100 cards`,
  originDelta: "the box",
  originHeading: "Before your first commit.",
  originBody: (precon: string, current: string) =>
    `v0 is ${precon}’s list as the box sells it. It’s history only: this deck is sleeved as ${current}.`,
  originOpen: (precon: string) => `Open ${precon} ›`,
  againstOrigin: (precon: string) => `against v0 · ${precon}, as the box lists it`,
  kept: (kept: number, of: number) => `${kept} of the precon’s ${of} cards kept`,
  brewLine: "Not committed yet. Your first commit is v1, and it diffs against v0.",
} as const;
