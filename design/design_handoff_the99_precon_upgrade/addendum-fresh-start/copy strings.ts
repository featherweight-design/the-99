// Upgrade this precon · addendum fresh start (R1 2026-11-15, R2 2026-11-18). DRAFT for /copy-review.
// Add to preconUpgradeCopy.history in src/lib/copy/precon-upgrade.ts. Retires `history.past`.
export const freshStartCopy = {
  /** The start screen's kicker over the newest kept run, in History's month-heading style. */
  kicker: "Your last upgrade",
  /** The row's second line, after `swaps` / `short`: where the run went. */
  inDeck: (deck: string) => `in ${deck}`,
  notYet: "no deck yet",
  /** The dashed note on a used run, opened from the start screen or History. */
  usedNote: (deck: string) => `Already in ${deck}. Opening it again uses no credit.`,
  /** R2 (#2985): the result's lists, picks, tally and bar lines are suggestedChangesV2Copy as shipped. The bar's press reads
   *  preconUpgradeCopy.results.start(n) / preconUpgradeDeckCopy.apply(n), n = picked adds (= picked cuts). No new strings. */
} as const;
