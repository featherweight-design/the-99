// Deck printings (collection home sub-project 3): the printing a deck shows for a card the player
// owns in more than one. From `design/design_handoff_the99_deck_printings/` R3, through /copy-review.
// Everything not listed here is reused verbatim from `printingPickerCopy.printing`.
const count = (n: number) => n.toLocaleString("en-US");

export const deckPrintingsCopy = {
  picker: {
    /** The Set field's pinned line in deck scope, in place of `triggerPicked` ("Your pick"). */
    pinned: "For this deck",
    /** D1: the region's intro slot in deck scope. `regionIntro` says the pick represents the card
     *  everywhere in the Collection, which is false here. */
    regionIntro: (n: number) => `You own ${count(n)} of these. Pick the one this deck uses.`,
    regionIntroPicked: "The one marked For this deck shows in this deck only.",
    /** The Set field's disclosure button in deck scope. `triggerAria` says the pick represents the card
     *  everywhere in the Collection, which is false here; a token is named, since its details show no card. */
    triggerAria: (n: number, caption: string, tokenName?: string) =>
      `Set: ${caption}. ${count(n)} printings owned. Choose which one this deck uses${tokenName ? ` for ${tokenName}` : ""}.`,
    failed: "We couldn’t confirm that saved. Reload to see this deck’s pick.",
    /** The modal's one live region, on a pick. */
    announcePicked: (setName: string, collectorNumber: string) =>
      collectorNumber
        ? `${setName} number ${collectorNumber} picked for this deck.`
        : `${setName} picked for this deck.`,
  },
} as const;
