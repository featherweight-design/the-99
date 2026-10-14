// Proposed src/lib/copy/i-got-it.ts. Intent only; every string goes through /copy-review.
// Behind SHOPPING_MARK_BOUGHT_ENABLED && COLLECTION_EDIT_ENABLED. Counts pinned to en-US like collection-edit.ts.

const n = (x: number) => x.toLocaleString("en-US");
const copies = (x: number) => (x === 1 ? "1 copy" : `${n(x)} copies`);

export const gotItCopy = {
  row: {
    // R2: no new visible control. The shipped buy tag is the button; these are its name and states.
    tagAria: (card: string) => `Bought ${card}? Add it to your collection`, // accessible name; the tag's shipped sentence becomes its description
    pending: "adding…", // drawn in the tag's figure slot
    keyBuy: "bought it? press to add it", // key line after a drawn `buy` plate
    keySwap: "cheaper stand-ins", // REPLACES swapToolsCopy's shipped ⇄ key line (Hugh, R2 review: shorter)
    detailsLink: "Bought this card?", // card details from a Shopping row, on the In your collection label line
  },
  confirm: {
    title: "Bought this card?", // the card's name follows on its own line
    printing: "Printing",
    printingCount: (k: number) => (k === 1 ? "the only printing" : `${n(k)} printings`),
    finish: "Finish",
    finishes: { nonfoil: "Nonfoil", foil: "Foil", etched: "Etched" },
    foilOnly: "This printing only comes foil.",
    etchedOnly: "This printing only comes etched.",
    howMany: "How many",
    fewer: "One fewer",
    more: "One more",
    need: (k: number) => `The deck needs ${n(k)}`,
    spare: (k: number) => (k === 1 ? "1 spare" : `${n(k)} spares`),
    max: 20,
    add: (q: number) => `Add ${copies(q)}`,
    choosePrinting: "Choose a printing",
    adding: "Adding…",
    cancel: "Cancel",
    close: "Close",
    staleTitle: "This changed while it was open.",
    staleBody: (need: number) => `A copy was added somewhere else, so the deck needs ${n(need)} now. Nothing was added yet.`,
    staleBodyDone: "A copy was added somewhere else, so the deck needs no more. Add anyway if this is a spare.",
    failedTitle: "That didn't go through.",
    failedBody: "Nothing was added. Try again in a moment.",
  },
  slot: {
    held: (card: string) => `${card} · in your collection`, // the spent-slot shape, until the next read
  },
  receipt: {
    added: (card: string, q: number) => `${card} added · ×${n(q)}`,
    detail: (printing: string, finish: string) => `${printing} · ${finish}`,
    claimed: (deck: string, need: number) =>
      `${deck} is older and was short too, so the copy went there. This deck still needs ${n(need)}.`,
    claimedMany: (decks: number, need: number) =>
      `${n(decks)} older decks were short too, so the copies went there first. This deck still needs ${n(need)}.`,
    partial: (need: number) => `The deck still needs ${n(need)}.`,
    history: "History",
    undo: "Undo",
    undoAria: (card: string) => `Undo adding ${card}`,
    checking: "Checking decks…",
    undoing: "Undoing…",
    undone: (card: string) => `Undone. ${card} is back on the list.`,
    undoneElsewhere: (card: string) => `Undone. ${card} is out of your collection again.`, // the row had stayed
    undoFailed: "Couldn't undo that.",
    undoFailedBody: "The copy is still in your collection. You can revert it from History.",
    openHistory: "Open History",
  },
  // ShortDeckWarning gains one verb. Everything else is collection-edit.ts's shortWarning as shipped.
  shortWarning: {
    titleUndo: (k: number) => `Undoing leaves ${k === 1 ? "a deck" : `${n(k)} decks`} short`,
    confirmUndo: "Undo anyway",
  },
  history: {
    kind: "From Shopping", // collection-edit.ts history.kinds.shopping_mark_bought, now live
    fromDeck: (deck: string) => ({ pre: "From", link: deck, post: "'s Shopping list" }),
    fromDeleted: "From the Shopping list of a deck you've since deleted",
  },
} as const;
