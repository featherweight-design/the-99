// about · card search.ts. R1. Intent only: words go through /copy-review.
// Target: src/lib/copy/about.ts. One new entry in chapter 01, after `card-detail`. A switched entry: announced when
// CARD_SEARCH_ENABLED flips, so ABOUT_VERSION is not bumped for it. Ships with the feature or in the discovery line's
// showcase: Hugh's call.

export const lookingUpAnyCard = {
  id: 'card-search',
  switch: 'CARD_SEARCH_ENABLED', // G1
  chapter: '01',
  after: 'card-detail',
  title: 'Looking up any card',
  route: 'any page',
  opens: 'opens Search all cards',
  width: 'plate',
  // Specimen: the rail field with "in" typed and three result rows at their own size (Ashling: all three signals;
  // Invisible Woman: owned and a deck; Zimone: not owned, on the wishlist). Phone reduction: the field and two rows.
  caption:
    'Saw a card across the table, or in a friend’s deck? Look it up by name from any page: the search icon at the top of your phone, or the field at the top of the side rail on a computer (⌘K, or Ctrl K).\n\nEach card says how many you own, which of your decks hold it, and whether it’s on your wishlist. Press one for its full details.',
  keys: [
    'Search reads card names only, including the names printed on Secret Lair cards.',
    'The last 8 cards you opened from search wait in the field before you type.',
    'On a deck’s page, “Add a card” adds to that deck, in its colors. “Search all cards” finds any card.',
    'On a phone, the top bar comes back as soon as you scroll up a little.',
  ],
  marksPending: true,
} as const;
