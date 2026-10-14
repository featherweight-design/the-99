// The copy of I got it (collection home sub-project 4), behind SHOPPING_MARK_BOUGHT_ENABLED and
// COLLECTION_EDIT_ENABLED. From the handoff's `i-got-it · copy strings.ts`, adopted as drawn: the row,
// the key, the confirm, the held slot, the receipt, History's deck line and the details link.
// Counts are pinned to en-US like collection-edit.ts, so a server render and a browser agree.

import { allDecksCartCopy } from "./all-decks-cart";

const n = (x: number) => x.toLocaleString("en-US");
const copies = (x: number) => (x === 1 ? "1 copy" : `${n(x)} copies`);

export const gotItCopy = {
  row: {
    /** The buy tag's accessible name (audit errata 1); the tag's shipped sentence becomes its description. */
    tagAria: (card: string) => `Bought ${card}? Add it to your collection`,
    /** Drawn in the tag's figure slot while the write is in flight. */
    pending: "adding…",
    /** The key item after a drawn `buy` plate. */
    keyBuy: "bought it? press to add it",
    /** Replaces `swapToolsCopy.limit.key` in the key while I got it is on (R2 review: shorter). */
    keySwap: "cheaper stand-ins",
    /** Card details opened from a Shopping row: on the In your collection label line, in Edit copies' slot. */
    detailsLink: "Bought this card?",
  },
  confirm: {
    /** The card's name follows on its own line. */
    title: "Bought this card?",
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
    add: (q: number) => `Add ${copies(q)}`,
    choosePrinting: "Choose a printing",
    adding: "Adding…",
    cancel: "Cancel",
    close: "Close",
    staleTitle: "This changed while it was open.",
    staleBody: (need: number) => `A copy was added somewhere else, so the deck needs ${n(need)} now. Nothing was added yet.`,
    staleBodyDone: "A copy was added somewhere else, so the deck needs no more. Add anyway if this is a spare.",
    failedTitle: "We couldn’t add that.",
    failedBody: "Your collection is unchanged.",
  },
  slot: {
    /** The spent-slot shape a row that left keeps until the list is next read (call 8). */
    held: (card: string) => `${card} · in your collection`,
  },
  receipt: {
    added: (card: string, q: number) => `${card} added · ×${n(q)}`,
    detail: (printing: string, finish: string) => `${printing} · ${finish}`,
    claimed: (deck: string, need: number) =>
      `${deck} is older and was short too, so the copy went there. This deck still needs ${n(need)}.`,
    claimedMany: (decks: number, need: number) =>
      `${n(decks)} older decks were short too, so the copies went there first. This deck still needs ${n(need)}.`,
    partial: (need: number) => `The deck still needs ${n(need)}.`,
    /**
     * Where an added copy goes (`ADDED_COPY_ENABLED`). Placeholders pending /copy-review, from
     * the handoff's `added-copy · copy strings.ts`. `claimed` / `claimedMany` are unchanged.
     */
    self: "It goes to this deck.",
    softSelf: (others: string[]) => (others.length === 0
      ? "It’s free, so this deck can use it."
      : `It’s free, so this deck can use it. So can ${others.length < 2 ? others.join("") : `${others.slice(0, -1).join(", ")} and ${others[others.length - 1]}`}, which ${others.length === 1 ? "needs" : "need"} one too.`),
    nobody: "No deck needs this copy, so it’s free.",
    change: "Change",
    changeAria: (card: string) => `Change where ${card} goes`,
    changeTitle: "Where this copy goes",
    changeSub: (card: string) => `${card} · added just now`,
    done: "Done",
    history: "History",
    undo: "Undo",
    undoAria: (card: string) => `Undo adding ${card}`,
    checking: "Checking decks…",
    undoing: "Undoing…",
    /**
     * Every done undo: true whatever the list then shows (the row may come back, or the deck may
     * still be covered by copies added since). The handoff's `undone` form ("back on the list") is
     * not built: deciding it needed the refreshed list, which #1403 settled against. It names
     * only the copies this write added: a spoken-for row's card was already held, and still is.
     */
    undoneElsewhere: (card: string, q: number) => `Undone. ${card} ×${n(q)} removed from your collection.`,
    undoFailed: "Couldn’t undo that.",
    undoFailedBody: "What you added is still in your collection. You can revert it from History.",
    openHistory: "Open History",
  },
  /**
   * History's deck line under a `From Shopping` entry (§D). The deck name is a link, read at render
   * from the entry's source, so it is split around the name; the tag's own word is
   * `collectionEditCopy.history.kinds.shopping`.
   */
  history: {
    fromDeck: (deck: string) => ({ pre: "From", link: deck, post: "’s Shopping list" }),
    fromDeleted: "From the Shopping list of a deck you’ve since deleted",
    /** A purchase from the all-decks cart names the cart by its page title, never one deck. */
    fromCart: { pre: "From", link: allDecksCartCopy.title, post: "" },
    /**
     * The decks a cart purchase was bought for, as a second sentence under the cart line. `named` are the
     * first living decks (links), `more` the living decks past them, `gone` those since deleted. Items are
     * joined like `nameList`: commas, then "and" before the last.
     */
    boughtFor: {
      lead: "Bought for",
      more: (n: number) => `${n} more`,
      gone: (n: number) => (n === 1 ? "a deck you’ve since deleted" : `${n} decks you’ve since deleted`),
    },
    /**
     * Under an add or an upload entry (and, in its detail, under a row): the decks the copies went to, kept at
     * arrival. `soft` leads when only brews read the copy. The names, `more` and `gone` are `boughtFor`'s.
     */
    wentTo: { lead: "Went to", leadSoft: "Wanted by" },
  },
  /** ShortDeckWarning's `undo` verb; everything else is collection-edit.ts's shortWarning. */
  shortWarning: {
    titleUndo: (k: number) => `Undoing leaves ${k === 1 ? "a deck" : `${n(k)} decks`} short`,
    confirmUndo: "Undo anyway",
  },
} as const;
