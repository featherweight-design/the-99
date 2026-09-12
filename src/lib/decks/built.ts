import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
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
