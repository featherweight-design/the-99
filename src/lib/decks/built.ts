import { eq, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";

/**
 * "This commander helms no deck of this player's" — the exclusion behind every
 * list that answers *what should I build next*.
 *
 * One definition, because it is asked of two different tables — the discovery
 * candidate query against `commander_support`, and the detail page's rank window
 * against `commander_scores` — and the two drifting apart shows up as a rank on
 * one screen disagreeing with the rank on another, which no test of either alone
 * would catch.
 *
 * BOTH COLUMNS. A partner helms its deck exactly as the primary does. The
 * ownership filters some callers also apply cannot stand in for it: an import
 * validates that a declared partner is a legal commander, never that the player
 * owns it.
 *
 * `not exists`, never `NOT IN (subquery)`. That form returns NOTHING — not "all
 * rows" — the moment the subquery yields a single NULL, and `partner_oracle_id`
 * is nullable, so one partnerless deck would empty the list. Here a NULL partner
 * simply matches nothing.
 */
export function notBuiltBy(userId: string, oracleIdColumn: SQLWrapper): SQL {
  return sql`not exists (
    select 1 from ${decks}
    where ${decks.userId} = ${userId}
      and (
        ${decks.commanderOracleId} = ${oracleIdColumn}
        or ${decks.partnerOracleId} = ${oracleIdColumn}
      )
  )`;
}

/** The commanders this player has already built around — the scope exclusion,
    read as a set rather than as the `NOT IN` the candidate query applies, because
    the lookup has to tell a built commander from a missing one.

    BOTH HALVES OF A PAIR. A partner helms its deck exactly as the primary does,
    so a list answering "what should I build next" that named it was offering the
    player a deck they are already holding. It is read here rather than in the
    candidate query's `NOT IN` because `partner_oracle_id` is nullable, and a
    `NOT IN (subquery)` yielding one NULL returns no rows at all — the hazard
    `unbuiltCommanders` documents, out of reach only while the column it reads is
    `notNull()`. Filtering nulls out in TypeScript has no such edge. */
export async function loadBuiltCommanderIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ oracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId })
    .from(decks)
    .where(eq(decks.userId, userId));
  return new Set(rows.flatMap((r) => (r.partnerOracleId ? [r.oracleId, r.partnerOracleId] : [r.oracleId])));
}
