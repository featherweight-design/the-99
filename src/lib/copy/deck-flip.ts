// The deck page's flip strip (handoff `design_handoff_the99_deck_flip_order`): the way back to the list and the step to the
// deck before or after it. The left word is the shelf the reader came from (`folderCopy.shelves`), or All decks.

import { folderCopy } from "./folders";

export const deckFlipCopy = {
  /** The left link when the reader did not come from a shelf. */
  allDecks: folderCopy.shelves.all,
  /** The strip's landmark. */
  region: "Flip between decks",
  /** `2 of 5`. */
  place: (k: number, n: number) => `${k} of ${n}`,
  /** The two squares. The key hint rides the desktop name only: a phone has no arrow keys. */
  prev: (name: string, keyHint: boolean) => `Previous deck · ${name}${keyHint ? " (←)" : ""}`,
  next: (name: string, keyHint: boolean) => `Next deck · ${name}${keyHint ? " (→)" : ""}`,
} as const;

/** The deck page's loading skeleton (handoff `design_handoff_the99_deck_flip_skeleton`): one line for a screen reader. */
export const deckOpenLoadingCopy = {
  status: "Opening your deck",
  /** With the deck's name in hand (a press that carried it). */
  opening: (name: string) => `Opening ${name}`,
} as const;
