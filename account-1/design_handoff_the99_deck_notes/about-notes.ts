// Proposed entry for src/lib/copy/about.ts (aboutEntries), chapter '03', directly after the Deck stats
// entry, because Notes sits beside Stats in Your deck (R4). Placeholders until /copy-review.
// ABOUT_VERSION: the next number at merge (cart, tokens and precons may land first).

export const deckNotesEntry = {
  id: "notes",
  chapter: "03",
  since: null, // set to the bumped ABOUT_VERSION in the PR
  switch: "DECK_NOTES_ENABLED", // new AboutSwitch member
  title: "Notes on a deck",
  route: "/decks/[id]",
  opens: "opens a deck’s Notes view",
  caption:
    "Each deck keeps a short list of notes under Notes in Your deck, beside Stats: one line each, newest first, dated when you add it. Type [[ or press [[ ]] and start a card’s name to tag it. The deck’s own cards come first, then any card, and a tagged name opens that card.\n\nSelect a note when it’s done and it folds under Done. Edit or delete any of them. They belong to the deck, not a version, so they carry over when you commit.",
  keyLines: [
    "A solid underline means the deck holds the card; dashed means it doesn’t, including a card you’ve since taken out.",
    "One line is 140 characters. A tag counts as its name.",
    "A deck keeps up to 100 notes, done ones included.",
    "Notes are yours only. Nothing reads them: not Suggested changes, not the analysis.",
  ],
  specimen: {
    component: "DeckNoteRow",
    fixture: { body: "Try [[Laboratory Maniac]] with [[Thassa’s Oracle]]", held: ["Laboratory Maniac"], createdAt: "2026-10-02" },
  },
  phone: "The input takes the full width, with [[ ]] and Add under it. Each row keeps its box and ⋯, and the date drops under the text. Typing [[ scrolls the input up so the picker fits above the keyboard.",
} as const;
