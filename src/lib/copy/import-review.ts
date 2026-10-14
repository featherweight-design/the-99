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
  errors: {
    fileTooLarge: (max: string) => `That file is too large (max ${max})`,
    pasteTooLarge: (max: string) => `That paste is too large (max ${max})`,
    uploadFailed: "We couldn’t upload that file. Try again.",
    unreadable: "We couldn’t read this file.",
    unreadableWhy: (reason: string) => `We couldn’t read this file: ${reason}`,
    pasteUnreadable: "We couldn’t read that list.",
    confirmFailed: "That didn’t go through. Try again.",
  },
} as const;
