// Custom deck order: the sort menu's row and Arrange mode (handoff
// `design/design_handoff_the99_deck_flip_order/`, #2990). Strings are DRAFT until /copy-review.

export const deckOrderCopy = {
  /** The sort menu's door into Arrange mode, on All decks and on a shelf. */
  arrangeAll: "Arrange decks…",
  arrangeShelf: (shelf: string) => `Arrange ${shelf}…`,
  /** The page heading in Arrange mode, and the eyebrow above it. */
  headingAll: "Arrange decks",
  headingShelf: (shelf: string) => `Arrange ${shelf}`,
  eyebrowAll: (n: number) => `ALL DECKS · ${n}`,
  eyebrowShelf: (shelf: string, n: number) => `FOLDER · ${shelf.toUpperCase()} · ${n}`,
  hint: "Drag a deck by its handle. Filters and search come back when you’re done.",
  shelfNote:
    "Moves these decks among themselves. Your other decks keep their places in All decks.",
  cancel: "Cancel",
  done: "Done",
  saving: "Saving…",
  failed: "Couldn’t save the order. Try Done again.",
  /** The leave guard. */
  leaveTitle: "Leave without saving?",
  leaveBody: "Your new order isn’t saved yet. Leave now and your decks stay as they were.",
  keep: "Keep arranging",
  discard: "Discard",
  /** The handle's accessible name, and the live region's lines. */
  handle: (name: string) => `Move ${name}`,
  lifted: (name: string, k: number, n: number) => `${name} lifted, ${k} of ${n}. Use the arrow keys, then Space to drop.`,
  position: (name: string, k: number, n: number) => `${name}, ${k} of ${n}`,
  dropped: (name: string, k: number, n: number) => `${name} dropped, ${k} of ${n}`,
  cancelledLift: (name: string) => `${name} back where it was`,
} as const;
