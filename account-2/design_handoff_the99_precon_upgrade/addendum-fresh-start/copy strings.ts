// Upgrade this precon · addendum fresh start (R1, 2026-11-15). DRAFT for /copy-review.
// Add to preconUpgradeCopy.history in src/lib/copy/precon-upgrade.ts. Retires `history.past`.
export const freshStartCopy = {
  /** The start screen's kicker over the newest kept run, in History's month-heading style. */
  kicker: "Your last upgrade",
  /** The row's second line, after `swaps` / `short`: where the run went. */
  inDeck: (deck: string) => `in ${deck}`,
  notYet: "no deck yet",
  /** The dashed note on a used run, opened from the start screen or History. */
  usedNote: (deck: string) => `Already in ${deck}. Opening it again uses no credit.`,
  /** R1b: rejecting a swap. */
  reject: {
    press: "Reject",
    aria: (add: string) => `Reject this swap: keep the cut, don’t add ${add}`,
    undo: "Bring it back",
    undoAria: (add: string) => `Bring back the swap that adds ${add}`,
    rejected: "Rejected.",
    stays: (cut: string) => `${cut} stays in the deck.`,
    count: (n: number) => `${n} rejected`,
  },
} as const;
