// The SQL form of "has this deck's commander moved since its newest version" (pending.ts holds
// the rule and its TypeScript form). Its own module so the client components that import
// pending.ts take no drizzle-orm with them (`client-imports.test.ts`).
import { sql, type SQL } from "drizzle-orm";

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
