// Proposed src/lib/copy/deck-printings.ts, R3. Intent only; every string goes through /copy-review.
// Everything not listed here is reused verbatim from printingPickerCopy, priceCopy and deckImportCopy.
//
// New strings: 7.
//   Picker (deck scope): pinned, regionIntro, regionIntroPicked, failed, announcePicked
//   Import strip:        importClause, importClauseMobile  (composition owed — audit E3)
//
// D2 (a pick out of stock) adds NO string: the buy tag falls back to the cheapest in-stock
// figure and reads exactly as main does (Hugh, 2026-10-10).

export const deckPrintingsCopy = {
  picker: {
    // The Set field's pinned line in deck scope. Replaces printingPickerCopy.printing.badgePicked
    // on that line only; tiles keep "Your pick".
    pinned: "For this deck",
    // D1. Same slot as printingPickerCopy.printing.regionIntro(n) / regionIntroPicked, which must
    // not render in deck scope: "wherever this card appears in your collection" is false there.
    regionIntro: (n: number) => `You own ${n} of these. Pick the one this deck uses.`,
    regionIntroPicked: "Your pick shows in this deck only.",
    failed: "Didn’t save. Try again.",
    // The modal's one live region.
    announcePicked: (printing: string) => `${printing} picked for this deck.`,
  },

  import: {
    // Composed with deckImportCopy.arrival.clean / cleanMobile when n > 0. The shipped strings
    // end in a full stop and carry provenance; /copy-review owes the combined string (audit E3).
    importClause: (n: string) => `${n} came with the printing you own.`,
    importClauseMobile: (n: string) => `${n} printings kept`,
  },
} as const;
