// Where an arriving copy went, kept on the history row (History deck line, PR 2; Hugh 2026-10-13). The
// rule: it records where the copy went WHEN IT ARRIVED and ignores every later move, so a deck that was
// since deleted, renamed or given the copy by another press never rewrites an old row. Entries written
// before this existed, and writes made with Where-a-copy-goes off, carry none and stay unknowable.
import { arrivalPlacement, wentOf, type WentRow } from "./arrivals";
import type { HistoryRow } from "../../db/schema";
import type { RaisedCard } from "./write";

export type WentTo = NonNullable<HistoryRow["wentTo"]>;

/** One card's placement as the row keeps it: null when no deck took or read a copy. */
export function wentToOf(w: WentRow): WentTo | null {
  if (w.kind === "none") return null;
  return {
    ...(w.kind === "soft" ? { soft: true as const } : {}),
    decks: w.decks.map((d) => ({ deckId: d.deckId, copies: d.copies })),
  };
}

/** The placement of every raised card, by oracle id, as the add path's own read produced it. */
export function wentByOracle(raised: Readonly<Record<string, RaisedCard>>): Map<string, WentRow> {
  return new Map(Object.entries(raised).map(([oracleId, r]) => [
    oracleId,
    wentOf(arrivalPlacement(r.after, r.brought, r.reservations), r.brought, Math.max(r.after.owned - r.brought, 0)),
  ]));
}

/**
 * Stamps `wentTo` on the FIRST row of each card whose count rose: a card printed in two finishes is one
 * placement, not two. Rows that did not rise, and cards no deck took, are left as they were.
 */
export function annotateWentTo(rows: HistoryRow[], went: ReadonlyMap<string, WentRow>): void {
  const done = new Set<string>();
  for (const r of rows) {
    if (done.has(r.oracleId)) continue;
    if ((r.after?.quantity ?? 0) <= (r.before?.quantity ?? 0)) continue;
    const to = went.has(r.oracleId) ? wentToOf(went.get(r.oracleId)!) : null;
    if (!to) continue;
    r.wentTo = to;
    done.add(r.oracleId);
  }
}
