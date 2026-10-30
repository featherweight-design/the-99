// Proposed addition to src/lib/copy/about.ts. Intent only; every string goes through /copy-review.
// Ships at the end of the launch with the epic's single ABOUT_VERSION bump (11 → 12), alongside the
// five collection edit entries (../addendum-collection-edit/).

// Insert in chapter 03 ("Building the 99"), immediately after the entry with id 'stand-ins'.
export const gotItEntry = {
  id: 'shopping-got-it',
  title: 'Marking a card you bought',
  route: '/decks/[id]', // Shopping view
  since: 12,
  // The control also needs COLLECTION_EDIT_ENABLED. `switch` takes one key today — see README open 1.
  switch: 'SHOPPING_MARK_BOUGHT_ENABLED',
  caption: [
    'Bought something off a deck’s Shopping list? Press the card’s buy tag. Say which printing came, whether it’s foil, and how many, and it goes straight into your Collection.',
    'The deck reads the new copy like any other, so the card usually drops off the list on its own.',
  ],
  keyLines: [
    'The printing starts at the one the list priced. If a different one came, change it.',
    'Usually the card leaves the list. If an older deck was short of it too, the copy goes there first, and this deck keeps the card on its list.',
    'Undo is on the receipt, and History keeps the change after that.',
    'You never mark the deck by hand. Its buy marks follow your Collection.',
  ],
  specimen: {
    component: 'GotItSpecimen', // two Shopping DecklistRows + the receipt toast; see README §Specimen
    fixture: 'fixtures.gotIt',
  },
} as const;

// AboutSwitch gains 'SHOPPING_MARK_BOUGHT_ENABLED'.
