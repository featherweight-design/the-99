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
 * Whether a candidate can be offered at all. A single always can. A pair with a half already in the
 * 98 cannot: the write would trade that half and release the other old commander, and the design
 * has no sentence for a half-trade (`confirm.trade` says the two trade places, which would be
 * false). The write refuses one too, so a stale sheet or a crafted request cannot reach it. Held
 * back, not given invented copy, until Design draws it (the-99-d9, 2026-09-25). It has
 * never occurred: staging indexes one usable pair.
 */
export function offerable(ids: readonly string[], inDeck: ReadonlySet<string>): boolean {
  return ids.length === 1 || !ids.some((id) => inDeck.has(id));
}
