// Cards your decks share (handoff R1 call 6, R2 SharedCard). Pure. A card is shared once two decks in scope
// play it. Each row's squares are its decks: held (a copy the claim model gives that deck) or no copy left. A
// gap is a count, never a verdict: `20 decks · you own 17`.

import { byName } from "./figures";
import type { LineupShared } from "./types";

export type SharedMode = "most" | "wanted";

export type SharedRow = {
  oracleId: string;
  name: string;
  owned: number;
  /** Decks in scope playing it, held ones first, so the filled squares lead: `held` is any copy, `short` the copies it still lacks. */
  decks: { id: string; held: boolean; short: number }[];
  /** Copies the decks in scope ask for. */
  wants: number;
  /** Copies those decks still lack (the cart's to-buy count for the card). */
  short: number;
};

export type SharedView = { rows: SharedRow[]; twoPlus: number; fivePlus: number; wantedMore: number };

/** How many rows a chip shows (the canvas draws eight). */
export const SHARED_ROWS = 8;

export function sharedView(shared: readonly LineupShared[], inScope: ReadonlySet<string>, mode: SharedMode): SharedView {
  const all = shared.flatMap((card): SharedRow[] => {
    const decks = card.decks.filter((d) => inScope.has(d.id));
    if (decks.length < 2) return [];
    const rows = decks.map((d) => ({ id: d.id, held: d.held > 0, short: Math.max(0, d.wants - d.held) }));
    rows.sort((a, b) => Number(b.held) - Number(a.held));
    return [{
      oracleId: card.oracleId,
      name: card.name,
      owned: card.owned,
      decks: rows,
      wants: decks.reduce((n, d) => n + d.wants, 0),
      short: rows.reduce((n, d) => n + d.short, 0),
    }];
  });
  const wanted = all.filter((r) => r.wants > r.owned);
  const pool = mode === "wanted" ? wanted : all;
  const rows = [...pool].sort((a, b) =>
    mode === "wanted"
      ? b.wants - b.owned - (a.wants - a.owned) || b.decks.length - a.decks.length || byName(a.name, b.name)
      : b.decks.length - a.decks.length || byName(a.name, b.name),
  );
  return {
    rows: rows.slice(0, SHARED_ROWS),
    twoPlus: all.length,
    fivePlus: all.filter((r) => r.decks.length >= 5).length,
    wantedMore: wanted.length,
  };
}
