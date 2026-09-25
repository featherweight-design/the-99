/**
 * Locked (never cut), sub-project 5.1: every string the lock draws, transcribed from the handoff's
 * `never-cut · copy strings.ts`. This module grows with the feature. PR 1 ships the one string its
 * action returns; the mode, the marks and the tuning lines land with the PRs that draw them.
 */
export const lockedCardsCopy = {
  mode: {
    /** Any refusal of a lock toggle: a bad id, a card no longer in the deck, the switch off. */
    refused: "That didn't save. Try again.",
  },
} as const;
