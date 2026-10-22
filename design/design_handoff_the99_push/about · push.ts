// about · push.ts. Account 2, 2026-10-22, R1, approved by Hugh. The push line's one About entry, as it goes into
// `aboutEntries` in src/lib/copy/about-entries.ts, with Design's picture call: `screen`, and the halo as a `locator`.
//
// WORDS: placeholders, for /copy-review.
//
// SCREEN (README A1): a NEW screen, 'settings'. /settings has no About screen today (screenForPath returns null for it).
// Add 'settings' to AboutScreen, screenForPath('/settings') = 'settings', a SCREEN_WHERE line ('/settings'), a capture.
//
// VERSION (A5): a switched entry bumps nothing; since = the ABOUT_VERSION current when it ships (16 on main at 147669b),
// announced by its id when PUSH_ENABLED flips.

export const push = {
  id: 'push',
  chapter: '04',
  screen: 'settings',
  switch: 'PUSH_ENABLED',
  title: 'Push notifications',
  route: '/settings',
  caption:
    'The 99 can tell your phone or computer when something new lands, even with the app closed. It sends the same news Home shows, and you choose each kind on its own:\n\n- A set or a precon that just came out\n- A price drop on a card on your wishlist\n- A combo you can now make with cards you own\n- A friend with a spare of a card on your wishlist\n- A friend asking for one of your spares\n\nIn Settings, tick Push beside a kind. Your browser asks once before anything is sent, and each phone or computer has its own switch at the top of the column.\n\nOn iPhone, add The 99 to your Home Screen first (Share, then Add to Home Screen), open it from there, and turn push on.',
  captionLineSwitches: {
    '- A price drop on a card on your wishlist': 'SOCIAL_WISHLIST_ENABLED',
    '- A friend with a spare of a card on your wishlist': ['SOCIAL_FRIENDS_ENABLED', 'SOCIAL_WISHLIST_ENABLED'],
    '- A friend asking for one of your spares': 'SOCIAL_FRIENDS_ENABLED',
  },
  keys: [
    'Only a friend asking for your spare starts ticked. Nothing is sent until you allow it on a device.',
    'Nothing comes between 9pm and 9am; it waits for the morning. Several at once arrive as one.',
    'A tap opens what it’s about and marks it seen on Home.',
    'No push while The 99 is open in front of you. No email, ever.',
  ],
  keySwitches: {
    'Only a friend asking for your spare starts ticked. Nothing is sent until you allow it on a device.': 'SOCIAL_FRIENDS_ENABLED',
  },
  since: 16,
} as const;

// EDIT to a shipped entry (A4), no bump of its own:
//   'whats-new' key 1 with PUSH_ENABLED on:
//     'News stays in the app: a count on Home in the bar, and the list. No email, ever.'
//     -> 'News shows on Home, and as push where you turn it on. No email, ever.'

// LOCATOR (scripts/lib/about-locators.mjs, A3):
//   'push': { screen: 'settings', locator: the device row, e.g. "[data-push-device]" }   // scope: main
// CAPTURE (A2): settings at 390x844, six themes, PUSH_ENABLED + HOME_FEED_ENABLED on, default ticks, device row Not on yet.
