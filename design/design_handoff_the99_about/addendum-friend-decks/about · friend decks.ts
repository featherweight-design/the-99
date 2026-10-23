// about · friend decks.ts. Account 2, 2026-10-22, R1. The friend decks line's one About entry (handoff
// design/design_handoff_the99_friend_decks/, READINESS G6), as it goes into `aboutEntries` in
// src/lib/copy/about-entries.ts, with Design's picture call: `screen`, and the halo as a `locator`.
//
// WORDS: placeholders, for /copy-review. Facts from main at 6560671: Settings' strings (settings.ts `decks`), the
// privacy line (social.ts `decksSeenBy`), the hide row (social.ts `hideDeck`), the picker (game-seats.ts `notListed`,
// lib/social/games.ts), the unfinished rule (lib/social/deck-visibility-rule.ts: New, Draft, Building).
//
// PLACE: right after 'friends', so the Reference lists it second under Friends.
// VERSION: switched, so no bump. since = the ABOUT_VERSION on main (16); announced by its id when the switch flips.

export const friendDecks = {
  id: 'friend-decks',
  screen: 'friends',
  switch: 'FRIEND_DECKS_ENABLED',
  chapter: '04',
  title: 'Your friends’ decks',
  route: '/friends',
  caption:
    'Your friends’ decks open now. On a friend’s page, press any deck under Decks to see its whole list, read-only: the commander, every card by type, and a dot on each card you own yourself. Press a card for its details, and add it to your wishlist from there.\n\nYour decks open for friends the same way. Out of the box they see a deck once its list is full and committed, never your drafts or the decks you’re still building. In Settings, under Your decks:\n\n- Friends can see my decks: turn it off and they see none\n- Include drafts and decks I’m building: turn it on and they see them all\n\nTo keep one deck to yourself, tick Hidden from friends in its ⋯ menu. For friends it simply isn’t there.\n\nLogging a game with a friend? Their decks are listed when you seat them. If the one they played isn’t, pick “A deck not listed”: they’re seated by name, with no deck. A game already logged keeps the deck it named, even if it’s hidden later.',
  captionLineSwitches: {
    ', and add it to your wishlist from there': 'SOCIAL_WISHLIST_ENABLED',
    'Logging a game with a friend? Their decks are listed when you seat them. If the one they played isn’t, pick “A deck not listed”: they’re seated by name, with no deck. A game already logged keeps the deck it named, even if it’s hidden later.': 'SOCIAL_GAMES_ENABLED',
  },
  keys: [
    'Friends never see a deck’s prices, what it still needs to buy, or its notes.',
    'A hidden deck has no tile, and its link stops working, the same as a deleted deck’s.',
    'Hiding a deck never changes your spares: its cards still count as in use.',
    '“A deck not listed” shows for every friend, so it never gives away a hidden deck.',
  ],
  keySwitches: {
    '“A deck not listed” shows for every friend, so it never gives away a hidden deck.': 'SOCIAL_GAMES_ENABLED',
  },
  since: 16,
} as const;

// EDITS to shipped entries, each a keySwitches pair (as #2228 did for 'whats-new'), no bump:
//   'friends' key 2:
//     '!FRIEND_DECKS_ENABLED': 'Friends see your name and your commander, never what you own. Your spares show only to the pods you share them with.'
//     'FRIEND_DECKS_ENABLED':  'Friends see your name, your commander and the decks you let them open, never your collection. Your spares show only to the pods you share them with.'
//   'opponents' key 3:
//     '!FRIEND_DECKS_ENABLED': 'A seat keeps names and decks as they were that night, even if a friend renames a deck or leaves.'
//     'FRIEND_DECKS_ENABLED':  'A seat keeps names and decks as they were that night, even if a friend renames or hides a deck, or leaves.'
//
// EDIT to the push handoff (unbuilt; call 4, D4 of #2219), a plain edit:
//   design_handoff_the99_push/about · push.ts key 3:
//     'A tap opens what it’s about and marks it seen on Home.' -> 'A tap opens what it’s about. Opening Home marks your news seen.'

// LOCATOR (scripts/lib/about-locators.mjs):
//   'friend-decks': { screen: 'friends', locator: '[data-decks-seen]' }   // scope: main; the attribute is on main
// CAPTURE: 'friends' at 390x844, six themes, FRIEND_DECKS_ENABLED on for the fixture account, its rules at the defaults
// (the line reads decksSeenBy.finished). The line wraps to three lines, so the page under it moves down 17px.
