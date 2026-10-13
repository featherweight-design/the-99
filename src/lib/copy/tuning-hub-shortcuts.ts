// The Tuning hub's shortcuts: the labels on the deck spine's Proposed cuts and Balance mana presses.
// Their own module so the spine, which draws on every Home and deck page, does not carry the rest of the
// hub's strings; `tuning-hub.ts` includes them as `tuningHubCopy.shortcuts`, unchanged for everyone else.

export const tuningHubShortcutsCopy = {
  proposedCuts: "Proposed cuts →",
  balanceMana: "balance mana →",
  balanceManaShort: "balance →",
  /** Reworded by /copy-review: R3 retired the handoff's `{color} is short`, so the name says what
   *  the press does and never judges a color. */
  balanceManaAria: (have: number, target: number) => `Land, ${have} of ${target}. Open Mana Balance.`,
} as const;
