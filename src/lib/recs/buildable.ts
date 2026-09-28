/**
 * How many commanders a player could build from their collection: every ranked commander
 * they own and have not built. The ONE definition, so `/decks`' zero state and anything else
 * that states it cannot drift (first-run audit correction 11, Hugh's ruling 2026-09-28).
 *
 * It replaced a cap of nine on `/decks`, which was Home's old Ready-to-build set size and
 * understated a real collection by an order of magnitude (230 on the reference account).
 * Null when the ranking is unavailable, so a caller can draw nothing rather than a zero.
 */
export function buildableCount(ranked: { items: readonly unknown[] } | null | undefined): number | null {
  return ranked ? ranked.items.length : null;
}
