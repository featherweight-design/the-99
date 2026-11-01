import { and, desc, eq, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { db } from "../../db";
import { cards, hiddenCommanders } from "../../db/schema";

/**
 * Hiding a commander: the player's own "not this one", which takes it out of every list that answers
 * *what should I build next* (For you, Discover, Help me choose) until they undo it.
 *
 * Both writes are idempotent, because the control is optimistic: a double press, or an Undo racing the
 * Hide it undoes, must land on the state the player last asked for rather than on an error.
 */

export async function hideCommander(userId: string, oracleId: string): Promise<void> {
  await db.insert(hiddenCommanders).values({ userId, oracleId }).onConflictDoNothing();
}

export async function unhideCommander(userId: string, oracleId: string): Promise<void> {
  await db
    .delete(hiddenCommanders)
    .where(and(eq(hiddenCommanders.userId, userId), eq(hiddenCommanders.oracleId, oracleId)));
}

/** Whether the id names a card in the catalog. Deliberately no legality test: For you can still draw a
    persisted score for a commander the catalog has since stopped calling legal, and a hide must work on any
    row a player was shown. A hide of anything else only ever narrows that player's own lists. */
export async function isHideable(oracleId: string): Promise<boolean> {
  const [card] = await db
    .select({ oracleId: cards.oracleId })
    .from(cards)
    .where(eq(cards.oracleId, oracleId))
    .limit(1);
  return !!card;
}

/** The player's hidden commanders, newest first: the order the Hidden list draws. */
export async function loadHiddenIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ oracleId: hiddenCommanders.oracleId })
    .from(hiddenCommanders)
    .where(eq(hiddenCommanders.userId, userId))
    .orderBy(desc(hiddenCommanders.hiddenAt), hiddenCommanders.oracleId);
  return rows.map((r) => r.oracleId);
}

/**
 * "This player has not hidden this commander": the read-time exclusion each list applies.
 *
 * Same shape as `notBuiltBy` (`src/lib/decks/built.ts`) and for the same reason: `not exists`, never
 * `NOT IN (subquery)`, so a NULL in the column it is asked of matches nothing instead of emptying the
 * list.
 *
 * The column must render QUALIFIED. A bare `"oracle_id"` would resolve inside this subquery to the hidden
 * row's own column, match every hidden row, and empty the list for anyone who has hidden anything. In a
 * `where` clause Drizzle qualifies a column object; in a single-table select's projection it does not, so
 * there pass `sql\`${table}.oracle_id\`` or an alias's column.
 *
 * The subquery's own table is aliased and qualified by hand for the same reason.
 */
export function notHiddenBy(userId: string, oracleIdColumn: SQLWrapper): SQL {
  return sql`not exists (
    select 1 from ${hiddenCommanders} hc
    where hc.user_id = ${userId}
      and hc.oracle_id = ${oracleIdColumn}
  )`;
}
