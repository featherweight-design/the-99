import type { MatchResult } from "./match";
import { collectionItemKey, isFinish, type Finish } from "./key";

/**
 * One aggregated holding, as stored in `csv_uploads.preview_payload` and inserted verbatim
 * into `collection_items`.
 *
 * `collectorNumber` and `finish` are optional on read only: a preview written before migration
 * 0008 and confirmed after it has neither, and spreading `undefined` into an insert is NOT the
 * same as omitting the key — it writes NULL rather than taking the column default. Every write
 * path goes through toCollectionItemValues, which coerces both.
 */
export type PendingItem = {
  oracleId: string;
  setCode: string;
  collectorNumber?: string;
  finish?: Finish;
  scryfallId?: string | null;
  condition: string | null;
  quantity: number;
};

/**
 * Aggregates matched rows to one PendingItem per primary key.
 *
 * The grouping key comes from collectionItemKey, i.e. from the one place the primary key is
 * spelled out, because confirm inserts these rows with no ON CONFLICT: a key coarser than the
 * primary key raises 23505, a key finer than it silently splits a holding in two.
 *
 * Collapse rules for non-key fields: `condition` and `scryfallId` both fall to null when rows
 * inside a group disagree — two rows that share oracle/set/collector-number/finish but name
 * different printings cannot both be right, and null is the honest answer.
 */
export function aggregatePendingItems(matched: MatchResult["matched"]): PendingItem[] {
  const agg = new Map<string, PendingItem>();
  for (const { row, oracleId } of matched) {
    const identity = {
      oracleId,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber,
      finish: row.finish,
    };
    const key = collectionItemKey(identity);
    const existing = agg.get(key);
    if (existing) {
      mergeHolding(existing, row);
    } else {
      agg.set(key, {
        ...identity,
        scryfallId: row.scryfallId,
        condition: row.condition,
        quantity: row.quantity,
      });
    }
  }
  return [...agg.values()];
}

/**
 * Folds `incoming` into `into`, in place: quantities add, and `condition` and `scryfallId` keep
 * a value only while every member of the group agrees on it. The one statement of that rule,
 * read by the upload's aggregation above and by the ledger's Add (`write.ts`), which treats
 * the stored row as one more member of the group.
 */
export function mergeHolding(
  into: { quantity: number; condition: string | null; scryfallId?: string | null },
  incoming: { quantity: number; condition: string | null; scryfallId?: string | null },
): void {
  into.quantity += incoming.quantity;
  if (into.condition !== incoming.condition) into.condition = null;
  if ((into.scryfallId ?? null) !== (incoming.scryfallId ?? null)) into.scryfallId = null;
}

/** Total card count across holdings — the number the review screen calls "cards matched". */
export function totalQuantity(items: PendingItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

/**
 * PendingItems → `collection_items` insert values for one user, coercing the fields a
 * pre-0008 preview payload does not carry.
 */
export function toCollectionItemValues(userId: string, items: PendingItem[]) {
  return items.map((v) => ({
    userId,
    oracleId: v.oracleId,
    // Lowercased here as well as at parse time: a preview written before 0008 can be confirmed
    // after it, and an uppercase code stored here joins against nothing in `printings`.
    setCode: v.setCode.toLowerCase(),
    scryfallId: v.scryfallId ?? null,
    collectorNumber: v.collectorNumber ?? "",
    finish: v.finish && isFinish(v.finish) ? v.finish : ("nonfoil" as Finish),
    condition: v.condition,
    quantity: v.quantity,
  }));
}
