// Life tracker tablet sheet and coin toss: no new strings (Hugh, 2026-11-22: copy unchanged).
// Every label on the boards is a shipped string from `src/lib/copy/tracker.ts`. Listed here so /copy-review can confirm.
export const tabletSheetCopy = {
  // The veil's button (tap the table to close the sheet) reuses the ✕'s accessible name.
  veilAria: "trackerCopy.sheet.close", // "Close"
  // The tab row, unchanged in wording and order; Table only moves next to Mana.
  tabs: "trackerCopy.sheet.tabs", // Commander damage · Counters · Tax · Mana · Table
  // The damage cards reuse the shipped hint, fallback and empty line.
  damageHint: "trackerCopy.sheet.damageHint",
  commanderFallback: "trackerCopy.sheet.commanderFallback", // "Commander", a seat with no deck
  noOpponents: "trackerCopy.sheet.noOpponents",
  // The coin's faces and its press, unchanged. R3 draws them in capitals along each face's bottom arc (CSS/SVG
  // uppercase of the same strings, not new strings).
  heads: "trackerCopy.dice.heads",
  tails: "trackerCopy.dice.tails",
  flipAgain: "trackerCopy.dice.flipAgain",
};
