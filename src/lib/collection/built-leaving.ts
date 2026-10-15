// S14 (no-collection entry, plan PR 6): what a first Replace would take from a collection built in the app.
//
// A player who started with precons, an imported deck or cards added by hand has no upload, so Replace's
// shipped warning ("N changes you made in the app will be overwritten") has no upload to be since. Their first
// file's choice names instead what leaves and where it came from: `212 cards you added from 3 precons and by
// hand aren't in this file and would leave.` The copies are the Replace dry run's own, so the figure and the
// save cannot disagree; the sources are the standing History entries that raised those holdings. Pure.

import type { HistoryRow } from "../../db/schema";
import { collectionItemKey, type Finish } from "./key";

export type BuiltLeaving = {
  /** Copies the Replace would take away, summed over every holding it lowers or removes. */
  copies: number;
  /** Distinct precon boxes whose standing adds raised a holding the Replace lowers. */
  precons: number;
  /** Any of those holdings came from anything else: a hand add or edit, a deck add, a Shopping purchase. */
  byHand: boolean;
};

/** A standing hand entry (an `add` or `edit` not reverted), as `readBuiltEntries` returns it. */
export type BuiltEntry = { source: string | null; rows: HistoryRow[] | null };

const keyOf = (r: HistoryRow) => collectionItemKey({ ...r, finish: r.finish as Finish });
const qty = (s: HistoryRow["before"]) => s?.quantity ?? 0;

/**
 * What leaves, or null when nothing does (the clause is then absent and Replace reads as shipped). A lowered
 * holding no standing entry accounts for (its rows aged out of History) is counted as by hand, so the sentence
 * always names a source.
 */
export function builtLeaving(dryRows: readonly HistoryRow[], entries: readonly BuiltEntry[]): BuiltLeaving | null {
  const lowered = new Set<string>();
  let copies = 0;
  for (const r of dryRows) {
    const down = qty(r.before) - qty(r.after);
    if (down <= 0) continue;
    copies += down;
    lowered.add(keyOf(r));
  }
  if (copies === 0) return null;
  const precons = new Set<string>();
  let byHand = false;
  const accounted = new Set<string>();
  for (const e of entries) {
    for (const r of e.rows ?? []) {
      const key = keyOf(r);
      if (!lowered.has(key) || qty(r.after) <= qty(r.before)) continue;
      accounted.add(key);
      if (e.source?.startsWith("precon:")) precons.add(e.source);
      else byHand = true;
    }
  }
  if (accounted.size < lowered.size) byHand = true;
  return { copies, precons: precons.size, byHand };
}
