// Collection Sync, the choice step (plan `2026-10-15-collection-sync.md` PR 2): what the Sync card, the
// stale banner and the follow-up say, from the sync dry runs. Pure, so the rules are tested without a render.

import type { UploadChangePreview, UploadSyncPreview } from "../../app/collection/actions";
import type { SyncPick } from "../../lib/collection/sync";

/** A sync dry run as the choice reads it. */
export type SyncChoiceRead = Pick<UploadChangePreview, "detail"> & { sync: UploadSyncPreview };

/** The Sync card's quiet note. */
export type SyncNote =
  | { kind: "keeps"; cards: number }
  | { kind: "keepsNone" }
  | { kind: "tokensOnly"; tokens: number }
  /** The plan writes nothing. It claims nothing about the file matching an upload: no check proves that. */
  | { kind: "noChange" };

/**
 * Whether the file would add a card under **Only what it adds**: a holding the plain Sync raises or
 * brings in, or a conflict whose file count is higher than the app's (the conflicts that pick still asks).
 * Read from the plain Sync's dry run, so the follow-up is drawn or not before any other read lands.
 */
export function fileAddsCards(base: SyncChoiceRead): boolean {
  // The server's uncapped count, never the 500 conflict rows the preview ships.
  return base.detail.up > 0 || base.sync.raisingConflicts > 0;
}

/** The follow-up is drawn only under an older-looking file that adds a card (S1: never with nothing to choose). */
export function followUpShown(base: SyncChoiceRead): boolean {
  return base.sync.stale === "older" && fileAddsCards(base);
}

/**
 * The pick a Sync of this file runs under. A file that does not look older is the plain Sync. An older
 * one takes the follow-up's pick, and one that adds no card takes only its tokens: Everything would only
 * add removals the file can't justify, and the note says it records only the tokens (README call 4).
 */
export function effectivePick(base: SyncChoiceRead, followPick: SyncPick): SyncPick {
  if (base.sync.stale !== "older") return "everything";
  return fileAddsCards(base) ? followPick : "tokens";
}

/** The note for the read the card's figure is drawn from, under `pick`. */
export function syncNote(read: SyncChoiceRead, pick: SyncPick): SyncNote | null {
  const s = read.sync;
  if (s.nothing) return { kind: "noChange" };
  const cardsMove = s.counts.taken > 0 || s.counts.conflicts > 0;
  if (!cardsMove) return s.tokensChanged > 0 ? { kind: "tokensOnly", tokens: s.tokensChanged } : null;
  if (s.counts.kept > 0) return { kind: "keeps", cards: s.counts.kept };
  // "You haven't changed anything … does what Replace does": the plain Sync only, and only with no app change
  // of any kind (an agreed card and a conflict are app changes too).
  const appChanged = s.counts.kept + s.counts.agreed + s.counts.conflicts > 0;
  return pick === "everything" && !appChanged ? { kind: "keepsNone" } : null;
}

/** The desktop foot's lead-in with Sync picked. */
export type SyncNext = { kind: "sync" } | { kind: "tokens" } | { kind: "adds"; cards: number; tokens: number };

export function syncNext(read: SyncChoiceRead, pick: SyncPick): SyncNext {
  if (syncNote(read, pick)?.kind === "tokensOnly") return { kind: "tokens" };
  // The tokens this sync would change, never the file's total: a token already recorded at the file's count is not taken.
  if (pick === "additions") return { kind: "adds", cards: read.detail.up, tokens: read.sync.tokensChanged };
  return { kind: "sync" };
}
