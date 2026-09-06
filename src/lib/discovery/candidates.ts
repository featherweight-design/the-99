import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport, commanderSupportCards, decks } from "../../db/schema";
import type { EdhrecTag } from "../edhrec/parse";

export type CandidateSqlRow = {
  oracleId: string;
  name: string;
  // No typeLine: every row in `commander_support` is already a commander, so the
  // type line answers nothing discovery asks and nothing discovery renders.
  colorIdentity: string[];
  imageUri: string | null;
  edhrecTotal: number | null;
  tags: EdhrecTag[];
  ownedSupport: number;
};

export type CandidateRow = CandidateSqlRow;

/**
 * Pure row shaping, so the assertions live away from the drizzle builder.
 *
 * Nothing is defaulted: `commanderSupport.tags` is `jsonb().notNull()` and
 * `count(...)` cannot be negative, so a `?? []` or a `Math.max(0, ...)` here
 * would be a guard against a state the schema forbids — and would quietly
 * absorb a real regression if the column ever became nullable.
 */
export function shapeCandidate(r: CandidateSqlRow): CandidateRow {
  return { ...r };
}

/**
 * Every indexed commander the player has not built a deck around, with the
 * count of that commander's EDHREC support cards the player owns.
 *
 * `ownedOracleIds` is a parameter rather than a join so that `?avail=free` is
 * this same query with the free pool's ids — the free ranking is the same
 * question asked of a smaller pool.
 *
 * The left join is load-bearing: a commander with zero owned support still has
 * to appear, because the floor and the count line are claims about the whole
 * candidate population, not about the rows that happened to overlap. The owned
 * match therefore lives inside a derived table rather than in a second join on
 * the outer query — drizzle emits joins in call order, so an inner join written
 * after the left join would filter the left join's NULL rows back out.
 */
export async function loadCandidates(
  userId: string,
  ownedOracleIds: string[],
): Promise<CandidateRow[]> {
  // `notInArray` emits `NOT IN (subquery)`, which returns NOTHING — not "all
  // rows" — the moment the subquery yields a single NULL. It is safe only
  // because `decks.commanderOracleId` is `notNull()`. If that column ever
  // becomes nullable, this query silently returns zero candidates.
  const built = db
    .select({ oracleId: decks.commanderOracleId })
    .from(decks)
    .where(eq(decks.userId, userId));

  // `sql.param` is required: a bare template array expands to a parenthesised
  // param list, which is a syntax error rather than an array.
  const owned = sql.param(ownedOracleIds);

  const rows = await db
    .select({
      oracleId: commanderSupport.commanderOracleId,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
      edhrecTotal: commanderSupport.edhrecTotal,
      tags: commanderSupport.tags,
      // `distinct` so the count is a property of the data rather than of how the
      // caller built its array: `collection_items` carries one row per printing
      // and finish, so a caller that maps that table without de-duplicating
      // would otherwise count one owned support card several times.
      ownedSupport: sql<number>`count(distinct osc.oracle_id)::int`.as("owned_support"),
    })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
    .leftJoin(
      sql`(select csc.commander_oracle_id, csc.oracle_id
             from ${commanderSupportCards} csc
             join unnest(${owned}::uuid[]) as owned(oracle_id)
               on owned.oracle_id = csc.oracle_id) as osc`,
      sql`osc.commander_oracle_id = ${commanderSupport.commanderOracleId}`,
    )
    .where(
      and(
        eq(cards.commanderLegal, true),
        notInArray(commanderSupport.commanderOracleId, built),
      ),
    )
    .groupBy(
      commanderSupport.commanderOracleId, cards.name,
      cards.colorIdentity, cards.imageUri, commanderSupport.edhrecTotal,
      commanderSupport.tags,
    );

  return rows.map(shapeCandidate);
}
