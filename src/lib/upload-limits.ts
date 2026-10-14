import { importReviewCopy } from "./copy/import-review";

// Size caps for every user-supplied import, in one place so a check and the copy
// describing it cannot drift apart.
//
// The two file caps are deliberately different numbers. A collection CSV can be
// twenty thousand rows; a hundred-card decklist is a few kilobytes. Standardising
// them on 5 MB would also make the deck-import handoff's own illustration of the
// file-too-large state — a 4.1 MB .xlsx — pass the check.

// Every cap is a byte count paired with the label describing it, because a check and
// its message drifting apart is the exact failure this module exists to prevent.

// 4 MB, not 5: Vercel refuses any request body over 4.5 MB before the app sees it,
// so a 5 MB cap was never reachable. next.config.ts raises the Server Action body
// limit to match (Next's default is 1 MB, which is what broke large ManaBox exports).
export const COLLECTION_FILE_MAX_BYTES = 4 * 1024 * 1024;
export const COLLECTION_FILE_MAX_LABEL = "4 MB";

export const DECK_IMPORT_FILE_MAX_BYTES = 2 * 1024 * 1024;
export const DECK_IMPORT_FILE_MAX_LABEL = "2 MB";

/** Genuinely shared: a paste is a paste in either flow. */
export const PASTE_MAX_BYTES = 100_000;
export const PASTE_MAX_LABEL = "100 KB";

/**
 * Where a decklist came from, which is the only thing that decides its cap. The
 * array is the source of truth so a third arrival route cannot be added without
 * `isDeckImportTooLargeMessage` learning about it.
 */
export const DECK_IMPORT_SOURCES = ["paste", "file"] as const;
export type DeckImportSource = (typeof DECK_IMPORT_SOURCES)[number];

/**
 * The cap for a decklist, chosen by how it arrived. A paste is typed by hand and
 * stays small; a file can carry far more. Pure and exported so
 * the choice is testable — it lives in a server action otherwise, where it is not.
 */
export function deckImportMaxBytes(source: DeckImportSource): number {
  // Exhaustive rather than `paste ? … : …`: the fallback arm would hand a third
  // arrival route the file cap silently, which is the drift this module exists
  // to prevent. Written this way, adding one is a type error until it is priced.
  switch (source) {
    case "paste":
      return PASTE_MAX_BYTES;
    case "file":
      return DECK_IMPORT_FILE_MAX_BYTES;
    default:
      // `source` reaches `importDeck` from a server action, so the type is a
      // claim the caller makes and not one the runtime checks. An unrecognised
      // value gets the strictest cap: returning nothing would compare a byte
      // count against `undefined` and wave the whole guard through.
      assertNever(source);
      return PASTE_MAX_BYTES;
  }
}

/** Compile-time proof that every source is handled, with no runtime effect. */
function assertNever(source: never): void {
  void source;
}

/**
 * The message thrown when a decklist is over its cap. It lives here rather than at
 * the throw site because the client shows a thrown message to the player only when
 * it recognises it as one of these — every other throw is an internal invariant
 * ("card is not a legal commander") that should never reach a reader. Sharing the
 * string is what makes that recognition safe instead of a copy of it going stale.
 */
export function deckImportTooLargeMessage(source: DeckImportSource): string {
  switch (source) {
    case "paste":
      return importReviewCopy.errors.pasteTooLarge(PASTE_MAX_LABEL);
    case "file":
      return importReviewCopy.errors.fileTooLarge(DECK_IMPORT_FILE_MAX_LABEL);
    default:
      // Pairs with the cap above: an unrecognised source is capped as a paste,
      // so it must be told so too, or the message names a limit it never hit.
      assertNever(source);
      return importReviewCopy.errors.pasteTooLarge(PASTE_MAX_LABEL);
  }
}

/** True for a message this module authored, and therefore safe to show a player. */
export function isDeckImportTooLargeMessage(message: string): boolean {
  return DECK_IMPORT_SOURCES.some((source) => message === deckImportTooLargeMessage(source));
}
