/**
 * Move a copy to another deck later (#2980): the doors and the Other decks disclosure.
 *
 * DRAFT STRINGS pending /copy-review, transcribed from design/design_handoff_the99_move_copy (README G4).
 * The chooser's own words (`gotItCopy.receipt`, `cardAssignmentsCopy.contested`) are reused, not restated.
 */

const n = (x: number) => x.toLocaleString("en-US");

export const moveCopyCopy = {
  /** The title above the chooser when two or more copies are in play. */
  titleMany: "Where these copies go",
  /** Card details: the Change door at the end of the `In your decks` heading. */
  door: {
    label: "Change",
    aria: (card: string) => `Change where ${card} goes`,
  },
  /** The chooser when card details cannot read it live. */
  loadFailed: "Couldn’t load your decks just now. Try again in a moment.",
  other: {
    heading: (decks: number) => `Other decks · ${n(decks)}`,
    group: (card: string) => `Other decks that could take ${card}`,
    find: "Find a deck",
    findNone: "No deck by that name.",
    cards: (count: number) => `${n(count)} ${count === 1 ? "card" : "cards"}`,
    makes: (total: number) => `makes ${n(total)}`,
    adds: "adds it",
    addsGets: "adds it · gets it",
    /** Under the rows, nothing picked: what a pick does, and that off-color decks are not listed. */
    foot: (card: string) => `Picking one adds ${card} to its draft. Decks outside its colors aren’t listed.`,
    /** Under the rows, a pick standing. */
    footPicked: (card: string, deck: string) =>
      `${card} goes into ${deck}’s draft and gets this copy when you commit. Tap it again to undo.`,
    a11yOption: (deck: string, outcome: string) => `${deck}, ${outcome}`,
    a11ySelected: (deck: string) => `${deck}, picked. Tap to undo.`,
    announcedPick: (card: string, deck: string) => `${card} added to ${deck}’s draft. ${deck} gets the copy when you commit.`,
    announcedUndo: (card: string, deck: string) => `Undone. ${card} is no longer headed to ${deck}.`,
  },
  /** Refusals keep the shipped row's sentences where one exists; these are the new causes. */
  refused: {
    listsIt: (deck: string, card: string) => `${deck} lists ${card} now. Nothing moved.`,
    notCommitted: (deck: string) => `${deck} hasn’t been committed yet, so it can’t be given a copy. Nothing moved.`,
    couldNot: (deck: string, card: string) => `Couldn’t add ${card} to ${deck}. Nothing moved.`,
  },
} as const;
