// Proposed AboutEntry for src/lib/copy/about.ts. Chapter 03, after `export`. Intent only; /copy-review.
export const deckPrintingsEntry = {
  id: 'deck-printings',
  chapter: '03',
  title: 'Choosing a printing for a deck',
  route: '/decks/[id] · any card’s details · Set',
  since: 12,
  switch: 'DECK_PRINTINGS_ENABLED',
  caption:
    'Own more than one printing of a card? Open it from a deck and pick one under Set. That deck shows it, prices it and exports it.',
  keys: [
    'Other decks keep their own pick. A deck with none shows your Collection’s.',
    'It isn’t a change to the deck, so there’s nothing to commit.',
    'Importing a list that names a printing you own picks it for you.',
  ],
  specimen: 'deckPrinting',
} as const;
