// src/lib/copy/about.ts: the About pages' shared types and ABOUT_VERSION, the account menu's About copy and the method
// copy. The About pages' own words live in `about-pages.ts`; the per-feature entry catalog this file once governed
// (`about-entries.ts`, with its writing rules and history notes) is retired.

/**
 * Moves only for an entry with NO switch: a switched entry is announced by its own id when its switch flips, so its
 * `since` is the version current when it ships and it bumps nothing (as `deck-tokens` did at 14). 15 was spent once
 * (#1840 bumped it for the switched `start-without-a-collection`, then went back): a reader who loaded a page while
 * it was live may have 15 written as their seen version, so the next bump is 16, never 15. 16 is the launch-end batch
 * (2026-10-21), for its one unswitched entry, `about-rebuilt`.
 *
 * Not a content hash any more: `about.version.json` holds this number for the probe scripts that read it (about 30 of
 * them raise `about_version_seen` to it), and the pages' seen-state keys on it. Keep the two equal and keep the file.
 */
export const ABOUT_VERSION = 16;

/**
 * The screens the "?" reads against the page a reader stands on, in the order a reader meets them (discovery plan
 * R2·1b, E8). A deck's seven are one screen, `deck`, told
 * apart by `view`, because the builder changes its tab and panel in place rather than by route.
 */
export const ABOUT_SCREENS = [
  'home', 'collection', 'card-details', 'sets', 'proxies', 'history', 'wishlist', 'upload', 'commanders', 'discover',
  'new-deck', 'decks', 'deck', 'cart', 'friends', 'account', 'settings', 'credits',
] as const;
export type AboutScreen = (typeof ABOUT_SCREENS)[number];

/** A deck's views, as the "?" reads them from the builder's live state. */
export const DECK_VIEWS = ['your-deck', 'shopping', 'stats', 'notes', 'analysis', 'games', 'versions'] as const;
export type DeckView = (typeof DECK_VIEWS)[number];

/**
 * The feature switches an entry can be tied to (Hugh, 2026-09-25). An entry that names one
 * renders only while that switch is on, and turning it on is what announces it. A closed
 * union, so a misspelled switch is a type error rather than an entry that never appears.
 */
export type AboutSwitch =
  | 'NEVER_CUT_ENABLED'
  | 'SWAP_TOOLS_ENABLED'
  | 'HELP_ME_CHOOSE_ENABLED'
  | 'CHANGE_COMMANDER_ENABLED'
  | 'ANALYSIS_TAB_ENABLED'
  | 'HOW_IT_WORKS_ENABLED'
  | 'TUNING_ENABLED'
  // Suggested changes v2 (handoff design_handoff_the99_suggested_changes_v2): its label's and the credits rule's sentences.
  | 'SUGGESTED_CHANGES_V2_ENABLED'
  | 'DECK_STATS_ENABLED'
  | 'COLLECTION_EDIT_ENABLED'
  | 'COLLECTION_SYNC_ENABLED'
  | 'DECK_BENCHMARKS_ENABLED'
  | 'SHOPPING_MARK_BOUGHT_ENABLED'
  | 'DECK_PRINTINGS_ENABLED'
  | 'DECK_TOKENS_ENABLED'
  | 'MANA_BALANCE_ENABLED'
  | 'ALL_DECKS_CART_ENABLED'
  | 'PRECONS_ENABLED'
  | 'UPCOMING_PRECONS_ENABLED'
  | 'DECK_NOTES_ENABLED'
  | 'ADDED_COPY_ENABLED'
  // Not an env var of its own: on when the Tuning hub draws (two or more of its tools on), which
  // is where History lives. For a line that names History, never for a whole entry.
  | 'TUNING_HUB_ENABLED'
  | 'LINEUP_ENABLED'
  | 'PROPOSED_CUTS_ENABLED'
  | 'FIND_A_DECK_READ_ENABLED'
  | 'NO_COLLECTION_ENTRY_ENABLED'
  // The Social line (Social R3 PR 5, and R2's last PR for the wishlist): friends and pods, opponents in the game log, the wishlist.
  | 'SOCIAL_FRIENDS_ENABLED'
  | 'SOCIAL_GAMES_ENABLED'
  | 'SOCIAL_WISHLIST_ENABLED'
  // The launch-end batch (About batch brief 2026-10-18, Draft vs code 8): the ?, the tour, Rule 0, invites, card search, scanning.
  | 'HELP_PANEL_ENABLED'
  | 'FIRST_RUN_TOUR_ENABLED'
  | 'RULE_ZERO_ENABLED'
  | 'SOCIAL_INVITES_ENABLED'
  | 'CARD_SEARCH_ENABLED'
  | 'CARD_SCAN_ENABLED'
  // Buying credits (#2144): the redrawn credits entry follows the payments line, and its welcome lines their own.
  | 'PAYMENTS_ENABLED'
  | 'WELCOME_CREDITS_ENABLED'
  // The menu and Home line (plan 2026-10-22-menu-home.md): Home's news feed, and Commanders as one place with its tabs.
  | 'HOME_FEED_ENABLED'
  | 'COMMANDERS_PLACE_ENABLED'
  // Friend decks (close-out): the friends key's privacy sentence follows it. Its own entry is deferred (READINESS G6).
  | 'FRIEND_DECKS_ENABLED'
  // Spare requests (close-out): `friend-spares`' variant, which says a spare is view only while it is off.
  | 'SPARE_REQUESTS_ENABLED'
  // Combos one piece away (combos-close close-out): its own entry, and combo-awareness's card-details key.
  | 'NEAR_COMBOS_ENABLED'
  // Strategy focus (handoff design_handoff_the99_strategy_focus): the strategy ring on Analysis and its focus pick.
  | 'STRATEGY_FOCUS_ENABLED'
  // Push notifications (close-out, handoff design_handoff_the99_push): its own entry, and `whats-new`'s news key.
  | 'PUSH_ENABLED'
  // Signature card (close-out, handoff design_handoff_the99_avatar): the friends caption's face sentence follows it.
  | 'SIGNATURE_CARD_ENABLED';

/**
 * A switch as a caption or key LINE names it: the bare name keeps the line while that switch is
 * on, and a leading `!` keeps it while the switch is off (collection edit: `import`'s old
 * warning is false with the switch on, and its replacement is false with it off).
 */
export type AboutLineSwitchOne = AboutSwitch | `!${AboutSwitch}`;
/**
 * One switch, or a list of them that must ALL hold (the menu and Home line: a Help me choose tab line needs the Commanders
 * place AND Help me choose; a friend's spares line needs Friends AND the wishlist).
 */
export type AboutLineSwitch = AboutLineSwitchOne | readonly AboutLineSwitchOne[];

export const aboutCopy = {
  // Hugh's own story (option A, 2026-10-06): why the app exists, what it does and who it's for.
  // Paragraphs split on a blank line, as an entry's caption does (`EntryCaption`).
  pageIntro:
    "There are a lot of Magic: The Gathering apps out there and a lot of them do really great things: ManaBox is the main place I store my collection, Moxfield was my first deck builder, and Deckcheck helped me really understand tuning." +
    '\n\n' +
    "But, no single app really scratched that itch for me. Somewhere I could really see and manage everything. At least not everything I needed. So, I built The 99. Specifically, around the idea that, maybe I would know what commander I want, but it was always arduous to round out the rest of the deck." +
    '\n\n' +
    "How many lands should I have? Is this too many creatures? Do I have any Sol Rings left? Didn’t I crack a pack last week with something I needed? Does this deck even make sense?" +
    '\n\n' +
    'And, like most players, I have hundreds of cards neatly catalogued, tucked away in a big box, conveniently hidden away so I have no idea what I even own. The number of times I’ve bought a single only to realize I owned one is too many to count. Or, worse, realizing I don’t have what I need right before a game.' +
    '\n\n' +
    'The 99 aims to solve this by focusing on your collection first. What do you already own, where is it today, and what do you need more of? From there, it grew to answer more niche questions like "How many Game Changers do I own?", "What bracket does this deck land me in?", "Is there a cheaper alternative for this $300 land?", "Would a different commander run this deck better?"' +
    '\n\n' +
    'And, I hope it keeps growing into something me and my friends can use to build cooler decks, have better game nights, and enjoy this nerdy-ass hobby even more. Because at the end of the day, The 99 is for me and my friends. Something for nerds, by nerds, to do more nerd shit.' +
    '\n\n' +
    'Cheers nerds,' +
    '\n\n' +
    'Hugh',
  newSinceEyebrow: (n: number) =>
    n === 1 ? '1 new since your last visit' : `${n} new since your last visit`,
} as const;

// ---- How the app reaches its answers (handoff about_how_it_works, R1) -----
// Reference rows, not entries: no `since`, no NEW, never in the index. The method tags are shared with the Analysis tab's
// "How we make these decisions" sheet (Hugh, 2026-09-28: five methods, and the
// tags appear in both places). All five are drawn identically on purpose:
// coloring them by trust would be a score.
export type HowMethod = 'rules' | 'decks' | 'model' | 'you' | 'list';

export const howItWorksCopy = {
  methods: {
    rules: { tag: 'rules text' },
    decks: { tag: 'other decks' },
    model: { tag: 'model-written' },
    you: { tag: 'your input' },
    list: { tag: 'published list' },
  },
  /**
   * Which methods each bracket count uses, read by the decisions sheet (and, once it lands, by
   * the appendix's Brackets row). Land denial and extra turns combine Commander Spellbook's estimate with our
   * reading of the rules text (`MLD_DETECTION.methods`, `EXTRA_TURN_DETECTION.methods`); combos
   * are Spellbook's index alone; Game Changers is Wizards' list, read through Scryfall.
   */
  bracketMethods: {
    gameChangers: ['list'],
    landDenial: ['rules', 'decks'],
    extraTurns: ['rules', 'decks'],
    combos: ['decks'],
    tutors: ['rules'],
  },
} as const satisfies {
  methods: Record<HowMethod, { tag: string }>;
  bracketMethods: Record<string, readonly HowMethod[]>;
};

// ---- Account menu ---------------------------------------------------------
// One row, first, above Manage account. No badge, at any width, ever: Home's
// banner is the notification (About visual PR 6b).
export const aboutMenuCopy = {
  label: 'About The 99',
} as const;

// ---- The one-time sheet's words (About R6, STATES-about-r6.md §N, §R8) -----
// The sheet retired (About visual PR 6b). Its first-run heading and Show me
// still word the banner's first-run line (`copy/arrivals.ts`).
export const aboutSheetCopy = {
  // A non-breaking space binds "The 99" wherever the sheet prints it, so a
  // line break can never leave "99" on its own (copy review, 2026-09-25).
  firstRunHeading: 'What The\u00a099 does',
  show: 'Show me',
} as const;
