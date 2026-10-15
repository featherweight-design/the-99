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

/** Copies of one holding and the entry that put them there. */
type Lot = { source: string | null; n: number };

/** Takes `n` copies off the newest lots first: which copies a lowering took is not recorded, so the newest go. */
function takeNewest(lots: Lot[], n: number): void {
  for (let i = lots.length - 1; i >= 0 && n > 0; i--) {
    const take = Math.min(lots[i].n, n);
    lots[i].n -= take;
    n -= take;
  }
}
const total = (lots: readonly Lot[]) => lots.reduce((s, l) => s + l.n, 0);

/**
 * What leaves, or null when nothing does (the clause is then absent and Replace reads as shipped). The standing
 * entries are replayed per holding, in ledger order, as lots of copies by source: a raise adds a lot, a lowering
 * takes the newest copies, and a removal to zero clears every lot, so a box removed and re-added by hand no longer
 * names the box. Copies the lots do not account for (rows aged out of History, or a holding no entry raised) are
 * by hand, so the sentence always names a source.
 */
export function builtLeaving(dryRows: readonly HistoryRow[], entries: readonly BuiltEntry[]): BuiltLeaving | null {
  const lowered = new Map<string, number>();
  let copies = 0;
  for (const r of dryRows) {
    const down = qty(r.before) - qty(r.after);
    if (down <= 0) continue;
    copies += down;
    lowered.set(keyOf(r), qty(r.before));
  }
  if (copies === 0) return null;
  const lots = new Map<string, Lot[]>();
  for (const e of entries) {
    for (const r of e.rows ?? []) {
      const key = keyOf(r);
      if (!lowered.has(key)) continue;
      const before = qty(r.before);
      const after = qty(r.after);
      const held = lots.get(key) ?? [];
      if (after > before) held.push({ source: e.source, n: after - before });
      else if (after < before) takeNewest(held, before - after);
      // An earlier row aged out can leave more on the lots than the holding had: the newest give way. A removal to
      // zero therefore empties every lot.
      if (total(held) > after) takeNewest(held, total(held) - after);
      lots.set(key, held);
    }
  }
  const precons = new Set<string>();
  let byHand = false;
  for (const [key, held] of lowered) {
    const own = lots.get(key) ?? [];
    if (total(own) > held) takeNewest(own, total(own) - held);
    if (total(own) < held) byHand = true;
    for (const l of own) {
      if (l.n <= 0) continue;
      if (l.source?.startsWith("precon:")) precons.add(l.source);
      else byHand = true;
    }
  }
  return { copies, precons: precons.size, byHand };
}
