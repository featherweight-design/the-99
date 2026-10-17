// Discovery R2 and R3 (plan `2026-10-16-discovery-r2-r3.md`): the showcase, the "?" on every screen, the
// first-run tour and tools where the need is. Handoff: `design/design_handoff_the99_discovery_onboarding/`,
// copy from `discovery-r2 · copy strings.ts` after /copy-review. Each PR of the line adds the strings it ships.

import type { AboutScreen, DeckView } from './about';

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
  toolsSub: 'What each tool is for, shown on the screen it lives on.',
  referenceSub: 'Every entry, by the screen it lives on.',
  tabs: { label: 'About', tools: 'Tools', reference: 'Reference' },
  /** From `md`, beside the tabs, and only with the ? drawn (`HELP_PANEL_ENABLED`). Split around the ? glyph. */
  helpHint: { before: 'Every screen has a', after: 'for its own entries' },
  toReference: 'Everything else the app does is in the Reference, by screen.',
  toReferencePress: 'Open the Reference →',
} as const;

export type ToolCopy = {
  name: string;
  line: string;
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
  groups: {
    start: { label: 'Start a deck', sub: 'before there is a list' },
    tune: { label: 'Tune it', sub: 'once there is a list' },
    buy: { label: 'Buy smarter', sub: 'for what you don’t own' },
    own: { label: 'Use what you own', sub: 'your Collection' },
    play: { label: 'Play', sub: 'after the game' },
  },
  /** The 390 group count: the cards run sideways. */
  swipe: (n: number) => `${n} · swipe`,
  howItWorks: 'How it works ›',
  /** A tool card's picture. */
  pictureAlt: (name: string) => `${name}, on a real screen of the app`,
  /** Every tool that reads the reader's decks, when they have none. */
  needsADeck: NEEDS_A_DECK,
  /** Collection Sync with no earlier upload to merge against (G14): the card still offers the upload. */
  syncNoBase: 'Needs a file you uploaded before. Your first one starts it.',
  /** Option C's footer: where the card opens, and how many other decks fit. */
  opens: (deck: string, more: number) => (more > 0 ? `Opens ${deck} · +${more}` : `Opens ${deck}`),
  /** The card's accessible name when it opens a deck. */
  tryOn: (deck: string) => `Try it on ${deck}`,
  tools: {
    'help-me-choose': { name: 'Help me choose', line: 'Say what you want, and we’ll rank commanders by how well they fit it, owned or not.', press: 'Open Help me choose' },
    precons: { name: 'Precons', line: 'Any Commander precon, with how many of its cards you already own.', press: 'Browse precons' },
    'top-off': { name: 'Top off', line: 'Ranks your own cards for a deck’s open slots. Nothing is added until you say so.', none: 'Needs a deck with open slots. All of yours are full.' },
    'proposed-cuts': { name: 'Proposed cuts', line: 'Counts where a deck runs long. A deeper look names the cuts.', none: 'Needs a deck that runs long. None of yours does.' },
    'suggested-changes': { name: 'Suggested changes', line: 'Up to five swaps, read from your games, your notes and the list.', none: NEEDS_A_FULL_DECK },
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
  title: 'Written for you',
  sub: 'uses credits',
  intro: (allowance: string) => `These write something just for you, so each uses a credit. You get ${allowance}, and each comes back 24 hours after you use it.`,
  rows: [
    { id: 'overview', line: '- Writing a deck’s Overview', name: 'Overview', where: 'A deck’s Analysis tab', what: 'Reads the whole list and says what the deck does and how it wins.', cost: '1 credit each', short: 'each' },
    { id: 'suggested', line: '- Each “Suggested changes” run', name: 'Suggested changes', where: 'A deck’s Analysis tab', what: 'Up to five swaps, read from your games, your notes and the list.', cost: '1 credit per run', short: 'per run' },
    { id: 'look-deeper', line: '- Each “Look deeper” in Proposed cuts', name: 'Look deeper, in Proposed cuts', where: 'A deck’s Analysis tab', what: 'Names the cards to cut, not just where the deck runs long.', cost: '1 credit per look', short: 'per look' },
    { id: 'help-me-choose', line: '- Each new “Help me choose” search where you fill in “Anything else?”', name: 'Help me choose, with “Anything else?”', where: 'New deck', what: 'Reads what you type and ranks commanders against it.', cost: '1 credit per search', short: 'per search' },
    { id: 'find-a-deck-read', line: '- Each “Which deck needs it most?” read', name: 'Which deck needs it most?', where: 'A card’s details', what: 'Takes a card through each deck’s plan and names the ones it really helps.', cost: '1 credit per read', short: 'per read' },
  ],
  /** The free line, whole while the credits entry still carries its History line, else its bracket half alone. */
  historyLine: 'Opening a past “Help me choose” run from History is free.',
  free: 'Finding a deck’s bracket is free, and so is reopening a past Help me choose.',
  freeBracket: 'Finding a deck’s bracket is free.',
  how: 'How credits work ›',
} as const;
