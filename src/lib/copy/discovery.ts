// Discovery R2 and R3 (plan `2026-10-16-discovery-r2-r3.md`): the showcase, the "?" on every screen, the
// first-run tour and tools where the need is. Handoff: `design/design_handoff_the99_discovery_onboarding/`,
// copy from `discovery-r2 · copy strings.ts` after /copy-review. Each PR of the line adds the strings it ships.

import type { AboutScreen, DeckView } from './about';
import type { SwitchName } from '../switches/registry';

/** Each screen's name as the Reference and the "?" print it (README-r2, "Screens: every entry's `screen`"). */
export const SCREEN_NAMES: Record<AboutScreen, string> = {
  home: 'Home',
  collection: 'Collection · Cards',
  'card-details': 'Card details',
  sets: 'Collection · Sets',
  proxies: 'Collection · Proxies',
  history: 'Collection · History',
  wishlist: 'Collection · Wishlist',
  upload: 'Upload a file',
  commanders: 'Commanders',
  discover: 'Discover',
  'new-deck': 'New deck and precons',
  decks: 'Decks',
  deck: 'A deck',
  friends: 'Friends',
  account: 'Account menu',
  settings: 'Settings',
  credits: 'Credits',
};

export const DECK_VIEW_NAMES: Record<DeckView, string> = {
  'your-deck': 'Your deck',
  shopping: 'Shopping',
  stats: 'Stats',
  notes: 'Notes',
  analysis: 'Analysis',
  games: 'Games',
  versions: 'Versions',
};

/** `A deck · Shopping`, or a screen with no view by its own name. */
export function screenName(place: { screen: AboutScreen; view?: DeckView }): string {
  const screen = SCREEN_NAMES[place.screen];
  return place.view ? `${screen} · ${DECK_VIEW_NAMES[place.view]}` : screen;
}

// ---- R2·5 · About's tabs and the Tools tab (README-r2 C1 to C3, R2b). /copy-review 2026-10-17: the none-lines speak
// of a full deck, never 99 (R2 gap 2); the options-A/B keys are dropped (R2 gap 14); every tool that needs a deck has a
// none-line, and Friends' spares' names no friend, since nothing the page reads can say which one.

export const aboutShapeCopy = {
  title: 'About The 99',
  referenceSub: 'Every entry, by the screen it lives on.',
  reference: 'Reference',
} as const;

export type ToolCopy = {
  name: string;
  line: string;
  /** The line's form while a switch is on for the reader, in place of `line` (Small items 6, item 3, call c). Resolved
   *  per reader by `toolCardOf`, as a label's sentences are; the first switch on wins. */
  lineWhen?: Partial<Record<SwitchName, string>>;
  /** Where Try it goes for a tool that opens no deck, drawn as the card's footer (an arrow ring follows it). */
  press?: string;
  /** What the tool needs when no deck fits it. */
  none?: string;
  /** Somewhere useful to go when none fits. */
  door?: string;
};

/** Find a deck and Stats for your decks open a page, but read the reader's decks: with none, they say so. */
const NEEDS_A_DECK = 'Needs a deck, and you have none yet.';
const NEEDS_A_FULL_DECK = 'Needs a full deck. None of yours is full yet.';

export const showcaseCopy = {
  /** A tool card's picture. */
  pictureAlt: (name: string) => `${name}, on a real screen of the app`,
  /** Every tool that reads the reader's decks, when they have none. */
  needsADeck: NEEDS_A_DECK,
  /** Collection Sync with no earlier upload to merge against (G14): the card still offers the upload. */
  syncNoBase: 'Needs a file you uploaded before. Your first one starts it.',
  /** A deck card's one button (About R4 board 5), and so its accessible name. */
  tryOn: (deck: string) => `Try it on ${deck}`,
  tools: {
    'help-me-choose': { name: 'Help me choose', line: 'Say what you want, and we’ll rank commanders by how well they fit it, owned or not.', press: 'Open Help me choose' },
    precons: { name: 'Precons', line: 'Any Commander precon, with how many of its cards you already own.', press: 'Browse precons' },
    'top-off': { name: 'Top off', line: 'Ranks your own cards for a deck’s open slots. Nothing is added until you say so.', none: 'Needs a deck with open slots. All of yours are full.' },
    'proposed-cuts': { name: 'Proposed cuts', line: 'Counts where a deck runs long. A deeper look names the cuts.', none: 'Needs a deck that runs long. None of yours does.' },
    'suggested-changes': {
      name: 'Suggested changes',
      line: 'Up to five swaps, read from your games, your notes and the list.',
      // Suggested changes v2's Try it line, verbatim from its handoff (`suggested-changes-v2 · copy strings.ts`,
      // about.tryIt), as the About-Errata board draws it.
      lineWhen: { SUGGESTED_CHANGES_V2_ENABLED: 'Say what to change. Pick from more cards to add and to cut than you need.' },
      none: NEEDS_A_FULL_DECK,
    },
    'mana-balance': { name: 'Mana Balance', line: 'Counts every source of each color against what your spells ask for.', none: NEEDS_A_FULL_DECK },
    'stand-ins': { name: 'Cheaper stand-ins', line: 'For a card over your price limit: cards that do the same job for less.', none: 'Needs a card over a deck’s price limit. None of yours has one.' },
    'friend-spares': { name: 'Friends’ spares', line: 'A friend’s spare copy of a card your deck still needs, before you buy one.', none: 'Needs a friend with a spare of a card you’re missing. No one has one right now.', door: 'Open Friends →' },
    'find-a-deck': { name: 'Find a deck', line: 'Reads your decks for the one a card you own fits best.', press: 'Try it on a card you own', none: NEEDS_A_DECK },
    wishlist: { name: 'Wishlist', line: 'Cards you want that no deck is asking for. A card leaves once you have enough.', press: 'Open your wishlist' },
    'collection-sync': { name: 'Collection Sync', line: 'Merges a new file with what you changed here, card by card, and asks only where both moved.', press: 'Upload a file' },
    matchups: { name: 'Matchups', line: 'Splits a deck’s games by the commander, colors or friend across the table.', none: 'Needs a game logged with who you played against.' },
    lineup: { name: 'Stats for your decks', line: 'Every deck side by side: when each last played, and how it went.', press: 'See your decks on Stats', none: NEEDS_A_DECK },
    friends: { name: 'Friends and pods', line: 'Add the people you play with, then seat them when you log a game.', press: 'Open Friends' },
  } satisfies Record<string, ToolCopy>,
} as const;

/**
 * Written for you (R2b): the credits entry's five spenders. Each row's `line` is the credits entry's caption line it
 * stands for, so a row is drawn only while its line survives `captionLineSwitches` (decision 3).
 */
export const writtenForYouCopy = {
  rows: [
    { id: 'overview', line: '- Writing a deck’s Overview', name: 'Overview', where: 'A deck’s Analysis tab', what: 'Reads the whole list and says what the deck does and how it wins.', cost: '1 credit each', short: 'each' },
    { id: 'suggested', line: '- Each “Suggested changes” run', name: 'Suggested changes', where: 'A deck’s Analysis tab', what: 'Up to five swaps, read from your games, your notes and the list.', cost: '1 credit per run', short: 'per run' },
    { id: 'look-deeper', line: '- Each “Look deeper” in Proposed cuts', name: 'Look deeper, in Proposed cuts', where: 'A deck’s Analysis tab', what: 'Names the cards to cut, not just where the deck runs long.', cost: '1 credit per look', short: 'per look' },
    { id: 'help-me-choose', line: '- Each new “Help me choose” search where you fill in “Anything else?”', name: 'Help me choose, with “Anything else?”', where: 'New deck', what: 'Reads what you type and ranks commanders against it.', cost: '1 credit per search', short: 'per search' },
    { id: 'find-a-deck-read', line: '- Each “Which deck needs it most?” read', name: 'Which deck needs it most?', where: 'A card’s details', what: 'Takes a card through each deck’s plan and names the ones it really helps.', cost: '1 credit per read', short: 'per read' },
  ],
  /** The `suggested` row's words while the reader's SUGGESTED_CHANGES_V2_ENABLED is on (Hugh 2026-10-30): v2 asks how many
   *  cards to change, up to 20 (`MAX_COUNT`), and costs 1 credit for 1 to 10 changes and 2 for more than 10.
   *  `writtenForYou` swaps them in. */
  suggestedV2: { what: 'Up to 20 swaps, as many as you ask for. Your words lead, then your games, your notes and the list.', cost: '1 credit, 2 over 10 changes', short: '1 or 2 per run' },
  /** The free line, whole while the credits entry still carries its History line, else its bracket half alone. */
  historyLine: 'Opening a past “Help me choose” run from History is free.',
  free: 'Finding a deck’s bracket is free, and so is reopening a past Help me choose.',
  freeBracket: 'Finding a deck’s bracket is free.',
} as const;

// ---- R2·6a · the Reference tab (README-r2 C5, R2b's note). /copy-review 2026-10-17: the search's none and note lines
// replace the shipped title-only ones (G17); `reachesThis` names the shipped How it works row an entry points at.

/** Where each screen lives, printed beside its head (`/collection`, `a deck`). */
export const SCREEN_WHERE: Record<AboutScreen, string> = {
  home: '/',
  collection: '/collection',
  'card-details': 'any card',
  sets: '/collection/sets',
  proxies: '/collection/proxies',
  history: '/collection/history',
  wishlist: '/collection/wishlist',
  upload: '/collection/replace',
  commanders: '/commanders',
  discover: '/discover',
  'new-deck': '/decks/new',
  decks: '/decks',
  deck: 'a deck',
  friends: '/friends',
  account: 'everywhere',
  settings: '/settings',
  credits: '/credits',
};

export const referenceCopy = {
  search: 'Find an entry',
  clear: 'Clear search',
  inTools: 'in Tools',
  count: (n: number) => (n === 1 ? '1 entry' : `${n} entries`),
  hits: (n: number, q: string) => (n === 1 ? `1 entry mentions “${q}”` : `${n} entries mention “${q}”`),
  none: (q: string) => `Nothing in About mentions “${q}”.`,
  noneNote: 'Search reads every entry’s title and text, on every screen.',
  noneOut: 'See every entry →',
  screensLabel: 'Screens',
  howIndex: 'How it works',
  reachesThis: 'How the app reaches this ›',
  /** An opened entry's own name for its frame. */
  frameAlt: (title: string, screen: string) => `${title}, on ${screen}`,
} as const;

export const creatorNoteCopy = {
  title: 'A note from the creator',
  row: 'Why The 99 exists, and who it’s for.',
  close: 'Close',
} as const;

// ---- R2·8 · the ? (README-r2 C4; design table `discovery-r2-8-help.md`). Its panel retired with About visual PR 6a:
// the ? now opens its screen's About page.

export const helpPanelCopy = {
  /** The aria-label of the ? in the rail and the header. */
  button: 'About this screen',
} as const;

/**
 * `Take the tour` (discovery R3·2, plan decision 6): the account menu's row directly under About The 99, and About's
 * head press after the subtitle, drawn as `Open the Reference →` is. Both go to `TOUR_HREF`. Its own export, so the shell
 * carries these two strings and not the tour's.
 */
export const tourAgainCopy = { menu: 'Take the tour', aboutPress: 'Take the tour →' } as const;

/** Where both presses go: Home, which starts the tour and strips the parameter. */
export const TOUR_PARAM = 'tour';
export const TOUR_HREF = `/?${TOUR_PARAM}=1`;

/**
 * The first-run tour (discovery R3·1b; handoff `discovery-r3 · copy strings.ts`, `tourCopy`). The card is a modal
 * dialog labelled by its title; `lit` names what each step points at, for the dialog's description.
 */
export const tourCopy = {
  kicker: (n: number, of: number, place: string) => `${n} of ${of} · ${place}`,
  progressAria: (n: number, of: number) => `Step ${n} of ${of}`,
  skip: 'Skip the tour',
  back: 'Back',
  next: 'Next',
  finish: 'Finish',
  litAria: (control: string) => `Pointing at ${control}.`,
  lit: {
    collection: 'Add your collection',
    /** The tour taken again on a dashboard (R3·2): step 1 points at the Collection slot. */
    collectionSlot: 'Collection',
    commanders: 'Commanders',
    decks: 'Decks',
    account: 'the account menu',
    banner: 'the line on Home',
  },
  steps: {
    collection: {
      place: 'Collection',
      title: 'Start with what you own',
      body: 'Everything here is built from your collection. Drop in a file from ManaBox, Moxfield, Archidekt or Deckbox.',
      /** The middle part is the shipped `Precons I own`, drawn in `--fg` 600. */
      precons: { lead: 'No file?', rest: 'adds every card in the boxes you have, at their own printings.' },
      foot: 'Six stops · about a minute · ✕ skips the tour',
      /** The tour taken again with the nav unlocked (R3·2); a locked dashboard keeps `body`. /copy-review 2026-10-17. */
      replayBody: 'Everything here is built from your collection. Drop in a new file whenever it changes.',
    },
    commanders: {
      place: 'Commanders',
      title: 'See what you could build',
      body: 'Every commander your cards can lead, ranked by how much of the 99 you already own. It opens once your cards are in.',
      picture: 'Commanders, once your cards are in',
      pictureAlt: 'Commanders, on a real collection',
      /** Unlocked replay (R3·2): the shipped body less its lock sentence, and a caption with no lock in it. */
      replayBody: 'Every commander your cards can lead, ranked by how much of the 99 you already own.',
      replayPicture: 'Commanders, on someone else’s cards',
    },
    decks: {
      place: 'Decks',
      title: 'Build it, tune it, play it',
      body: 'Pick a commander and the 99 is assembled from your cards. Then tune it, track it and log the games it plays.',
      picture: 'A deck, once you build one',
      pictureAlt: 'A deck page, on a real deck',
      /** Unlocked replay (R3·2). */
      replayPicture: 'A deck, built by someone else',
    },
    buying: {
      place: 'Buying',
      title: 'Know what it’s missing',
      body: 'Each deck’s Shopping lists the cards you still need and what they cost, with one link to buy them. It lives inside Decks.',
      picture: 'Shopping, inside every deck',
      pictureAlt: 'A deck’s Shopping, on a real deck',
    },
    look: {
      place: 'Your look',
      title: 'Pick your look',
      body: 'Six themes, one for every playmat. Change it any time in your account menu, under Theme.',
    },
    whatsNew: {
      place: 'What’s new',
      title: 'New things land here',
      /** Dropped when Home draws no line to light (R3 gap 6). */
      body: 'When the app learns something, one line on Home says so. This one opens About: every tool, mark and figure, by screen.',
      noteLead: 'There are a lot of Magic: The Gathering apps out there and a lot of them do really great things…',
      notePress: 'Read the note ›',
    },
  },
} as const;
