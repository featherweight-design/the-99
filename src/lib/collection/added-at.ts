import { collectionItemKey, type CollectionItemIdentity } from "./key";

/**
 * When a holding reached the collection (`collection_items.added_at`, `added_exact`). Pure: the writers read
 * what the rows hold, ask these two questions, and write what they are told.
 *
 * A date is EXACT when something real brought the holding: a hand add, an edit, a revert, or a file that
 * arrived into a collection that already had content. It is not exact for the file that FILLS an empty
 * collection, whose holdings all arrived on that one day: "since", not "added on".
 */

/** The two columns, as a writer carries them. `addedAt` null is a row nothing could date. */
export type Added = { addedAt: Date | null; addedExact: boolean };

/** What a write that brings a NEW holding stamps it with. */
export type Arrival = { now: Date; exact: boolean };

/** A change the player made by hand, or took back: its holdings arrive exactly. */
export const handArrival = (now: Date): Arrival => ({ now, exact: true });

/** A file's holdings arrive exactly only into a collection that was not empty before it. */
export const fileArrival = (now: Date, hadHoldings: boolean): Arrival => ({ now, exact: hadHoldings });

/** The columns a holding is written with: the date it already has, else the arrival's. */
export function addedFor(existing: Added | undefined, arrival: Arrival): Added {
  return existing ?? { addedAt: arrival.now, addedExact: arrival.exact };
}

/** A revert puts back the date its entry recorded for the row; a row the entry did not date arrives now. */
export function restoredAdded(recorded: { addedAt?: string | null; addedExact?: boolean } | null | undefined, arrival: Arrival): Added {
  if (recorded && typeof recorded.addedAt === "string") {
    return { addedAt: new Date(recorded.addedAt), addedExact: recorded.addedExact === true };
  }
  return { addedAt: arrival.now, addedExact: arrival.exact };
}

/** The rows a write found, keyed by holding, as `Added`. */
export function addedByKey(
  rows: readonly (CollectionItemIdentity & { addedAt: Date | null; addedExact: boolean })[],
): Map<string, Added> {
  return new Map(rows.map((r) => [collectionItemKey(r), { addedAt: r.addedAt, addedExact: r.addedExact }]));
}

/**
 * The date fields a before-side carries, when the row was read with them: the entry records them so a revert of a
 * removal can put the date back. Absent on a row read without them (an upload item, a row from before the column).
 */
export const dateOf = (h: { addedAt?: string | null; addedExact?: boolean }): { addedAt?: string | null; addedExact?: boolean } =>
  h.addedAt !== undefined ? { addedAt: h.addedAt, addedExact: h.addedExact } : {};
