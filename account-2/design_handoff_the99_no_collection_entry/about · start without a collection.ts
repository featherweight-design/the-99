// about · start without a collection.ts. R1. Intent only: words go through /copy-review.
// Target: src/lib/copy/about.ts. One new entry (chapter 01, after `import`), two ordinary edits, and
// ABOUT_VERSION 14 → 15 at launch, batched to the line's last PR (AGENTS.md, multi-round rule).

export const startWithoutACollection = {
  id: 'start-without-a-collection',
  switch: 'COLLECTION_EDIT_ENABLED',
  chapter: '01',
  title: 'Starting without a collection file',
  route: '/collection',
  opens: 'opens the empty Collection',
  width: 'plate',
  // Specimen: the "No file? Start another way" group, drawn from noCollectionEntryCopy.ways at render (rule 2),
  // fixture props: all three rows. Phone reduction: the three 44px rows, caption's first and last sentences, keys 1–2.
  caption:
    'No export to upload? Plenty of us don’t have one. If your cards are a few precon boxes, a Moxfield list or a pile on the desk, start there.\n\nPick the precons you own and their cards go into your Collection at the box’s printings, tokens too. Import a deck you play and tick that you own its cards. Or add cards one at a time. A file can come later.',
  keys: [
    'Commanders, Discover and Decks open once your Collection has a card in it.',
    'Each precon box is its own change in History, and Revert takes it back. Adding a box twice stacks its copies.',
    'An imported deck’s cards are added as one change, at the printings the list named.',
    'Your first file asks whether it replaces or adds, and says what a replace would remove.',
  ],
  keySwitches: {
    'Each precon box is its own change in History, and Revert takes it back. Adding a box twice stacks its copies.':
      'PRECONS_ENABLED',
  },
  marksPending: true,
  since: 15,
} as const;

// precons (about.ts:1103-1121): caption, second paragraph, one sentence appended after "…into your collection too.":
export const preconsCaptionAddition =
  'Own a few boxes and don’t want decks from them yet? Pick them under Precons I own, from your Collection, and they’re added without starting anything.';

// deck-import (about.ts:1043-1064): a fourth key line, on COLLECTION_EDIT_ENABLED via keySwitches.
export const deckImportKeyAddition =
  'Own the deck you’re importing? Tick the box and its cards go into your Collection too.';
