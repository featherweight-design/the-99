// About · Social line entries (account 2, 2026-10-15). Four new entries for `aboutEntries` in
// `src/lib/copy/about.ts`, one per Social switch, drawn on the §G per-entry template. They batch at
// the line's launch: each follows its own switch, so all four are `since: 14` and there is NO
// ABOUT_VERSION bump (a switched entry is announced when its switch flips, as `deck-tokens` was).
// Re-pin the content hash only.
//
// `AboutSwitch` gains three members: 'SOCIAL_FRIENDS_ENABLED', 'SOCIAL_WISHLIST_ENABLED',
// 'SOCIAL_GAMES_ENABLED'. PHONE_SHOPPING_ROW_B_ENABLED is not named here: it changes the
// specimen's phone row, which the row component already reads, not any line of copy.
//
// Order: not one group. Each entry sits in the chapter of the surface it teaches, at the position
// named above it. Every specimen is a shipped component (or one exported unchanged from where it
// is built: E1, E2 in the README); the strings each part draws come from its own copy module.

export const socialLineEntries = [
  // chapter 01 · last, after 'collection-history'
  {
    id: 'wishlist',
    switch: 'SOCIAL_WISHLIST_ENABLED',
    chapter: '01',
    title: 'Keeping a wishlist',
    route: '/collection/wishlist',
    width: 'plate',
    caption:
      'Want a card that no deck is asking for yet? Put it on your wishlist. Press “Add to wishlist” in any card’s details, or search on the “Wishlist” tab of your Collection, and set how many you want. Any printing counts.\n\nOnce your Collection holds that many, the card leaves the list by itself, and the tab tells you once what left. Nothing piles up to clear.\n\nYour friends can see your wishlist, and you can see theirs: open a friend from “Friends”.',
    captionLineSwitches: {
      'Your friends can see your wishlist, and you can see theirs: open a friend from “Friends”.': 'SOCIAL_FRIENDS_ENABLED',
    },
    keys: [
      '“Add to wishlist” turns into a counter right where you pressed it, starting at one more than you have.',
      'Copies in your decks count toward what you have.',
      'It stays apart from Shopping: a deck’s missing cards stay on that deck’s list.',
      'Friends see each card and how many you want, never how many you own.',
    ],
    keySwitches: {
      'Friends see each card and how many you want, never how many you own.': 'SOCIAL_FRIENDS_ENABLED',
    },
    marksPending: true,
    since: 14,
  },
  // chapter 03 · after 'stand-ins', before 'shopping-got-it'
  {
    id: 'friend-spares',
    switch: 'SOCIAL_FRIENDS_ENABLED',
    chapter: '03',
    title: 'When a friend has a spare',
    route: '/decks',
    opens: 'opens a deck’s Shopping filter',
    width: 'plate',
    caption:
      'Before you buy a card, check whether a friend has one sitting idle. On a deck’s “Shopping” list, a card a friend can spare gets the friends mark beside its price. Press it to see who has one, the pod they share it with, and how many.\n\nA spare is a copy none of their decks use, drafts included. It’s view only, so the trade happens at the table.\n\nYour own spares stay private until you tick “Share my spares with this pod” on one of your pods in “Friends”.',
    keys: [
      'You only see spares from friends who share them with a pod you’re both in.',
      'When cheaper stand-ins exist too, the same window opens as “Before you buy”, friends first.',
      'A spare changes nothing: no price, no cart, and no card moves into your deck.',
      'The same mark shows on the cart for all your decks.',
    ],
    keySwitches: {
      'When cheaper stand-ins exist too, the same window opens as “Before you buy”, friends first.': 'SWAP_TOOLS_ENABLED',
      'The same mark shows on the cart for all your decks.': 'ALL_DECKS_CART_ENABLED',
    },
    marksPending: true,
    since: 14,
  },
  // chapter 04 · after 'log-findings'
  {
    id: 'friends',
    switch: 'SOCIAL_FRIENDS_ENABLED',
    chapter: '04',
    title: 'Friends and pods',
    route: '/friends',
    width: 'plate',
    caption:
      'Playing with the same people every week? Make them friends in The 99. Open “Friends” from your account menu, press “Add a friend”, and send them the link, or let them scan the QR code off your screen. Once they accept, you’re friends.\n\nPick a commander and its art becomes your face, beside your name everywhere a friend sees you. Then gather the friends you play with into a pod, and choose, pod by pod, who gets to see your spare cards.',
    keys: [
      'Nobody can find you by searching. A friend link works once and lasts 7 days, and you can take back one that’s still open.',
      'Friends see your name and your commander, never what you own. Your spares show only to the pods you share them with.',
      'You add your own friends to your pods. Leave one you own and it passes to its longest-standing member.',
      'Removing a friend or leaving a pod tells nobody.',
    ],
    marksPending: true,
    since: 14,
  },
  // chapter 04 · after 'friends', before 'suggested-changes'
  {
    id: 'opponents',
    switch: 'SOCIAL_GAMES_ENABLED',
    chapter: '04',
    title: 'Who you played against',
    route: '/decks',
    opens: 'opens a deck’s Games tab',
    width: 'plate',
    caption:
      'When you log a game, “Across the table” lets you seat who you played: a friend, one of their decks, or anyone by their commander. Lost? Press the trophy on whoever won.\n\nOnce a few games carry names, “Matchups” on the deck’s “Games” tab splits your record by commander, colors and friend, and each game in “History” says who was there.',
    keys: [
      'Seats are optional. A game with nobody seated counts as it always has.',
      'Each square is one game, won, lost or drawn. No percentages, so one game reads as one game.',
      'A seat keeps names and decks as they were that night, even if a friend renames a deck or leaves.',
      '“Seat a pod” sits a whole pod at once.',
    ],
    marksPending: true,
    since: 14,
  },
] as const;
