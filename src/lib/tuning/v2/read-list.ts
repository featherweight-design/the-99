/**
 * The list a Suggested changes v2 run read, as the run stores it (`deck_suggestion_runs.read_list_card_ids`, beside
 * `read_list_fingerprint`, the list's own `listFingerprint`): so a later read of the run can say how far the deck has
 * moved since ("The list has changed by N cards since"). Pure and client-safe.
 */

type ListHead = {
  commanderOracleId: string;
  partnerOracleId: string | null;
  cards: readonly { oracleId: string; quantity: number }[];
};

/** Every card of the list, one id per copy, and each commander that is not also a row (the profile's own count,
 *  `deckTotal`). Sorted, so row order out of the database never moves it. */
export function readListCardIds(head: ListHead): string[] {
  const ids = head.cards.flatMap((c) => Array.from({ length: Math.max(0, c.quantity) }, () => c.oracleId));
  const rows = new Set(head.cards.map((c) => c.oracleId));
  for (const id of [head.commanderOracleId, head.partnerOracleId]) if (id !== null && !rows.has(id)) ids.push(id);
  return ids.sort();
}

/**
 * How many cards differ between two lists, counted as a multiset: each copy in one and not matched by a copy in the other
 * counts once, so a card swapped for another is 2 (one out, one in) and a fourth copy added to three is 1.
 */
export function changedCardCount(oldIds: readonly string[], newIds: readonly string[]): number {
  const balance = new Map<string, number>();
  for (const id of oldIds) balance.set(id, (balance.get(id) ?? 0) + 1);
  for (const id of newIds) balance.set(id, (balance.get(id) ?? 0) - 1);
  let changed = 0;
  for (const n of balance.values()) changed += Math.abs(n);
  return changed;
}

/**
 * A reopened run's "The list has changed by N cards since": the run's stored ids against the deck's list now, both read by
 * `readListCardIds` over the same `readProfileHead` shape. Null when it cannot be said truthfully: a run saved before the
 * list was stored (`stored` null), no list to compare against, or no card moved. A run History C draws is stale by a
 * newer committed VERSION, not by its list, so a commit of the very list the run read (its edits made before the run)
 * reads 0 here; "changed by 0 cards" would be false, so that run keeps the uncounted note.
 */
export function pastRunMoved(stored: readonly string[] | null | undefined, now: ListHead | null | undefined): number | null {
  if (!stored || !now) return null;
  const n = changedCardCount(stored, readListCardIds(now));
  return n > 0 ? n : null;
}
