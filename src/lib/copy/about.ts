// src/lib/copy/about.ts — the /about reference page.
//
// The entries themselves live in `about-entries.ts` (discovery plan R2·1a, 2026-10-16); this file
// keeps the page's other copy, ABOUT_VERSION, the entry type and the rules below, which govern
// writing an entry there. The history notes that count entries describe the list as it stood then.
//
// Regenerated for R3 against the R3 canvas. This file previously held R1's 26
// entries under titles the canvas no longer used, with neither `caption` nor
// `keys`; the audit flagged that as the one finding that blocked build rather
// than degrading it. It now matches the canvas entry for entry, in order.
//
// R4: one entry added (`post-import`, #639/#643), `deck-import` and `export`
// corrected against source, `put-back` retitled to `undo-removal`. 33 entries.
//
// BUILD, 2026-09-15 — the six edits in `READINESS-r5-audit.md` §5, applied
// here rather than in a fifth design round. Four of them are features that
// merged after R4 was drawn; the handoff cannot outrun a repo that ships
// daily, which is the whole argument for the per-feature rule in AGENTS.md.
// 34 entries.
//
// The Analysis tab's pair, 2026-09-28 (`design_handoff_the99_analysis_tab/ABOUT-entry.md`):
// `deck-analysis` and `card-marks`, both tied to ANALYSIS_TAB_ENABLED and both `since: 9`
// rather than a bump. A bump redirects every account below the version while the sheet is
// off (`proxy.ts`), and a switched entry is seen by its id, so the switch is what announces
// them. `deck-page` is unedited for the same reason: it has no switch, and with the tab off
// the deck page draws four tabs, so the fifth is named in `deck-analysis` instead.
//
// `suggested-changes`, 2026-10-05 (`design_handoff_the99_deck_description/ABOUT-entry.md`,
// ruling 7): shipped with NO `switch` field, since ANALYSIS_TAB_ENABLED was confirmed `"true"`
// on staging and `"false"` on production and a switch naming it would hide the entry on
// production forever rather than announce it.
//
// 2026-10-08 (Tuning decoupled from the Analysis tab, `src/lib/tuning/flag.ts`): that condition
// no longer holds — a deployment can now run the tab with Suggested changes off. The entry now
// carries `switch: 'TUNING_ENABLED'`, its own flag, rather than ANALYSIS_TAB_ENABLED: Tuning
// already requires the tab (`tuningEnabled(env)` reads both), so naming the narrower switch is
// never looser than naming the tab's. No bump: this is the SAME entry catching up to a flag
// that split under it, not a new capability.
//
// Two OTHER entries name Suggested changes without being its own: `credits`' bullet list and
// `deck-analysis`'s fourth key line (the one about the description it reads). Neither carries
// the whole-entry `switch` — the Overview and the bracket exist with Tuning off — so each
// gates just its own line, via `captionLineSwitches`/`keySwitches`, resolved in `visible.ts`.
//
// Voice: Kitchen Table. An entry explains a thing the app already does, to a
// player who has met it and wants to know what it meant.
//
// RULES, enforced in review:
//   1. `caption` and `keys` are THIS page’s prose and may be written here.
//   2. Every string drawn INSIDE a specimen comes from that surface’s own copy
//      file at render time — never retyped into this file. A rename in
//      refresh.ts or lanes.ts must reach the figure without touching about-entries.ts.
//   3. `keys` is 0–4 entries. Zero is a finished answer, not a gap.
//   4. A figure may only draw what the app draws. Explanatory sentences the
//      product does not ship live in `keys`, never in the specimen.
//   5. `since` is the ABOUT_VERSION in which the entry first appeared.
//
// ABOUT_VERSION is bumped when an entry is added or its caption materially
// changes. about.test.ts pins a content hash, so a change forces either a
// deliberate bump or a deliberate re-pin.

import { numberWord } from './number-words';

/**
 * Where a reader's own daily credit allowance goes in a sentence (admin PR 9c, 2026-10-13). The limit
 * is per account (`dailyLimit`: their group's, else the owner's own, else `MODEL_DAILY_ALLOWANCE`), so
 * the copy holds this slot and the page fills it at render with `fillAllowance`. The content hash
 * reads the slot, so a change of limit is not a change of copy.
 */
export const ALLOWANCE_SLOT = '{allowance}';

/** Fills `ALLOWANCE_SLOT` with the reader's limit, spelled as a number word (11 and up as digits). */
export function fillAllowance(text: string, limit: number, spell: (n: number) => string = numberWord): string {
  return text.split(ALLOWANCE_SLOT).join(spell(limit));
}

/**
 * Moves only for an entry with NO switch: a switched entry is announced by its own id when its switch flips, so its
 * `since` is the version current when it ships and it bumps nothing (as `deck-tokens` did at 14). 15 was spent once
 * (#1840 bumped it for the switched `start-without-a-collection`, then went back): a reader who loaded a page while
 * it was live may have 15 written as their seen version, so the next bump is 16, never 15. 16 is the launch-end batch
 * (2026-10-21), for its one unswitched entry, `about-rebuilt`.
 */
export const ABOUT_VERSION = 16;

export type AboutChapter = '01' | '02' | '03' | '04';
export type AboutWidth = 'inset' | 'plate';

/**
 * Where an entry lives (discovery plan R2·1b, E8): the screens the Reference lists entries by, and the "?" reads
 * against the page a reader stands on, in the order a reader meets them. A deck's seven are one screen, `deck`, told
 * apart by `view`, because the builder changes its tab and panel in place rather than by route.
 */
export const ABOUT_SCREENS = [
  'home', 'collection', 'card-details', 'sets', 'proxies', 'history', 'wishlist', 'upload', 'commanders', 'discover',
  'new-deck', 'decks', 'deck', 'friends', 'account', 'credits',
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
  | 'DECK_STATS_ENABLED'
  | 'COLLECTION_EDIT_ENABLED'
  | 'COLLECTION_SYNC_ENABLED'
  | 'OVERVIEW_V2_ENABLED'
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
  | 'STRATEGY_FOCUS_ENABLED';

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

export interface AboutEntry {
  id: string;
  /** The feature switch this entry follows. None: always drawn, seen by `since`. */
  switch?: AboutSwitch;
  /**
   * The entry this one is drawn IN PLACE OF while it draws (launch-end batch, 2026-10-21): `buying-credits` replaces
   * `credits` for a reader with payments. The replaced entry keeps its own id, switch and seen rule, and draws again the
   * moment this one does not; a link to the replaced id (`#credits`) reaches this one (`drawnEntry`).
   */
  replaces?: string;
  chapter: AboutChapter;
  title: string;
  /** The screen the entry is about (E8). Every entry has exactly one. */
  screen: AboutScreen;
  /** Set exactly when `screen` is `deck`: which of its views. */
  view?: DeckView;
  /**
   * A variant frame of the screen, `<screen>-<frame>`, photographed with the switches that make this entry's surface
   * exist (`whats-new`'s `home-feed`: Home with the feed on). The screen's own frame stays what a reader WITHOUT those
   * switches sees, which is what the entries still drawn there describe (`ready-to-build`).
   */
  frame?: string;
  route: string;
  /** Appended after the route when the link does not land on the page itself. */
  opens?: string;
  /**
   * Read by no renderer since About's reshape (#2013): an opened entry draws its screen's capture. Optional so a new entry
   * leaves it off (launch-end batch, call 8); the entries that carry it keep it until a cleanup drops the field.
   */
  width?: AboutWidth;
  caption: string;
  /**
   * A caption LINE (as it appears literally, including its leading `- `) gated by an ADDITIONAL
   * switch, on top of the entry's own: `visibleEntries` strips it when that switch is off, even
   * though the entry itself draws. For an entry with no `switch` at all (`credits`), this is the
   * only way one line of it can depend on a feature — the entry's content otherwise never varies
   * by switch state (2026-10-08, Suggested changes' own `TUNING_ENABLED`).
   */
  captionLineSwitches?: Partial<Record<string, AboutLineSwitch>>;
  /** 0–4 lines, in numeral order. Read in sequence by a screen reader. */
  keys: string[];
  /** A key line (matched by its own exact text) gated the same way `captionLineSwitches` gates
   *  a caption line — dropped from the resolved entry when its switch is off. */
  keySwitches?: Partial<Record<string, AboutLineSwitch>>;
  /**
   * The key lines were rewritten (Hugh's voice pass, 2026-10-07) and the figure's numbered
   * marks have not been re-placed yet. While true, the key renders as a plain list and the
   * figure's marks are hidden, so no number points at the wrong thing. Remove the flag as each
   * figure's marks are re-pinned; the numeral test then holds that entry to the full contract.
   */
  marksPending?: true;
  /**
   * A second form of the entry behind a switch of its own (collection sync, ruling 5): while that
   * switch is on, and the entry draws at all, it reads this title, caption and keys instead. It is
   * then seen by `<id>@<switch>` rather than its id, so turning the switch on announces it with no
   * `ABOUT_VERSION` bump, exactly as a switched entry is announced.
   */
  variant?: { switch: AboutSwitch; title: string; caption: string; keys: string[] };
  /** Set by `visibleEntries` alone, on an entry drawn in its variant: the switch that chose it. */
  variantOn?: AboutSwitch;
  since: number;
}

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
  dismiss: 'Got it',
  dismissDestination: (route: string) => `takes you to ${route}`,
  dismissDestinationHome: 'takes you home',
} as const;

// ---- How the app reaches its answers (handoff about_how_it_works, R1) -----
// Reference rows, not entries: no `since`, no NEW, never in the index. Behind
// HOW_IT_WORKS_ENABLED. The method tags are shared with the Analysis tab's
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
// One row, first, above Manage account. No badge, at any width, ever — the
// sheet is the notification (the redirect, while ABOUT_SHEET_ENABLED is off).
export const aboutMenuCopy = {
  label: 'About The 99',
} as const;

// ---- The one-time sheet (About R6, STATES-about-r6.md §N, §R8) -------------
// Drawn by the shell over whatever page a document load opened, once per
// browser per version, while `ABOUT_SHEET_ENABLED` is on.
export const aboutSheetCopy = {
  heading: (n: number) => `${n} new in About`,
  // Only ever for two or more: at four titles the card lists all four (§N2).
  more: (n: number) => `and ${n} more`,
  // A non-breaking space binds "The 99" wherever the sheet prints it, so a
  // line break can never leave "99" on its own (copy review, 2026-09-25).
  firstRunHeading: 'What The\u00a099 does',
  firstRunLine:
    'What every mark and figure in the app means, and where to find it, on one page.',
  show: 'Show me',
  later: 'Later',
  where: 'Always in your account menu, under About The\u00a099.',
  regionLabel: 'New in About',
  regionLabelFirstRun: 'About The\u00a099',
} as const;
