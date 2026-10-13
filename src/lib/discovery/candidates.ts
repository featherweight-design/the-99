import { createHash } from "node:crypto";
import { and, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import {
  cards,
  catalogRefreshes,
  CATALOG_ROW_ID,
  collectionItems,
  commanderSupport,
  commanderSupportCards,
  ownedSupportCounts,
  ownedSupportStamps,
  printings,
  sets,
} from "../../db/schema";
import { INDEX_UNREADABLE, indexGeneration } from "../recs/store";
import { ownedSupportLock } from "./owned-support-lock";
import { generationKey, readCatalogGeneration } from "../cache/catalog-generation";
import type { EdhrecTag } from "../edhrec/parse";
import { notBuiltBy } from "../decks/built";

export type CandidateSqlRow = {
  oracleId: string;
  name: string;
  // No typeLine: every row in `commander_support` is already a commander, so the
  // type line answers nothing discovery asks and nothing discovery renders.
  colorIdentity: string[];
  imageUri: string | null;
  artCropUri: string | null;
  /** When this commander first appeared in print, `YYYY-MM-DD`. Null when every
      set it was printed in is undated, which is a real state — promos and Secret
      Lair carry no date. It is projected only because the discover lane offers a
      `Recently released` order: without it that option would silently leave the
      server's ordering in place, which is the defect class this lane's parameter
      module refuses for `Recently added`. */
  releasedAt: string | null;
  edhrecTotal: number | null;
  /** How many decks EDHREC counted for this commander. Null where the index
      carried no figure, which is a real state and prints as no line rather than
      as a zero — nobody has built it is a claim the absent figure cannot make.
      The discover row prints it, and the `Popularity` order ranks on it. */
  deckCount: number | null;
  tags: EdhrecTag[];
  /**
   * The one accepted sentence about how this commander's decks tend to play, or
   * null where none has been generated.
   *
   * It costs this query NOTHING — `commander_support` is already the driving
   * table, so the sentence is one more column on a row being read anyway. That
   * is the whole reason the row can carry it: 3,342 model calls per collection
   * change would not be affordable, and none are made, because the sentence is
   * identical for every player and so is generated once per commander.
   *
   * A NULL IS A LEGITIMATE OUTPUT, not a gap to be filled. The generator stores
   * nothing when a candidate sentence fails its accept contract, and a commander
   * whose every attempt failed keeps its null and renders with no paragraph —
   * the state the design draws, and never a truncated sentence nobody wrote.
   * The same is true of a commander the index has no inputs for.
   *
   * An earlier version of this comment called every null a fixture gap and told
   * the reader to copy production data over it, which contradicts that contract
   * and would overwrite a valid state. What IS environment-specific is the
   * PROPORTION: a database generated against will have few, one never generated
   * against will have many, and a local walk that finds most rows blank wants
   * `pnpm db:copy:prose` before anything is concluded from it. That is a fact
   * about the fixture, not about this column.
   */
  prose: string | null;
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
 * `ownedOracleIds` is a parameter rather than a join so that a narrower pool is
 * this same query with a shorter id list. No caller narrows it: the discover
 * lane has no availability control, so every production read passes the whole
 * collection.
 *
 * The left join is load-bearing: a commander with zero owned support still has
 * to appear, because the floor and the count line are claims about the whole
 * candidate population, not about the rows that happened to overlap. The owned
 * match therefore lives inside a derived table rather than in a second join on
 * the outer query — drizzle emits joins in call order, so an inner join written
 * after the left join would filter the left join's NULL rows back out.
 *
 * `collectionOracleIds` is the whole collection, and would be passed only when
 * the ranking is scoped to a smaller pool — which no lane now does, so it is
 * unread until the `DiscoveryItem.counts` question is settled with Design.
 * Omitting it is not a degraded read: when
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
  // The whole-pool read is `/discover`'s, rebuilt on every cache miss: it reads the stored counts.
  // A narrowed ranked pool is a different count and keeps the live aggregate.
  const stored = collectionOracleIds == null ? await storedOwnedSupport(userId, ownedOracleIds) : null;
  const run = (owned: SQL, storeCurrent: SQL) => {
    const base = db
      .select({
        oracleId: commanderSupport.commanderOracleId,
        name: cards.name,
        colorIdentity: cards.colorIdentity,
        imageUri: cards.imageUri,
        artCropUri: cards.artCropUri,
        releasedAt: RELEASED_AT,
        edhrecTotal: commanderSupport.edhrecTotal,
        deckCount: commanderSupport.deckCount,
        tags: commanderSupport.tags,
        prose: commanderSupport.prose,
        ownedSupport: ownedSupportColumn(),
        collectionSupport: collectionSupportColumn(collectionOracleIds != null),
        storeCurrent: sql<boolean>`${storeCurrent}`.as("store_current"),
      })
      .from(commanderSupport)
      .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
      .leftJoin(owned, OWNED_SUPPORT_ON);
    return (collectionOracleIds != null
      ? base.leftJoin(collectionSupportTable(collectionOracleIds), COLLECTION_SUPPORT_ON)
      : base
    ).where(discoverCandidates(userId, collectionOracleIds ?? ownedOracleIds));
  };

  let rows = stored ? await run(stored.table, stored.current) : await run(ownedSupportTable(ownedOracleIds), sql`true`);
  // The stamp is re-read INSIDE the statement that read the counts, so both come from one snapshot.
  // A render whose inputs went stale could rewrite the store between this request's check and its
  // read; then this statement sees the moved stamp, and the live aggregate answers instead.
  if (stored && rows.length > 0 && !rows[0].storeCurrent) {
    rows = await run(ownedSupportTable(ownedOracleIds), sql`true`);
  }
  // `storeCurrent` is this read's own check, not a row field: it never reaches the payload.
  return rows.map((row) => {
    const { storeCurrent, ...r } = row;
    void storeCurrent;
    return shapeCandidate(r);
  });
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

/**
 * The key a reader's stored counts are valid for: the owned ids as a set, the index build, and the
 * catalog refresh. The catalog is in it because the count filters on colour identity, which a
 * refresh can move under ids that did not change; it moves daily, so the store recomputes about once
 * a day per reader, against once per page build before.
 */
export function ownedSupportKey(ownedOracleIds: readonly string[], indexGen: string, catalogGen: string): string {
  const ids = [...new Set(ownedOracleIds)].sort();
  return `${createHash("sha256").update(ids.join(",")).digest("hex")}|${indexGen}|${catalogGen}`;
}

/**
 * The owned-support counts as a derived table aliased `osc`, read from `ownedSupportCounts` when
 * they were computed from these owned ids and this index build, and recomputed into it first when
 * not. The aggregate is the same `ownedSupportTable`, run once per change of input rather than
 * once per page build: the page's cache misses on every deck write, and a deck write moves neither.
 *
 * Anything that stops the store from answering (an unreadable index generation, a database the
 * migration has not reached, a failed write) falls back to the live aggregate, which is what this
 * read did before the store existed. A store is an optimisation, never a reason to fail the page.
 */
async function storedOwnedSupport(
  userId: string,
  ownedOracleIds: string[],
): Promise<{ table: SQL; current: SQL } | null> {
  try {
    const [indexGen, catalogGen] = await Promise.all([indexGeneration(), readCatalogGeneration()]);
    // An unreadable index or an unstamped catalog is no key to trust a store on: the live aggregate.
    if (indexGen === INDEX_UNREADABLE || catalogGen === generationKey(null)) return null;
    const key = ownedSupportKey(ownedOracleIds, indexGen, catalogGen);
    const [stamp] = await db
      .select({ key: ownedSupportStamps.key })
      .from(ownedSupportStamps)
      .where(eq(ownedSupportStamps.userId, userId));
    if (stamp?.key !== key) await refreshOwnedSupport(userId, ownedOracleIds, key);
    return {
      table: sql`(select commander_oracle_id, owned_support from ${ownedSupportCounts}
                   where user_id = ${userId}) as osc`,
      // Checked in the reading statement's own snapshot: an index or catalog publish committing at any
      // point after the counts were written fails it, and the read falls back to the live aggregate.
      current: sql`exists (select 1 from ${ownedSupportStamps}
                            where user_id = ${userId} and key = ${key}
                              and support_millis is not distinct from ${SUPPORT_MILLIS}
                              and catalog_millis is not distinct from ${CATALOG_MILLIS})`,
    };
  } catch {
    return null;
  }
}

/**
 * Replaces a reader's stored counts with the aggregate over `ownedOracleIds`, for every commander
 * with at least one owned support card rather than today's candidates (the rest read as 0 through
 * the outer `coalesce`), and stamps `key`, in one transaction. The per-reader
 * advisory lock serialises two page builds that miss at once; the second finds the stamp the first
 * wrote and writes nothing. The account purge takes the same lock, and a reader with no collection
 * left once it is held gets nothing written back.
 *
 * The counts and the stamp's `support_millis` / `catalog_millis` are written by ONE statement, so
 * they come from one snapshot whatever an index or catalog publish commits meanwhile, and the
 * reading statement checks those two against its own snapshot (`current`).
 */
async function refreshOwnedSupport(userId: string, ownedOracleIds: string[], key: string) {
  await db.transaction(async (tx) => {
    await tx.execute(ownedSupportLock(userId));
    const [stamp] = await tx
      .select({ key: ownedSupportStamps.key })
      .from(ownedSupportStamps)
      .where(eq(ownedSupportStamps.userId, userId));
    if (stamp?.key === key) return;
    const held = await tx.execute<{ held: boolean }>(
      sql`select exists (select 1 from ${collectionItems} where ${collectionItems.userId} = ${userId}) as held`,
    );
    if (!held.rows[0]?.held) return;
    await tx.delete(ownedSupportCounts).where(eq(ownedSupportCounts.userId, userId));
    await tx.execute(sql`with counts as (
        insert into ${ownedSupportCounts} (user_id, commander_oracle_id, owned_support)
        select ${userId}, osc.commander_oracle_id, osc.owned_support from ${ownedSupportTable(ownedOracleIds)}
      )
      insert into ${ownedSupportStamps} (user_id, key, support_millis, catalog_millis, computed_at)
      values (${userId}, ${key}, ${SUPPORT_MILLIS}, ${CATALOG_MILLIS}, now())
      on conflict (user_id) do update
        set key = excluded.key, support_millis = excluded.support_millis,
            catalog_millis = excluded.catalog_millis, computed_at = excluded.computed_at`);
  });
}

/** The newest index build of a commander's support (its header and cards are written in one
 *  transaction), and the catalog stamp, in epoch millis: the two inputs the counts are derived from. */
const SUPPORT_MILLIS = sql`(select (extract(epoch from max(computed_at)) * 1000)::bigint from ${commanderSupport})`;
const CATALOG_MILLIS = sql`(select (extract(epoch from refreshed_at) * 1000)::bigint from ${catalogRefreshes}
                             where id = ${CATALOG_ROW_ID})`;

// The two queries differ only in their select list, so everything below the
// projection is shared: drizzle's fluent type falls apart under a generic
// select, but the join shape is the subtle part and it lives in one place.

// Zero is the real answer for a commander with no owned support, not a guard:
// the derived table only has a row where the overlap is non-empty. A function
// rather than a constant because `.as()` names a column in one query's scope.
const ownedSupportColumn = () =>
  sql<number>`coalesce(osc.owned_support, 0)`.as("owned_support");

const OWNED_SUPPORT_ON = sql`osc.commander_oracle_id = ${commanderSupport.commanderOracleId}`;

/**
 * The earliest dated set this commander was printed in.
 *
 * `cards` is oracle-level and carries no set, so the date has to come through
 * `printings`; the MIN is what makes the figure a property of the commander
 * rather than of whichever printing `cards` happens to hold. A reprint must not
 * make a 1994 legend read as this year's news, which is exactly what "the set of
 * the row in `cards`" would have done.
 *
 * A correlated subquery rather than another derived table: it runs once per
 * candidate — a few thousand rows, not the 240,000 the support counts aggregate
 * — and `printings_oracle_idx` serves it directly.
 */
const RELEASED_AT = sql<string | null>`(
  select min(s.released_at)
    from ${printings} p
    join ${sets} s on s.code = p.set_code
   where p.oracle_id = ${commanderSupport.commanderOracleId}
)`.as("released_at");

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
                ${IDENTITY_RESTRICTION}
               ${commanderScope(commanderIds)}
               group by csc.commander_oracle_id) as osc`;
}

/**
 * Only support cards the commander can legally play.
 *
 * WITHOUT THIS THE COUNT IS NOT THE ONE THE DETAIL PAGE PRINTS, which is the
 * whole of Ruling D. `scoreCommander` takes its numerator from
 * `supportOverlap(support, commanderPool(commander, collection))`, and
 * `commanderPool` filters the collection to the commander's colour identity —
 * so a figure counted without that filter is a different figure, and the row
 * and the detail page it links to disagree about the same commander.
 *
 * The effect is CONCENTRATED rather than spread, which is why it survived this
 * long: EDHREC's list for a coloured commander is already identity-legal, so
 * the predicate removes almost nothing there. Measured on local-dev against the
 * REAL query — an earlier figure here came from a reduced one and mixed rows,
 * cards and commanders in a single sentence — it changes the count for
 * **2 commanders of 3,074**, by 26 and 29 support cards: 55 in total. The
 * visible one is `Faceless One`, whose identity is empty and which read 122
 * owned against 96 playable, a 27% overcount on exactly the kind of commander
 * whose Fit would look too good. `probe:fit-parity` pins the pair.
 *
 * `<@` IS ALREADY CORRECT FOR A COLOURLESS COMMANDER and needs no special case:
 * `{} <@ {}` is true and `{R} <@ {}` is false. `withinColorIdentity` exists
 * because Drizzle's `arrayContained` throws on an empty JS array — a
 * client-side limitation of a constant, not a property of the operator — and
 * both sides here are columns.
 *
 * It also reaches `supportPct`, and so the novelty floor: a commander now
 * clears 30% on what the reader can actually build rather than on cards their
 * identity forbids. That is the same correction one layer out, not a side
 * effect to be undone.
 */
const IDENTITY_RESTRICTION = sql`
  join ${cards} sc on sc.oracle_id = csc.oracle_id
  join ${cards} cm on cm.oracle_id = csc.commander_oracle_id
   and sc.color_identity <@ cm.color_identity`;

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
                ${IDENTITY_RESTRICTION}
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
 * The NULL hazard `notBuiltBy` documents is out of reach on both sides: this
 * array is oracle ids read out of the collection rather than a subquery that
 * could yield one.
 */
function unownedCommanders(collectionOracleIds: string[]) {
  return sql`${commanderSupport.commanderOracleId} <> all(${sql.param(collectionOracleIds)}::uuid[])`;
}

function unbuiltCommanders(userId: string) {
  // `notBuiltBy` carries the reasoning for both columns and for the `not exists`
  // form; it is shared with the detail page's rank window, which has to exclude
  // exactly the same commanders or the two screens disagree about a rank.
  return and(
    eq(cards.commanderLegal, true),
    notBuiltBy(userId, commanderSupport.commanderOracleId),
  );
}

