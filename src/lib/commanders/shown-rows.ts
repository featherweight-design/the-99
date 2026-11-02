/**
 * What the player's lists draw, out of a list that still holds the commanders they hid. Pure: no database, so any
 * path may import it (the list-cache guard keeps `commanders/hidden`, which reads the table, off the cached ones).
 *
 * Slug assignment shares the full list (`getRankedList`, `assignDiscoverySlugs`), so a hide must not move another
 * commander's slug, and the lists drop hidden rows only AFTER it. Every place that then counts or re-ranks rows goes
 * through here, so "the place among the rows a list shows" has one definition in memory.
 *
 * The database's counterpart is the window in `scoredCommanderQuery` (`recs/scored-commander.ts`), which partitions on
 * the hidden flag to the same effect for the one-row read. A hidden row has no place in either.
 */

/** The rows a list draws: the ones the player has not hidden. The same array when nothing is hidden. */
export function shownRows<T extends { oracleId: string }>(rows: T[], hiddenIds: ReadonlySet<string> | undefined): T[] {
  return hiddenIds && hiddenIds.size > 0 ? rows.filter((r) => !hiddenIds.has(r.oracleId)) : rows;
}

/**
 * The place the row at `at` takes in a list that leaves hidden commanders out, counted over a list that still holds
 * them. Counting every row would put a commander one place lower per hidden row ahead of it. A hidden row has no
 * place.
 */
export function rankAmongShown(
  rows: readonly { oracleId: string }[],
  at: number,
  hiddenIds: ReadonlySet<string>,
): { rank: number | null; hidden: boolean } {
  if (hiddenIds.has(rows[at].oracleId)) return { rank: null, hidden: true };
  let rank = 1;
  for (let i = 0; i < at; i++) if (!hiddenIds.has(rows[i].oracleId)) rank++;
  return { rank, hidden: false };
}
