// about · giving a deck a focus.ts. Account 2, 2026-10-22, R2g. The strategy focus About entry, as it goes into
// `aboutEntries` in src/lib/copy/about-entries.ts, with Design's picture call (`screen`, `view`, and the halo as a
// `locator` for scripts/lib/about-locators.mjs).
//
// WORDS: placeholders, for /copy-review.
// PLACE: chapter 04, after the mana balance entry.
// VERSION: the launch-end batch's one ABOUT_VERSION bump.
// SWITCH: AboutSwitch gains the feature's switch; STRATEGY_FOCUS_ENABLED is a placeholder, eng names it.

export const deckFocus = {
  id: 'deck-focus',
  screen: 'deck',
  view: 'analysis',
  chapter: '04',
  title: 'Giving a deck a focus',
  route: '/decks',
  opens: 'opens a deck’s Analysis tab',
  width: 'plate',
  switch: 'STRATEGY_FOCUS_ENABLED',
  caption:
    'What is this deck about? Under Analysis, The deck’s strategy rings up to five themes the deck is built around, counted from the list against every Commander card: a creature type, a theme like Tokens, or a card type. Pick one as the deck’s focus, and its icon takes the middle of the ring.\n\nWith a focus picked, Suggested changes aims at it: its additions lean toward the focus, and each says how far it moves it. Apply one and its arc grows.',
  keys: [
    'The graph and the focus are free. Suggested changes uses a credit, as it always has.',
    'Keep it balanced clears the focus.',
    'Lands aren’t counted, so a landfall deck reads its payoffs, not its lands.',
  ],
} as const;

// EDIT to a shipped entry, no bump of its own: Suggested changes gains one line,
// 'It aims at the deck’s focus when one is picked.'
