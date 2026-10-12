// "Your collection, put to work" (handoff R2 CollectionCard). Pure: what the card draws for a scope and, in the
// wanted list, a deck select. Owned counts never narrow (ruling 3): only what the decks in scope need does.

import { byName } from "./figures";
import type { LineupCollection, LineupFilter } from "./types";

export type WantedRow = { oracleId: string; name: string; imageUri: string | null; pct: number; deckId: string; idle: number };

export const WANTED_ROWS = 5;
export const CUTS = [40, 20] as const;

/**
 * The owned copies no deck in scope needs, that a deck's commanders' list carries: each card once, at its
 * highest share among the decks in scope (or at the chosen deck's), most first. A card every copy of which is
 * in a deck is not idle and is left out.
 */
export function wantedRows(c: LineupCollection, inScope: ReadonlySet<string>, deckId: string | null): WantedRow[] {
  return c.wanted.flatMap((w): WantedRow[] => {
    const need = w.wants.filter((x) => inScope.has(x.deckId)).reduce((n, x) => n + x.n, 0);
    const idle = w.owned - need;
    if (idle <= 0) return [];
    const hits = w.hits.filter((h) => inScope.has(h.deckId) && (deckId === null || h.deckId === deckId));
    if (hits.length === 0) return [];
    const best = hits.reduce((a, h) => (h.pct > a.pct ? h : a));
    return [{ oracleId: w.oracleId, name: w.name, imageUri: w.imageUri, pct: best.pct, deckId: best.deckId, idle }];
  }).sort((a, b) => b.pct - a.pct || byName(a.name, b.name));
}

export function collectionScope(c: LineupCollection, filter: LineupFilter) {
  const s = filter === "finished" ? c.finished : c.all;
  return {
    ...s,
    pctCopies: c.copies > 0 ? Math.round((s.inDeckCopies / c.copies) * 100) : 0,
    pctValue: c.valueCents > 0 ? Math.round((s.inDeckCents / c.valueCents) * 100) : 0,
  };
}
