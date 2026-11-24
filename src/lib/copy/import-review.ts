// The words around a collection import's review screen and its errors. A name
// the catalog does not hold is "not in the card catalog" and a line the reader
// could not make sense of is "unreadable": neither is the app's vocabulary for
// how it works, only for what the player sees.

import { cards, rows } from "./collection-edit";

export const importReviewCopy = {
  /** The review screen's own words (titles, the matched figure, the sticky bar's summary and Continue labels). */
  review: {
    titlePhone: "Review import",
    titleDesktop: "Review before you replace",
    cardWord: (n: number) => (n === 1 ? "card" : "cards"),
    readyPhone: (n: number) => `${n === 1 ? "card" : "cards"} matched & ready`,
    readyDesktop: "matched to the Oracle database: ready to import",
    willBeSkipped: (count: number) => `${rows(count)} will be skipped`,
    rowsRead: (n: number) => (n === 1 ? "row read" : "rows read"),
    line: (line: number, setCode: string | null | undefined) => `Line ${line}${setCode ? ` · ${setCode}` : ""}`,
    importShort: (importCount: number, skipped: number) => `Imports ${cards(importCount)} · skips ${rows(skipped)}`,
    importLong: (importCount: number, skipped: number) =>
      `Importing ${cards(importCount)} and skipping ${skipped}.`,
    replaceShort: (skipped: number, current: number, importCount: number) =>
      `Skips ${rows(skipped)} · replaces your ${cards(current)} with ${importCount.toLocaleString()}`,
    replaceLong: (importCount: number, skipped: number, current: number) =>
      `Importing ${cards(importCount)} and skipping ${skipped}. This replaces your current ${cards(current)}.`,
    importing: "Importing…",
    continueImport: "Continue to import →",
    continueReplace: "Continue to replace →",
    /** The upload step's header line under the step count. */
    rowsFigure: (n: number) => `${n.toLocaleString("en-US")} rows`,
  },
  /** The upload step's entry: the paste panel and the dropzone's words. */
  entry: {
    pasteLabel: "Paste your list",
    pasteAria: "Paste your card list",
    pastePlaceholder: "3 Sol Ring\n1 Cultivate\nRhystic Study",
    recognized: (n: number) => `${n} cards recognized`,
    back: "Back",
    previewing: "Previewing…",
    previewEmpty: "Preview list",
    previewOne: "Preview 1 card",
    previewMany: (n: number) => `Preview ${n} cards`,
    uploadAria: "Upload collection CSV",
    formatsPhone: "Moxfield · Archidekt · Deckbox · ManaBox · CSV",
    formatsWide: "Moxfield · Archidekt · Deckbox · ManaBox · plain CSV",
    uploading: "Uploading…",
    helperPhone: "Only a Name and Quantity column are required.",
    helperWide: "We only need a Name and Quantity column: most exports already include them.",
  },
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
   * and art-series cards, `match.ts`), so "everything else is going in" is true. Playtest cards are not named: the ledger does not
   * hold them.
   */
  skippedWhy: "Tokens, emblems and art cards aren’t in the catalog, so they stay out. Everything else is going in.",
  errors: {
    fileTooLarge: (max: string) => `That file is too large (max ${max})`,
    pasteTooLarge: (max: string) => `That paste is too large (max ${max})`,
    uploadFailed: "We couldn’t upload that file. Try again.",
    /**
     * Public landing PR 7b: a file whose first row names no Name or no Quantity column (the parser's "header missing
     * Name/Quantity column"). The link opens the export guides; the paste is the other way in.
     */
    /** A UTF-16 file (a BOM, or NULs through its header): re-exporting with the same settings will not help. */
    notUtf8: "This file isn’t a UTF-8 CSV. Export it as CSV (UTF-8), or paste the list instead.",
    noColumn: {
      title: (column: "Name" | "Quantity") => `This file has no ${column} column`,
      before: "The 99 needs a Name and a Quantity column in the first row. Most apps’ CSV exports have both. ",
      link: "How to export",
      after: ", or paste the list instead.",
    },
    /** A failed file whose header names the app it came from (`detectSource`): that app's guide, opened. */
    fromApp: {
      lead: (app: string) => `This looks like a ${app} file.`,
      link: (app: string) => `How to export from ${app}`,
    },
    unreadable: "We couldn’t read this file.",
    unreadableWhy: (reason: string) => `We couldn’t read this file: ${reason}`,
    noFile: "Choose a CSV file first.",
    pasteUnreadable: "We couldn’t read that list.",
    pasteUnreadableWhy: (reason: string) => `We couldn’t read that list: ${reason}`,
    confirmFailed: "That didn’t go through. Try again.",
  },
} as const;
