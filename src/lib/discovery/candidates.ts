import { and, eq, ilike, notInArray, sql } from "drizzle-orm";
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
  /** The same count over the player's whole collection rather than over the
      pool being ranked. Equal to `ownedSupport` unless the ranking is scoped to
      the free pool, which is the only case where the two can differ — and the
      only case the pool exclusion sentences describe. */
  collectionSupport: number;
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
 *
 * `collectionOracleIds` is the whole collection, and is passed only when the
 * ranking is scoped to a smaller pool. Omitting it is not a degraded read: when
 * the pool *is* the collection the two counts are identical by construction, so
 * the second derived table would be a second aggregate scan of 240,000 rows to
 * re-derive a column already in the projection.
 */
export async function loadCandidates(
  userId: string,
  ownedOracleIds: string[],
  collectionOracleIds?: string[],
): Promise<CandidateRow[]> {
  const base = db
    .select({
      oracleId: commanderSupport.commanderOracleId,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
      edhrecTotal: commanderSupport.edhrecTotal,
      tags: commanderSupport.tags,
      ownedSupport: ownedSupportColumn(),
      collectionSupport: collectionSupportColumn(collectionOracleIds != null),
    })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
    .leftJoin(ownedSupportTable(ownedOracleIds), OWNED_SUPPORT_ON);

  const rows = await (collectionOracleIds != null
    ? base.leftJoin(collectionSupportTable(collectionOracleIds), COLLECTION_SUPPORT_ON)
    : base
  ).where(unbuiltCommanders(userId));

  return rows.map(shapeCandidate);
}

/** The most name matches one lookup will classify. A commander-name substring
    that reaches this many rows is not a name the reader is hunting for, and the
    aside it would feed counts matches rather than listing them. */
const NAME_MATCH_LIMIT = 200;

export type NameMatchRow = {
  oracleId: string;
  name: string;
  edhrecTotal: number | null;
  /** How many tags the index carries, rather than the tags themselves: the
      exclusion sentences only ask whether the floor had anything to measure, and
      the arrays are the expensive part of the candidate projection. */
  tagTotal: number;
  ownedSupport: number;
  collectionSupport: number;
};

/**
 * Every indexed commander whose name contains `query`, built or not, with the
 * two support counts the floor is decided on.
 *
 * `unbuiltCommanders` is deliberately NOT applied: the whole point of the lookup
 * is to find the row that left the list, and a commander the player has already
 * built is one of the reasons it can be missing. The caller marks those.
 */
export async function loadNameMatches(
  query: string,
  ownedOracleIds: string[],
  collectionOracleIds?: string[],
): Promise<NameMatchRow[]> {
  const base = db
    .select({
      oracleId: commanderSupport.commanderOracleId,
      name: cards.name,
      edhrecTotal: commanderSupport.edhrecTotal,
      tagTotal: sql<number>`jsonb_array_length(${commanderSupport.tags})`,
      ownedSupport: ownedSupportColumn(),
      collectionSupport: collectionSupportColumn(collectionOracleIds != null),
    })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
    .leftJoin(ownedSupportTable(ownedOracleIds), OWNED_SUPPORT_ON);

  return (collectionOracleIds != null
    ? base.leftJoin(collectionSupportTable(collectionOracleIds), COLLECTION_SUPPORT_ON)
    : base
  )
    .where(and(eq(cards.commanderLegal, true), ilike(cards.name, `%${escapeLike(query)}%`)))
    .orderBy(cards.name)
    .limit(NAME_MATCH_LIMIT);
}

/** The commanders this player has already built around — the scope exclusion,
    read as a set rather than as the `NOT IN` the candidate query applies, because
    the lookup has to tell a built commander from a missing one. */
export async function loadBuiltCommanderIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ oracleId: decks.commanderOracleId })
    .from(decks)
    .where(eq(decks.userId, userId));
  return new Set(rows.map((r) => r.oracleId));
}

/**
 * `%`, `_` and the escape character itself are LIKE syntax, and the query comes
 * from a text field. Unescaped, a reader who types `Ob_Nixilis` matches names
 * they did not ask for, and one who types `%` matches every commander in the
 * index — a wrong answer rather than an injection, since the pattern is still a
 * bound parameter.
 */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * The same population, projected to what slug resolution and the fit ordering
 * read and nothing else.
 *
 * The detail route resolves a discovery slug by re-deriving the whole ranking,
 * and the full projection would carry every candidate's `tags` jsonb across the
 * wire to do it — 3,100 tag arrays for three fields' worth of answer.
 */
export async function loadCandidateSlugRows(
  userId: string,
  ownedOracleIds: string[],
): Promise<{ oracleId: string; name: string; ownedSupport: number }[]> {
  return db
    .select({
      oracleId: commanderSupport.commanderOracleId,
      name: cards.name,
      ownedSupport: ownedSupportColumn(),
    })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
    .leftJoin(ownedSupportTable(ownedOracleIds), OWNED_SUPPORT_ON)
    .where(unbuiltCommanders(userId));
}

// The two queries differ only in their select list, so everything below the
// projection is shared: drizzle's fluent type falls apart under a generic
// select, but the join shape is the subtle part and it lives in one place.

// Zero is the real answer for a commander with no owned support, not a guard:
// the derived table only has a row where the overlap is non-empty. A function
// rather than a constant because `.as()` names a column in one query's scope.
const ownedSupportColumn = () =>
  sql<number>`coalesce(osc.owned_support, 0)`.as("owned_support");

const OWNED_SUPPORT_ON = sql`osc.commander_oracle_id = ${commanderSupport.commanderOracleId}`;

// Reads the second derived table when there is one, and the first when there is
// not — the two counts are the same number whenever the ranked pool is the whole
// collection, so the fallback is the answer rather than a placeholder for it.
const collectionSupportColumn = (joined: boolean) =>
  (joined
    ? sql<number>`coalesce(csa.collection_support, 0)`
    : sql<number>`coalesce(osc.owned_support, 0)`
  ).as("collection_support");

const COLLECTION_SUPPORT_ON = sql`csa.commander_oracle_id = ${commanderSupport.commanderOracleId}`;

/**
 * The owned-support count, aggregated INSIDE a derived table so the outer query
 * has no GROUP BY at all. Grouping outside meant sorting one row per owned
 * support card — 240,000 of them — each carrying this commander's whole `tags`
 * jsonb, and that sort was three quarters of the query's time (2.07s before,
 * 0.50s after, same rows and same counts).
 *
 * `distinct` so the count is a property of the data rather than of how the
 * caller built its array: `collection_items` carries one row per printing and
 * finish, so a caller that maps that table without de-duplicating would
 * otherwise count one owned support card several times.
 */
function ownedSupportTable(ownedOracleIds: string[]) {
  // `sql.param` is required: a bare template array expands to a parenthesised
  // param list, which is a syntax error rather than an array.
  const owned = sql.param(ownedOracleIds);
  return sql`(select csc.commander_oracle_id,
                     count(distinct csc.oracle_id)::int as owned_support
                from ${commanderSupportCards} csc
                join unnest(${owned}::uuid[]) as owned(oracle_id)
                  on owned.oracle_id = csc.oracle_id
               group by csc.commander_oracle_id) as osc`;
}

/**
 * The same aggregate over the whole collection, under its own derived-table
 * alias so both counts arrive in one round trip. Aggregating inside keeps the
 * outer query free of a GROUP BY, and each derived table yields at most one row
 * per commander, so the second left join cannot multiply the result.
 *
 * It projects a raw count and no predicate. The floor comparison stays in
 * `clearsFloor`, which guards two cases a SQL `>=` gets wrong: a null
 * `edhrec_total` yields NULL rather than false, and a zero one makes `0 >= 0`
 * true where an unmeasurable commander must clear nothing. Restating the floor
 * here would also let the two spellings drift, and a row classified one way by
 * SQL and the other by the ranking prints an exclusion sentence contradicting
 * the list it sits above.
 */
function collectionSupportTable(collectionOracleIds: string[]) {
  const owned = sql.param(collectionOracleIds);
  return sql`(select csc.commander_oracle_id,
                     count(distinct csc.oracle_id)::int as collection_support
                from ${commanderSupportCards} csc
                join unnest(${owned}::uuid[]) as owned(oracle_id)
                  on owned.oracle_id = csc.oracle_id
               group by csc.commander_oracle_id) as csa`;
}

function unbuiltCommanders(userId: string) {
  // `notInArray` emits `NOT IN (subquery)`, which returns NOTHING — not "all
  // rows" — the moment the subquery yields a single NULL. It is safe only
  // because `decks.commanderOracleId` is `notNull()`. If that column ever
  // becomes nullable, this query silently returns zero candidates.
  const built = db
    .select({ oracleId: decks.commanderOracleId })
    .from(decks)
    .where(eq(decks.userId, userId));

  return and(
    eq(cards.commanderLegal, true),
    notInArray(commanderSupport.commanderOracleId, built),
  );
}
