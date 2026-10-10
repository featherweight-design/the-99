// Proposed additions, R2. Intent only; /copy-review.
// Everything else is reused verbatim from printingPickerCopy and deckImportCopy.

export const deckPrintingsCopy = {
  // Replaces printingPickerCopy.printing.badgePicked on the Set field's pinned line in deck scope only.
  // Tiles keep "Your pick" — the pinned line already says whose pick it is.
  pinned: "For this deck",
  failed: "Didn’t save. Try again.",
  // Appended to deckImportCopy.arrival.clean / cleanMobile when n > 0.
  importClause: (n: string) => `, ${n} with the printing you own`,
  importClauseMobile: (n: string) => ` · ${n} printings kept`,
  announcePicked: (printing: string) => `${printing} picked for this deck.`,
} as const;
