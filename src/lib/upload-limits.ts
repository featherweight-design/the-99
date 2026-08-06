// Size caps for every user-supplied import, in one place so a check and the copy
// describing it cannot drift apart.
//
// The two file caps are deliberately different numbers. A collection CSV can be
// twenty thousand rows; a hundred-card decklist is a few kilobytes. Standardising
// them on 5 MB would also make the deck-import handoff's own illustration of the
// file-too-large state — a 4.1 MB .xlsx — pass the check.

// Every cap is a byte count paired with the label describing it, because a check and
// its message drifting apart is the exact failure this module exists to prevent.

export const COLLECTION_FILE_MAX_BYTES = 5 * 1024 * 1024;
export const COLLECTION_FILE_MAX_LABEL = "5 MB";

export const DECK_IMPORT_FILE_MAX_BYTES = 2 * 1024 * 1024;
export const DECK_IMPORT_FILE_MAX_LABEL = "2 MB";

/** Genuinely shared: a paste is a paste in either flow. */
export const PASTE_MAX_BYTES = 100_000;
export const PASTE_MAX_LABEL = "100 KB";

/** Where a decklist came from, which is the only thing that decides its cap. */
export type DeckImportSource = "paste" | "file" | "url";

/**
 * The cap for a decklist, chosen by how it arrived. A paste is typed by hand and
 * stays small; a file or a fetched deck can carry far more. Pure and exported so
 * the choice is testable — it lives in a server action otherwise, where it is not.
 */
export function deckImportMaxBytes(source: DeckImportSource): number {
  return source === "paste" ? PASTE_MAX_BYTES : DECK_IMPORT_FILE_MAX_BYTES;
}
