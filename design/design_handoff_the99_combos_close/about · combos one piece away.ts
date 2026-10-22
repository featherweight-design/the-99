// about · combos one piece away.ts. Account 2, 2026-10-22, R1. The combos one piece away line's About entry, as it goes
// into `aboutEntries` in src/lib/copy/about-entries.ts, with Design's picture call (`screen`, `view`, and the halo as a
// `locator` for scripts/lib/about-locators.mjs).
//
// WORDS: placeholders, for /copy-review.
// PLACE: A deck · Your deck, after `decklist-marks`.
// VERSION: one ABOUT_VERSION bump. `since: 18` if the menu and Home line ships 17 first, otherwise 17.
// SWITCH: AboutSwitch gains COMBOS_CLOSE_ENABLED.

export const combosOneAway = {
  id: 'combos-one-away',
  screen: 'deck',
  view: 'your-deck',
  chapter: '03',
  title: 'Combos one card away',
  route: '/decks',
  opens: 'opens a deck',
  width: 'plate',
  switch: 'COMBOS_CLOSE_ENABLED',
  caption:
    'Some decks are one card short of a combo. The line under the deck’s header, beside its version, says how many: “5 combos one piece away”.\n\nPress it for the list. Each combo says where its missing card is:\n\n- A spare in your collection\n- In another of your decks, with a link to that deck\n- To buy, with its price\n\nOpen one to see how it works, step by step, and the mana it needs. You can add the missing card from there.\n\nA card’s details list its combos the same way, with the pieces you already hold.',
  keys: [
    'Only two-card combos in this deck’s colors are counted.',
    'The turn-again mark is a combo that gives you extra turns.',
    'Combos, their steps and their mana come from Commander Spellbook.',
  ],
  since: 18,
} as const;

// EDIT to a shipped entry, no bump of its own, with COMBOS_CLOSE_ENABLED on:
//   'combo-awareness', key 1:
//     'A card’s details list every partner: this deck’s first, then ones you own, then ones to buy.'
//     -> 'A card’s details list every combo: whole in this deck first, then one piece away, with where that piece is.'

// LOCATOR (scripts/lib/about-locators.mjs):
//   'combos-one-away': { screen: 'deck-your-deck', locator: the status-line segment, e.g. "[data-combos-close]" }   // scope: main
