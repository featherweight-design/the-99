import { and, eq, ilike, inArray, notInArray, sql } from "drizzle-orm";
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
 * Every indexed commander the player neither owns nor has built a deck around,
 * with the count of that commander's EDHREC support cards the player owns.
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
 * re-derive a column already in the projection. The lane boundary is drawn
 * against it rather than against `ownedOracleIds`, because a commander you own
 * but have committed elsewhere is still one you own — narrowing the ranked pool
 * must not put it back on a lane defined as the things you do not have.
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
  ).where(discoverCandidates(userId, collectionOracleIds ?? ownedOracleIds));

  return rows.map(shapeCandidate);
}

/** The most name matches one lookup will classify. A commander-name substring
    that reaches this many rows is not a name the reader is hunting for, and the
    aside it would feed counts matches rather than listing them.
    A query that goes past it is unanswered rather than answered with the first
    200: the aside prints the count it was given, so a truncated set would have
    it report a figure smaller than the truth. */
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
 *
 * Null when more names match than the cap classifies — an unanswered question
 * rather than a short answer.
 */
export async function loadNameMatches(
  query: string,
  ownedOracleIds: string[],
  collectionOracleIds?: string[],
): Promise<NameMatchRow[] | null> {
  // Names first, and nothing else. Both support counts are aggregates over
  // `commander_support_cards`, and running them before the name filter would
  // grind all 240,000 rows for the couple of hundred this keeps. The matching
  // ids are the cheapest thing that makes the aggregates proportional to the
  // answer, and they cost an index scan the second query would have paid anyway.
  //
  // One row past the cap, so a set that reached it can be told from one that
  // stopped just short of it. The extra row is never returned.
  const matched = await db
    .select({ oracleId: commanderSupport.commanderOracleId })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
    .where(and(eq(cards.commanderLegal, true), ilike(cards.name, `%${escapeLike(query)}%`)))
    .orderBy(cards.name)
    .limit(NAME_MATCH_LIMIT + 1);

  if (matched.length > NAME_MATCH_LIMIT) return null;
  // No second query for a query nothing is named: `= any('{}')` is a round trip
  // whose answer is already in hand.
  if (matched.length === 0) return [];
  const ids = matched.map((r) => r.oracleId);

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
    .leftJoin(ownedSupportTable(ownedOracleIds, ids), OWNED_SUPPORT_ON);

  return await (collectionOracleIds != null
    ? base.leftJoin(collectionSupportTable(collectionOracleIds, ids), COLLECTION_SUPPORT_ON)
    : base
  )
    .where(inArray(commanderSupport.commanderOracleId, ids))
    .orderBy(cards.name);
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
 *
 * "The same population" includes the lane boundary: dedup suffixes and the rank
 * this returns both follow position, so a population one row wider than the
 * list's would resolve a slug to a different commander than the row it was
 * clicked from.
 */
export async function loadCandidateSlugRows(
  userId: string,
  ownedOracleIds: string[],
  collectionOracleIds?: string[],
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
    .where(discoverCandidates(userId, collectionOracleIds ?? ownedOracleIds));
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
function ownedSupportTable(ownedOracleIds: string[], commanderIds?: string[]) {
  // `sql.param` is required: a bare template array expands to a parenthesised
  // param list, which is a syntax error rather than an array.
  const owned = sql.param(ownedOracleIds);
  return sql`(select csc.commander_oracle_id,
                     count(distinct csc.oracle_id)::int as owned_support
                from ${commanderSupportCards} csc
                join unnest(${owned}::uuid[]) as owned(oracle_id)
                  on owned.oracle_id = csc.oracle_id
               ${commanderScope(commanderIds)}
               group by csc.commander_oracle_id) as osc`;
}

/**
 * Narrows an aggregate to the commanders the caller will actually project.
 *
 * The ranking reads every candidate, so it passes nothing and pays for the whole
 * aggregate once. A name lookup reads at most `NAME_MATCH_LIMIT` of them, and
 * without this it would grind the same 240,000-row aggregate for the couple of
 * hundred rows it keeps — per settled query, several times a search.
 */
function commanderScope(commanderIds: string[] | undefined) {
  if (commanderIds === undefined) return sql``;
  return sql`where csc.commander_oracle_id = any(${sql.param(commanderIds)}::uuid[])`;
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
function collectionSupportTable(collectionOracleIds: string[], commanderIds?: string[]) {
  const owned = sql.param(collectionOracleIds);
  return sql`(select csc.commander_oracle_id,
                     count(distinct csc.oracle_id)::int as collection_support
                from ${commanderSupportCards} csc
                join unnest(${owned}::uuid[]) as owned(oracle_id)
                  on owned.oracle_id = csc.oracle_id
               ${commanderScope(commanderIds)}
               group by csc.commander_oracle_id) as csa`;
}

/**
 * The discover lane's population: an indexed commander the player has neither
 * built around nor owns.
 *
 * Ownership is the lane's definition rather than a filter over it — the two
 * lanes partition the index, owned-and-unbuilt on `/commanders` and the rest
 * here — so it belongs in the WHERE beside the deck exclusion. Exported for the
 * test, which reads the emitted SQL: whether the exclusion is in the WHERE at
 * all is the one part of this query no database is needed to check.
 */
export function discoverCandidates(userId: string, collectionOracleIds: string[]) {
  return and(unbuiltCommanders(userId), unownedCommanders(collectionOracleIds));
}

/**
 * `<> all(...)` rather than `notInArray`: the exclusion set is the whole
 * collection, which is one bound array here and three thousand placeholders as
 * a `NOT IN` list — the same reason the support aggregates already unnest a
 * param. It also makes an empty collection the harmless case it should be,
 * where the `NOT IN ()` a bare array would emit is a syntax error.
 *
 * The NULL hazard `unbuiltCommanders` documents is out of reach on both sides:
 * `commander_oracle_id` is `notNull()`, and the array is oracle ids read out of
 * the collection rather than a subquery that could yield one.
 */
function unownedCommanders(collectionOracleIds: string[]) {
  return sql`${commanderSupport.commanderOracleId} <> all(${sql.param(collectionOracleIds)}::uuid[])`;
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
