// The free ranking, expressed against the canonical one (#52).
//
// `/commanders` ships both rankings in one render, which is what makes the
// `Build from` toggle a state change rather than a fetch — the whole reason
// the design forbids a loading treatment on it. But the free list is a SUBSET of
// the canonical one and shares every row it keeps: measured on a 189-candidate
// collection, 65.6 KB of the free list's 99.4 KB was byte-identical to the
// canonical list already beside it, the image URLs and names and slugs sent
// twice.
//
// So the second list ships as a diff. Which fields move is not fixed — a
// collection with nothing sleeved moves none of them, and a heavily committed
// one moves most — so the diff is computed per row rather than declared as a
// field list that would go stale the first time a score gains a component.

import type { CommanderListItem } from "./recommend";

export type FreeRankingDelta = {
  /** For each row in free rank order, its index in the canonical list. */
  order: number[];
  /** Aligned with `order`: the fields whose value moved, or null where none did. */
  changes: (Partial<CommanderListItem> | null)[];
};

/**
 * Null when the free list names a commander the canonical one does not.
 *
 * That is the same fail-closed answer `rankFree` already gives for the same
 * situation, and for its reason: a free list holding a row canonical never had
 * is two reads disagreeing, and neither one can be trusted to draw. A disabled
 * toggle is honest.
 *
 * A SHORTER free list is not that, and is not an error. Free mode narrows to
 * what the player could build today, so `order` is a subset of the canonical
 * indices and the count the reader is shown shrinks with it. Nothing about the
 * format changes: `order` was always canonical indices in free rank order, so a
 * subset round-trips through `fromFreeDelta` untouched.
 */
export function toFreeDelta(
  canonical: CommanderListItem[],
  free: CommanderListItem[],
): FreeRankingDelta | null {
  const indexByOracleId = new Map(canonical.map((c, i) => [c.oracleId, i]));
  const order: number[] = [];
  const changes: (Partial<CommanderListItem> | null)[] = [];

  for (const row of free) {
    const index = indexByOracleId.get(row.oracleId);
    if (index === undefined) return null;
    const base = canonical[index] as Record<string, unknown>;
    const diff: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      // Stringified rather than compared by identity: `colorIdentity` and
      // `roleCounts` are a fresh array and a fresh object on every score, so
      // every row would report them as moved.
      if (JSON.stringify(value) !== JSON.stringify(base[key])) diff[key] = value;
    }
    order.push(index);
    changes.push(Object.keys(diff).length > 0 ? (diff as Partial<CommanderListItem>) : null);
  }

  return { order, changes };
}

/** Rebuilds the free ranking on the client. The inverse of `toFreeDelta`. */
export function fromFreeDelta(
  canonical: CommanderListItem[],
  delta: FreeRankingDelta,
): CommanderListItem[] {
  return delta.order.map((index, position) => {
    const change = delta.changes[position];
    // The canonical row itself where nothing moved, not a copy of it: the view
    // joins the two lists on oracleId and reads better when the rows that did
    // not change are the same objects.
    return change ? { ...canonical[index], ...change } : canonical[index];
  });
}
