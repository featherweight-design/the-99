// Whether a deck's commander has moved since its newest version: the one rule every "is this deck
// pending" question gains when a commander change becomes a draft change (plan decision 2).
//
// The live `decks.commander_oracle_id` / `partner_oracle_id` columns ARE the draft's commander, and
// a commit copies them into the version (`versions.ts`, `commitVersionIn`). So a deck is pending
// on its commander exactly when the live pair differs from the version's pair.
//
// Written once per language. The TypeScript form serves the readers that already hold both rows;
// the SQL form serves the two queries that decide pending in the database (the availability CTE and
// the deck list's pending edge), so the rule is not restated by hand at either site.

import { sql, type SQL } from "drizzle-orm";

/** A deck's leader: its commander, and its partner when it has one. */
export type CommanderPair = { commanderOracleId: string; partnerOracleId: string | null };

/** The pair as a sorted set. Which of the two sits in which column is not a change: a pair's
 *  order carries no meaning, and a swap that only exchanges the columns leads the same deck. */
function members(pair: CommanderPair): string[] {
  return [pair.commanderOracleId, pair.partnerOracleId].filter((id): id is string => id !== null).sort();
}

/** True when the live pair leads the deck differently from the version's pair. */
export function commanderMoved(version: CommanderPair, live: CommanderPair): boolean {
  const a = members(version);
  const b = members(live);
  return a.length !== b.length || a.some((id, i) => id !== b[i]);
}

/**
 * The same rule as a SQL predicate over two row aliases that each carry `commander_oracle_id` and
 * `partner_oracle_id`: `v` for the version row, `d` for the live deck row. Both aliases must be in
 * scope where the fragment is placed.
 *
 * The comparison sorts each side's non-null ids, so it agrees with `commanderMoved` about column
 * order, and `is distinct from` treats a null partner on one side against a set one on the other
 * as a difference rather than as unknown.
 */
export function commanderMovedSql(v: string, d: string): SQL {
  const side = (alias: string) => sql.raw(
    `array(select x from unnest(array[${alias}.commander_oracle_id, ${alias}.partner_oracle_id]) x where x is not null order by x)`,
  );
  return sql`(${side(v)} is distinct from ${side(d)})`;
}

/**
 * The rule against the deck's NEWEST version, for a query that holds only the deck row: true
 * when `deck`'s live pair differs from its newest version's, false for a brew (no version, so
 * nothing to be pending against). `deck` is the alias or table name of a `decks` row in scope.
 *
 * Newest by `number`, the same definition `newestVersion` and both pending queries use.
 */
export function deckCommanderMovedSql(deck: string): SQL {
  return sql`coalesce((
    select ${commanderMovedSql("pcv", deck)}
    from deck_versions pcv
    where pcv.deck_id = ${sql.raw(deck)}.id
    order by pcv.number desc
    limit 1
  ), false)`;
}

/**
 * How a change moves cards between the 99 and the command zone, read off the current leader, the
 * new one, and the body. `none`: nothing comes out of the body. `trade`: a single out of the 99
 * trades places with the old single. `halfTrade` (the addendum): one half of a new pair comes out
 * of the 98 while both old halves leave, so one old half takes its slot (the reader's choice) and
 * the other leaves the deck. Null for a change no design draws, held back: a half out of the 98
 * beside a half the pair keeps, and both new halves out of the 98.
 */
export type TradeShape = "none" | "trade" | "halfTrade";

export function tradeShape(
  toIds: readonly string[], fromIds: readonly string[], body: ReadonlySet<string>,
): TradeShape | null {
  const fromBody = toIds.filter((id) => !fromIds.includes(id) && body.has(id)).length;
  if (fromBody === 0) return "none";
  if (toIds.length === 1) return "trade";
  const departing = fromIds.filter((id) => !toIds.includes(id)).length;
  return fromBody === 1 && departing === 2 ? "halfTrade" : null;
}

/** Whether a change can be offered at all: the loader and the write apply this one rule. */
export function offerable(
  toIds: readonly string[], fromIds: readonly string[], body: ReadonlySet<string>,
): boolean {
  return tradeShape(toIds, fromIds, body) !== null;
}
