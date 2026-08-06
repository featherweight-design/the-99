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

/**
 * Where a decklist came from, which is the only thing that decides its cap. The
 * array is the source of truth so a fourth arrival route cannot be added without
 * `isDeckImportTooLargeMessage` learning about it.
 */
export const DECK_IMPORT_SOURCES = ["paste", "file", "url"] as const;
export type DeckImportSource = (typeof DECK_IMPORT_SOURCES)[number];

/**
 * The cap for a decklist, chosen by how it arrived. A paste is typed by hand and
 * stays small; a file or a fetched deck can carry far more. Pure and exported so
 * the choice is testable — it lives in a server action otherwise, where it is not.
 */
export function deckImportMaxBytes(source: DeckImportSource): number {
  return source === "paste" ? PASTE_MAX_BYTES : DECK_IMPORT_FILE_MAX_BYTES;
}

/**
 * The message thrown when a decklist is over its cap. It lives here rather than at
 * the throw site because the client shows a thrown message to the player only when
 * it recognises it as one of these — every other throw is an internal invariant
 * ("card is not a legal commander") that should never reach a reader. Sharing the
 * string is what makes that recognition safe instead of a copy of it going stale.
 */
export function deckImportTooLargeMessage(source: DeckImportSource): string {
  return source === "paste"
    ? `Paste too large (max ${PASTE_MAX_LABEL})`
    : `Decklist too large (max ${DECK_IMPORT_FILE_MAX_LABEL})`;
}

/** True for a message this module authored, and therefore safe to show a player. */
export function isDeckImportTooLargeMessage(message: string): boolean {
  return DECK_IMPORT_SOURCES.some((source) => message === deckImportTooLargeMessage(source));
}
