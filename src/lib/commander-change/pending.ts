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
