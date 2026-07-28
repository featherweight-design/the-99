/**
 * The identity of a collection holding, and the single place its key is derived.
 *
 * `confirmUpload` deletes the user's rows and then runs a plain INSERT — there is no
 * ON CONFLICT anywhere in that path — so the key used to aggregate rows before the insert
 * must be EXACTLY the primary key of `collection_items`. If it is coarser the insert raises
 * Postgres 23505 instead of merging. `key.test.ts` asserts the two against each other by
 * reading the primary key straight off the Drizzle table definition.
 */

/** Scryfall's `finishes` vocabulary, verbatim, so the two never need translating. */
export const FINISHES = ["nonfoil", "foil", "etched"] as const;
export type Finish = (typeof FINISHES)[number];

export function isFinish(value: string): value is Finish {
  return (FINISHES as readonly string[]).includes(value);
}

/** Non-user columns of the `collection_items` primary key, in key order. */
export const COLLECTION_ITEM_KEY_FIELDS = [
  "oracleId",
  "setCode",
  "collectorNumber",
  "finish",
] as const;

export type CollectionItemIdentity = {
  oracleId: string;
  setCode: string;
  collectorNumber: string;
  finish: Finish;
};

/**
 * Aggregation key for one holding. The user id is omitted because every caller aggregates
 * within a single user; the field list is shared with the primary-key assertion in key.test.ts.
 */
export function collectionItemKey(identity: CollectionItemIdentity): string {
  return COLLECTION_ITEM_KEY_FIELDS.map((f) => identity[f]).join("|");
}
