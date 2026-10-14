/**
 * The 99 — Home
 * Production-final copy for the home page after the parity pass.
 * Voice: see design_handoff_the99_richness/README.md. Figures are always printed, never rounded
 * away; the app states what it knows and never congratulates the player.
 */

export const homeCopy = {
  // ── Header ──────────────────────────────────────────────────────────────────
  // A greeting, not a claim. The claim is the kicker above it.
  greeting: 'Welcome back',
  // Collection size and freshness. Both figures, always both.
  kicker: (cards: string, when: string) => `${cards} cards · read ${when}`,

  updateCollection: 'Update collection',
  newDeck: 'New deck',

  // ── Ready to build ──────────────────────────────────────────────────────────
  readyHeading: 'Ready to build',
  fitChip: (score: number) => `${score} /100 fit`,
  fitLine: (fit: string, inUse: string) => `${fit} of your cards fit ${inUse} in use`,
  seePool: 'See the pool',
  moreCommanders: (n: number, floor: number) => `${n} more scored ${floor} or better`,
  allCommanders: 'All commanders',

  // ── Pick up where you left off ──────────────────────────────────────────────
  resumeHeading: 'Pick up where you left off',
  // The caption is how the block says what its order means. It is not a control.
  resumeSortCaption: 'last touched',

  /**
   * The touched stamp. The verb names the event that won the sort, so the server must return
   * which column was most recent — not only the date.
   * Relative, never absolute: the figure answers "how stale is this".
   */
  touched: {
    edited: (t: string) => `edited ${t}`,
    committed: (t: string) => `committed ${t}`,
    played: (t: string) => `played ${t}`,
    imported: (t: string) => `imported ${t}`,
  },
  // Elapsed strings, lower case, no "just now" (a stamp of 0 is not news).
  elapsed: {
    hours: (h: number) => `${h}h ago`,
    yesterday: 'yesterday',
    days: (d: number) => `${d}d ago`,
    weeks: (w: number) => `${w}w ago`,
    months: (m: number) => `${m}mo ago`,
  },

  deckCount: (have: number, of: number) => `${have} / ${of}`,

  // Footer of the resume block. Carries the total the deleted "Your decks" heading used to.
  // Absent when `more` is 0.
  moreDecks: (more: number) => `${more} more deck${more === 1 ? '' : 's'}`,
  allDecks: (total: number) => `All ${total} decks`,

  // ── Commitments ─────────────────────────────────────────────────────────────
  // Identical at both widths. Mounted last on the phone.
  commitmentsHeading: 'Commitments',
  cardsInUse: 'Cards in use',
  cardsInUseValue: (used: string, total: string) => `${used} of ${total}`,
  spokenForTwice: 'Spoken for twice',
  spokenForTwiceValue: (n: number) => `${n} card${n === 1 ? '' : 's'}`,
  toBuyAllDecks: 'To buy, all decks',
  toBuyAllDecksValue: (n: number, money: string) => `${n} · ${money}`,
  reviewCommitments: 'Review commitments',

  // ── Accessibility ───────────────────────────────────────────────────────────
  // The row's name carries what the stamp and chip say visually.
  resumeRowA11y: (deck: string, status: string, touched: string) =>
    `${deck}, ${status.toLowerCase()}, ${touched}`,
  resumeBlockA11y: 'Your decks, most recently touched first',
} as const;

/**
 * DELETED WITH THIS CHANGE — remove the strings and the block that used them.
 * Nothing else on home references them; the count moves into `allDecks(total)`.
 *
 *   homeCopy.decksHeading      = (n) => `Your decks · ${n}`
 *   homeCopy.decksMore         = (n) => `${n} more`
 *   homeCopy.decksAll          = 'All decks'
 *
 * `allDecks(17)` reads "All 17 decks", so the total is now inside the control that goes there
 * rather than above a list that duplicated /decks.
 */
