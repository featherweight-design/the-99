// about · launch end batch.ts. Account 2, 2026-10-21, R1. The six launch-end About entries (brief
// docs/superpowers/design-briefs/2026-10-18-about-launch-entries.md, #2072), as they go into `aboutEntries` in
// src/lib/copy/about-entries.ts, with Design's picture call on each: `screen`, and the halo as `locator` (+ `reaches`)
// for scripts/lib/about-locators.mjs.
//
// WORDS: every title, opens, caption and key is the draft as the brief quotes it (entries 1 to 3) or as its handoff
// file carries it (entries 4 to 6). They are /copy-review's; Design has not changed a word. The brief's "Draft vs code"
// list (13 items) still applies to them.
//
// VERSION: ABOUT_VERSION 14 -> 16 (never 15). Every entry `since: 16`. Only `about-rebuilt` is unswitched, so it is the
// entry the bump announces; the other five are announced when their switches turn on. AboutSwitch gains
// HELP_PANEL_ENABLED, FIRST_RUN_TOUR_ENABLED, RULE_ZERO_ENABLED, SOCIAL_INVITES_ENABLED, CARD_SEARCH_ENABLED and
// CARD_SCAN_ENABLED (Draft vs code 8).
//
// Line switches match a caption line or key by its exact text (about.ts:171-176); whether a `- ` list line is
// matched with or without its marker is engineering's to confirm.
//
// The dead template slots are gone (call 8): no `width`, `marksPending`, specimen, fixture props or phone reduction.
// What the reshape reads in their place is `screen`, and, beside the entry, its locator and the frame's capture needs.

export const launchEndBatch = [
  {
    id: 'getting-help',
    after: 'commitments', // ends Home's list in the Reference; chapter stays 04
    chapter: '04',
    screen: 'home', // CALL: moved from 'account' so the picture shows the ? itself (README call 1)
    switch: 'HELP_PANEL_ENABLED',
    title: 'Getting help on any screen',
    route: '/',
    opens: 'from the ? on any screen',
    caption:
      'Every screen has a ? with the About entries for what you’re looking at. Open one for the short version, or read the whole entry in the Reference.\n\nWhere an entry is about a tool on the page, “Show me” scrolls to it and lights it up. Looking for something that lives on another screen? Search reads all of About from right there.\n\nAnd if you’d like the walk-through again, “Take the tour” in the account menu runs it on your own app. Six stops, about a minute.',
    captionLineSwitches: {
      'And if you’d like the walk-through again, “Take the tour” in the account menu runs it on your own app. Six stops, about a minute.': 'FIRST_RUN_TOUR_ENABLED',
    },
    keys: [
      'The ? sits at the foot of the rail, or in the header on a phone.',
      'On a deck or in Collection, chips open the other tabs’ entries.',
      'On desktop, the ? works over a card’s details too.',
      '“Take the tour →” also sits at the top of About.',
    ],
    keySwitches: { '“Take the tour →” also sits at the top of About.': 'FIRST_RUN_TOUR_ENABLED' },
    since: 16,
  },
  {
    id: 'about-rebuilt',
    after: 'themes',
    chapter: '04',
    screen: 'account',
    // no switch: the entry the bump announces
    title: 'About, rebuilt',
    route: '/about',
    opens: 'opens About',
    caption:
      'About used to be one long page. Now it starts with what the app can do for you.\n\n- Tools: what each tool is for, pictured on a real screen. “Try it” takes you there and lights it up.\n- Reference: every entry, by the screen it lives on, with search and what’s new since your last visit.\n- A ? on every screen, with that screen’s entries.\n- Help me choose, waiting on Decks, Home and Commanders while you have no decks yet.\n- A one-minute tour the first time you open Home.',
    captionLineSwitches: {
      '- A ? on every screen, with that screen’s entries.': 'HELP_PANEL_ENABLED',
      '- Help me choose, waiting on Decks, Home and Commanders while you have no decks yet.': 'HELP_ME_CHOOSE_ENABLED',
      '- A one-minute tour the first time you open Home.': 'FIRST_RUN_TOUR_ENABLED',
    },
    keys: [
      'A tool that needs a deck opens one that fits.',
      '“How it works ›” on a tool opens its full entry.',
      'My note on why The 99 exists now closes the Reference.',
    ],
    since: 16,
  },
  {
    id: 'rule-zero',
    after: 'invites', // friends, invites, rule-zero, then opponents
    chapter: '04',
    screen: 'friends',
    switch: 'RULE_ZERO_ENABLED', // needs SOCIAL_FRIENDS_ENABLED
    title: 'Checking tonight’s table',
    route: '/friends',
    opens: 'from a pod’s “Rule 0 check”',
    caption:
      'The Rule 0 check puts tonight’s decks side by side before anyone shuffles. One of you seats the players from a pod and picks a deck for each seat. Everyone seated sees the same table, and it waits for them on Home.\n\nEach complete deck lands on the five brackets, measured from the middle of the table. A deck a bracket or more away is flagged above or below, with what puts it there, like a two-card combo it can tutor for or one Game Changer too many. Better to know now than on turn four.\n\nFlagged? We’ll show you a few of your own decks that sit closer, and a swap shows up for everyone at the table. The bracket is read from each list, so a flag is where the conversation starts.\n\nAfter the game, log it from the table and the seats come filled in. Anyone who isn’t your friend comes in by name and commander, marked “from the table”.',
    // The whole last paragraph as ONE line, so its removal leaves no stray break (Draft vs code 10).
    captionLineSwitches: {
      'After the game, log it from the table and the seats come filled in. Anyone who isn’t your friend comes in by name and commander, marked “from the table”.': 'SOCIAL_GAMES_ENABLED',
    },
    keys: [
      'Start one from a pod’s “Rule 0 check”, for 2 to 8 players.',
      'When you set the table, friends’ decks are listed. Anyone else picks their own.',
      '“Swap in” or “Change deck” changes yours. “Undo” changes it back.',
      'A table closes 24 hours after it’s set. Its logged games stay.',
    ],
    since: 16,
  },
  {
    id: 'invites',
    after: 'friends',
    chapter: '04',
    screen: 'friends',
    switch: 'SOCIAL_INVITES_ENABLED', // the shipped switch (registry.ts:68), not the handoff's placeholder
    title: 'Inviting someone new',
    route: '/friends',
    opens: 'opens Add a friend',
    caption:
      'The 99 is invite-only, so new players arrive through the people already in it. On Friends, press “Add a friend”, then “Invite someone new”. At the table, show an invite QR: they scan it, type their own email, and confirm it with a code. Or type their email here, and The 99 sends the invitation.\n\nOnce they make their account, you’re friends. Adding someone who already plays? Pick “They’re on The 99” and send a friend link: it uses no invite.',
    keys: [
      'An invite is used only when someone makes an account. One that isn’t used within 7 days comes back.',
      'An invite QR holds one invite for its 15 minutes, and gives it back if nobody uses it.',
      'Whatever the email, you’re told “Invitation sent”, so nobody can use an invite to find out who’s on The 99.',
      'How many you have left shows under “Add a friend”. Invites are given out by The 99, not bought.',
    ],
    since: 16,
  },
  {
    id: 'card-search',
    after: 'card-detail',
    chapter: '01',
    screen: 'collection', // CALL: the header icon's box goes on the collection frame (README call 5)
    switch: 'CARD_SEARCH_ENABLED',
    title: 'Looking up any card',
    route: 'any page',
    opens: 'opens Search all cards',
    caption:
      'Saw a card across the table, or in a friend’s deck? Look it up by name from any page: the search icon at the top of your phone, or the field at the top of the side rail on a computer (⌘K, or Ctrl K).\n\nEach card says how many you own, which of your decks hold it, and whether it’s on your wishlist. Press one for its full details.',
    keys: [
      'Search reads card names only, including the names printed on Secret Lair cards.',
      'The last 8 cards you opened from search wait in the field before you type.',
      'On a deck’s page, “Add a card” adds to that deck, in its colors. “Search all cards” finds any card.',
      'On a phone, the top bar comes back as soon as you scroll up a little.',
    ],
    since: 16,
  },
  {
    id: 'card-scan',
    after: 'collection-add',
    chapter: '01',
    screen: 'collection',
    switch: 'CARD_SCAN_ENABLED', // needs COLLECTION_EDIT_ENABLED
    title: 'Scanning your cards',
    route: '/collection',
    opens: 'opens Add cards',
    // Words as the handoff carries them; stale per Draft vs code 13 (copy lane).
    caption:
      'Have a stack of cards in front of you? Press “Add cards”, then “Scan”, and hold each card up to your camera. We suggest which card it is, and one press puts it on the list.\n\nWhen we’re not sure, you get the three closest to pick from. Then check the list, fix anything we got wrong, and one Save adds the lot.',
    keys: [
      'Fast gives each card its first printing. Normal has you choose each printing on the list.',
      'The first scan downloads a card index of about 27 MB, once. After that it works offline.',
      'A card that stays in view is never added twice. A second copy takes its own press.',
      'Press a scanned card’s name on the list to swap it for one of the closest matches.',
    ],
    since: 16,
  },
] as const;

// EDIT · entry 'friends', caption, sentence 2, as a caption line under the READER's SOCIAL_INVITES_ENABLED
// (src/lib/about/visible.ts:81-94); off, the shipped sentence stays:
//   on:  'Open “Friends” from your account menu, press “Add a friend”, pick “They’re on The 99”, and send them the link, or let them scan the QR code off your screen.'
//   off: 'Open “Friends” from your account menu, press “Add a friend”, and send them the link, or let them scan the QR code off your screen.'

// LOCATORS (scripts/lib/about-locators.mjs), replacing the three CANDIDATES on about/locator-candidates:
//   'getting-help':  { screen: 'home',       locator: "header [data-help-button='header']" }            // header scope (README G1)
//   'about-rebuilt': { screen: 'account',    locator: "[role='dialog'] a[href='/about'], [role='menu'] a[href='/about']", reaches: true }
//   'rule-zero':     { screen: 'friends',    locator: "[data-testid='pod-rule-zero']" }
//   'invites':       { screen: 'friends',    locator: the Add a friend press and the [data-invite-count] line under it, as one box }
//   'card-search':   { screen: 'collection', locator: "header button[aria-label='Search all cards']" }   // header scope (G1)
//   'card-scan':     { screen: 'collection', locator: "[data-testid='collection-add-phone']", reaches: true, // box inset to the visible 36 press (README G7)
//                      note: 'the Scan press is inside Add cards; the + opens it' }
