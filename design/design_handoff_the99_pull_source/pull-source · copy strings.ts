// Pull it · source picker. PLACEHOLDERS, owed to /copy-review.
// Target: lib/copy/deck-versioning.ts → review.source (new block). Reused strings are noted, not redefined.

export const pullSourceCopy = {
  review: {
    // Row, 2+ sources that can be chosen. Replaces heldBy(deck) ("in {deck}") only in that case.
    heldByMany: (n: number) => `in ${n} decks`,
    // Shipped review.pull ("Pull it") stays the visible label. The caret is a glyph, aria-hidden.
    pullManyA11y: (card: string, n: number) => `Pull ${card}: choose from ${n} decks.`,

    source: {
      title: (card: string) => `Pull ${card} from`,
      order: "In the order they committed it",
      // Stamp reuses cardAssignmentsCopy.contested.stamp(v, date) → "v7 · 2 Aug".
      leaves: (n: number) => `→ ${n} cards`,
      newDraft: "new draft",
      joinsDraft: "joins its draft",
      // Tag reuses lockedCardsCopy.pull.tag ("locked") / review.commanderGuardTag ("commander").
      lockedReason: "locked there, so Pull it passes it by",
      commanderReason: "its commander",
      optionA11y: (deck: string, stamp: string, count: number, joins: boolean) =>
        `${deck}, ${stamp}. Leaves it ${count} cards${joins ? ", in its draft" : ", in a new draft"}.`,
      lockedA11y: (deck: string, card: string) => `${card} is locked in ${deck}, so it cannot be pulled.`, // = lockedCardsCopy.pull.a11y

      consequenceNew: (deck: string, card: string) =>
        `${deck} goes into a draft with ${card} going out. Discard that draft and the card goes back.`,
      consequenceJoins: (deck: string, card: string) =>
        `${card} goes out in ${deck}'s draft, beside its other changes. Discard that draft and the card goes back.`,

      confirm: (deck: string) => `Pull from ${deck}`,
      cancel: "Cancel",
      // Pending reuses review.pulling ("Pulling…"). Refusal reuses result.message / DECK_REMOVE_FALLBACK_MESSAGE.
    },

    // After the pull, in the held-by slot. {deck} links to /decks/[sourceId].
    pulledFrom: (deck: string) => `pulled from ${deck}`,
    // Announcement reuses commit.pullAnnounced / pullAnnouncedBuyUnknown with the chosen deck.
  },
} as const;
