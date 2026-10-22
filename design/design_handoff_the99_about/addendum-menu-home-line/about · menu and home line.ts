// about · menu and home line.ts. Account 2, 2026-10-22, R1, approved by Hugh. The menu and Home line's one About entry (plan
// docs/superpowers/plans/2026-10-22-menu-home.md, "About" and product call 4), as it goes into `aboutEntries` in
// src/lib/copy/about-entries.ts, with Design's picture call: `screen`, and the halo as a `locator` for
// scripts/lib/about-locators.mjs.
//
// WORDS: placeholders, for /copy-review. Every fact is from main at 653499e (feed kinds and the 14-day window in
// src/lib/feed/kinds.ts, Settings' strings in src/lib/copy/settings.ts and feed.ts, the privacy line in social.ts).
//
// PLACE: in `ready-to-build`'s slot, so it is first under Home in the Reference. It `replaces` `ready-to-build` while
// HOME_FEED_ENABLED is on (Ready to build leaves Home with the feed), the way `buying-credits` replaces `credits`.
//
// VERSION: `since: 17`, one ABOUT_VERSION bump 16 -> 17 at PR 8, as the plan says. AboutSwitch gains
// HOME_FEED_ENABLED and COMMANDERS_PLACE_ENABLED.
//
// TWO SWITCHES ON ONE LINE (README G1): three lines need two switches at once. `AboutLineSwitch` takes one today;
// the arrays below assume it takes a list, every one of which must be on.

export const menuHomeLine = {
  id: 'whats-new',
  replaces: 'ready-to-build',
  chapter: '04',
  screen: 'home',
  switch: 'HOME_FEED_ENABLED',
  title: 'Home’s news, and the new bar',
  route: '/',
  caption:
    'Home now opens on what’s new for you. One story leads at the top, then the decks you touched last, then the rest of What’s new:\n\n- A set or a precon that just came out\n- A price drop on a card on your wishlist\n- A combo you can now make with cards you own\n- A friend with a spare of a card on your wishlist\n\nNothing shows until you choose what you’d like to hear about: right on Home the first time, then in Settings, in the account menu.\n\nCommanders is one place now, with a tab for each way in:\n\n- For you: the commanders you own, ranked by fit\n- Discover: the ones worth buying\n- Help me choose: a few questions, and we pick\n\nFriends has its own spot in the bar, and a friend’s page shows their spares and decks.\n\nIn Settings, you choose how many spare copies a card needs before friends see it, and keep any card back.',
  captionLineSwitches: {
    '- A price drop on a card on your wishlist': 'SOCIAL_WISHLIST_ENABLED',
    '- A friend with a spare of a card on your wishlist': ['SOCIAL_FRIENDS_ENABLED', 'SOCIAL_WISHLIST_ENABLED'], // G1
    'Commanders is one place now, with a tab for each way in:': 'COMMANDERS_PLACE_ENABLED',
    '- For you: the commanders you own, ranked by fit': 'COMMANDERS_PLACE_ENABLED',
    '- Discover: the ones worth buying': 'COMMANDERS_PLACE_ENABLED',
    '- Help me choose: a few questions, and we pick': ['COMMANDERS_PLACE_ENABLED', 'HELP_ME_CHOOSE_ENABLED'], // G1
    'Friends has its own spot in the bar, and a friend’s page shows their spares and decks.': ['COMMANDERS_PLACE_ENABLED', 'SOCIAL_FRIENDS_ENABLED'], // G1
    'In Settings, you choose how many spare copies a card needs before friends see it, and keep any card back.': 'SOCIAL_FRIENDS_ENABLED',
  },
  keys: [
    'News stays in the app: a count on Home in the bar, and the list. No email, ever.',
    'A story stays 14 days. Opening Home marks it seen.',
    'Old links to Discover and Help me choose land on their tabs.',
    'Friends see your deck names, commanders and statuses, never the lists.',
  ],
  keySwitches: {
    'Old links to Discover and Help me choose land on their tabs.': 'COMMANDERS_PLACE_ENABLED',
    'Friends see your deck names, commanders and statuses, never the lists.': 'SOCIAL_FRIENDS_ENABLED',
  },
  since: 17,
} as const;

// EDITS to shipped entries, ordinary edits with no bump of their own:
//   'friends', caption sentence 2, with COMMANDERS_PLACE_ENABLED on:
//     'Open “Friends” from your account menu, press …'  ->  'Press “Friends” in the bar, press …'
//   'discover': route '/commanders/discover' with the place on (discoverPath); screenForPath maps it to 'discover'.
//   'help-me-choose': route '/commanders/choose' with the place on (choosePath).
//   'about-rebuilt': confirm "Help me choose, waiting on Decks, Home and Commanders while you have no decks yet" with
//     the feed on (README G4).

// LOCATOR (scripts/lib/about-locators.mjs):
//   'whats-new': { screen: 'home', locator: the lead story section, e.g. "[data-feed-lead]" }   // scope: main
// CAPTURE NEEDS (README G3): every screen recaptured with COMMANDERS_PLACE_ENABLED and SOCIAL_FRIENDS_ENABLED on (the
// bar); `home` also with HOME_FEED_ENABLED and SOCIAL_WISHLIST_ENABLED on, the feed's kinds on, one unseen item to
// lead, and no welcome strip.
