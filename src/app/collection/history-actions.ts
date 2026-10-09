"use server";

import { requireUserId } from "../../lib/auth";
import { collectionEditEnabled } from "../../lib/collection/edit-flag";
import {
  getHistoryEntry, listHistory, revertDiffers, type HistoryEntry, type HistoryListEntry,
} from "../../lib/collection/history";
import { invalidateCollectionReaders } from "../../lib/collection/invalidate";
import { collectionItemKey, type CollectionItemIdentity } from "../../lib/collection/key";
import { applyCollectionChange, parseShortDecks, type ShortDeck } from "../../lib/collection/write";
import type { HistoryRow } from "../../db/schema";
import { isUuid } from "../../lib/uuid";
import { randomUUID } from "node:crypto";

/**
 * The collection history and revert (collection foundation, sub-project 1, PR 3). Every action
 * here exists only with `COLLECTION_EDIT_ENABLED` on: the history is the ledger's, and the
 * ledger is written only then.
 */

async function signedInEditor(): Promise<string> {
  const userId = await requireUserId();
  if (!collectionEditEnabled()) throw new Error("collection editing is off");
  return userId;
}

/** One page of history, newest first; `before` is the previous page's `nextBefore`. */
export async function loadCollectionHistory(
  before?: number,
): Promise<{ entries: HistoryListEntry[]; nextBefore: number | null }> {
  const userId = await signedInEditor();
  if (before !== undefined && !(Number.isSafeInteger(before) && before > 0)) throw new Error("bad page cursor");
  return listHistory(userId, { before });
}

/** One entry with its rows, or null when it is not the player's or has aged out. */
export async function loadCollectionHistoryEntry(id: string): Promise<HistoryEntry | null> {
  const userId = await signedInEditor();
  if (!isUuid(id)) return null;
  return getHistoryEntry(userId, id);
}

export type RevertPreview = {
  /** What the revert does to each row today: `before` is today's, `after` what it would leave. */
  rows: HistoryRow[];
  /** What the entry did, row by row, for the confirmation to set beside today's. */
  entryRows: HistoryRow[];
  /** Today's revert is not the exact inverse of the entry (brief §F says so on the confirmation). */
  differs: boolean;
  /** Committed decks it would leave short (the warning, brief §E). */
  decks: ShortDeck[];
  /** The after-count per row the confirmation shows; sent back with the revert, checked at the save. */
  expected: Record<string, number>;
};

export type RevertRefusal =
  | { notFound: true }
  | { alreadyReverted: true }
  | { missingCard: string[] }
  | { stale: true }
  | { wouldShort: ShortDeck[] };

const keyOf = (r: CollectionItemIdentity) => collectionItemKey(r);

/**
 * What reverting `entryId` would do now, answered by a dry run of the revert itself, so the
 * confirmation and the save are one computation.
 */
export async function previewRevert(entryId: string): Promise<RevertPreview | RevertRefusal> {
  const userId = await signedInEditor();
  if (!isUuid(entryId)) return { notFound: true };
  const entry = await getHistoryEntry(userId, entryId);
  if (!entry) return { notFound: true };
  const result = await applyCollectionChange(
    userId, { kind: "revert", entryId }, { id: randomUUID(), dryRun: true },
  );
  switch (result.status) {
    case "preview": break;
    case "notFound": return { notFound: true };
    case "alreadyReverted": return { alreadyReverted: true };
    case "missingCard": return { missingCard: result.names };
    default: throw new Error(`revert preview refused: ${result.status}`);
  }
  return {
    rows: result.rows,
    entryRows: entry.rows,
    differs: revertDiffers(entry.rows, result.rows),
    decks: result.decks,
    expected: Object.fromEntries(result.rows.map((r) => [keyOf(r as CollectionItemIdentity), r.after?.quantity ?? 0])),
  };
}

/** The `expected` map the client sends back: counts by row key. Anything else is refused. */
function parseExpected(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("bad revert preview");
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0) throw new Error("bad revert preview");
    out[k] = v;
  }
  return out;
}

/**
 * Reverts `entryId` against today's collection. `actionId` is minted by the client when the
 * revert is pressed and reused on retry, so a retried revert applies once; `expected` is the
 * preview's, so a collection that moved since the confirmation was drawn refuses with `stale`;
 * `confirmShort` is the deck warning the player confirmed, re-checked at the save.
 */
export async function revertCollectionEntry(
  entryId: string,
  actionId: string,
  expected: Record<string, number>,
  confirmShort?: ShortDeck[],
): Promise<{ reverted: { id: string } } | RevertRefusal> {
  const userId = await signedInEditor();
  if (!isUuid(entryId)) return { notFound: true };
  if (!isUuid(actionId)) throw new Error("bad action id");
  const result = await applyCollectionChange(
    userId,
    { kind: "revert", entryId, expected: parseExpected(expected) },
    { id: actionId, confirmShort: parseShortDecks(confirmShort) },
  );
  switch (result.status) {
    // A retry of a revert that already committed is the same success, and invalidates again: the
    // request that wrote it may have died between its commit and its own invalidation.
    case "applied":
    case "alreadyApplied":
      invalidateCollectionReaders(userId);
      return { reverted: { id: result.entry.id } };
    case "notFound": return { notFound: true };
    case "alreadyReverted": return { alreadyReverted: true };
    case "missingCard": return { missingCard: result.names };
    case "stale": return { stale: true };
    case "wouldShort": return { wouldShort: result.decks };
    default: throw new Error(`revert refused: ${result.status}`);
  }
}
