// The free ranking, expressed against the canonical one (#52).
//
// `/commanders` ships both rankings in one render, which is what makes the
// `Score against` toggle a state change rather than a fetch — the whole reason
// the design forbids a loading treatment on it. But the two lists are the same
// commanders: measured on a 189-candidate collection, 65.6 KB of the free
// list's 99.4 KB was byte-identical to the canonical list already beside it,
// the image URLs and names and slugs sent twice.
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
 * situation, and for its reason: the alternative is a list that is quietly one
 * row short, and a commander that vanishes when the player flips a control
 * promising only to rescore. A disabled toggle is honest.
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
