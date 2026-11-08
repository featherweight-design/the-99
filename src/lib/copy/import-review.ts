// The words around a collection import's review screen and its errors. A name
// the catalog does not hold is "not in the card catalog" and a line the reader
// could not make sense of is "unreadable": neither is the app's vocabulary for
// how it works, only for what the player sees.

export const importReviewCopy = {
  stats: {
    /** Desktop issue summary: the count beside it names what it counts. */
    notInCatalog: "names not in the card catalog",
    /** Phone mini stat, one word group under the number. */
    notInCatalogShort: "not in catalog",
    unreadable: (n: number) => (n === 1 ? "unreadable line" : "unreadable lines"),
  },
  sections: {
    notInCatalogShort: (n: number) => `Not in the catalog: ${n} skipped`,
    notInCatalog: (n: number) => `Names not in the card catalog: ${n}`,
    unreadable: (n: number) => `Unreadable lines: ${n}`,
  },
  /**
   * Public landing PR 7b: said under the tally only when every row left out is one the skipped ledger holds (tokens, emblems
   * and art-series cards, `match.ts`), so "everything else came in" is true. Playtest cards are not named: the ledger does not
   * hold them.
   */
  skippedWhy: "Tokens, emblems and art cards aren’t in the catalog, so they stay out. Everything else came in.",
  errors: {
    fileTooLarge: (max: string) => `That file is too large (max ${max})`,
    pasteTooLarge: (max: string) => `That paste is too large (max ${max})`,
    uploadFailed: "We couldn’t upload that file. Try again.",
    /**
     * Public landing PR 7b: a file whose first row names no Name or no Quantity column (the parser's "header missing
     * Name/Quantity column"). The link opens the export guides; the paste is the other way in.
     */
    noColumn: {
      title: (column: "Name" | "Quantity") => `This file has no ${column} column`,
      before: "The 99 needs a Name and a Quantity column in the first row. Most apps’ CSV exports have both. ",
      link: "How to export",
      after: ", or paste the list instead.",
    },
    unreadable: "We couldn’t read this file.",
    unreadableWhy: (reason: string) => `We couldn’t read this file: ${reason}`,
    noFile: "Choose a CSV file first.",
    pasteUnreadable: "We couldn’t read that list.",
    pasteUnreadableWhy: (reason: string) => `We couldn’t read that list: ${reason}`,
    confirmFailed: "That didn’t go through. Try again.",
  },
} as const;
