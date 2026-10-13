import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  cards, commanderScores, type RoleCounts,
} from "../../db/schema";
import { receiptsPreview } from "./format";
import { measurableTotalFor } from "./score";
import type { CommanderListItem, RankedCommander } from "./recommend";
import type { SynergyState } from "./synergy-state";
import { notBuiltBy } from "../decks/built";
import { readIndexGeneration } from "../cache/index-generation";
import { scoreWriterVersion } from "./writer-version";
import { SCORE_INDEX_LOCK } from "./score-lock";
import { readLabelRoleSets } from "../labels/read";
import { roleSetFingerprint } from "../labels/role-sets";
import type { LabelCheck } from "./pool-role-basis";
import { recordSoftFailure } from "../cache/soft-failure";

// Postgres codes meaning the schema is behind the code: 42P01 undefined_table,
// 42703 undefined_column. commander_scores is a cache and both readers already
// handle a miss, so treating these as a miss turns a late migration into a slow
// page instead of the site-wide 500 in #70. Deliberately narrow — a blanket catch
// would convert a real outage into a silent 196-commander recompute per request.
const SCHEMA_LAG_CODES = new Set(["42P01", "42703"]);

export function isSchemaLagError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  const { code } = err as { code: unknown };
  return typeof code === "string" && SCHEMA_LAG_CODES.has(code);
}

export type ScoreRowWithCard = {
  oracleId: string;
  slug: string;
  score: number;
  rankScore: number;
  fitPool: number;
  fitRoles: number;
  fitSynergy: number | null;
  synergyState: SynergyState;
  edhrecOwnedCount: number | null;
  edhrecTotal: number | null;
  receipts: string;
  colorPoolSize: number;
  roleCounts: RoleCounts;
  name: string;
  typeLine: string;
  colorIdentity: string[];
  imageUri: string | null;
  artCropUri: string | null;
};

/** `env` is the reader's resolved switches: the writer version carries the role basis (`scoreWriterVersion`),
 *  and the basis follows the reader's `LABEL_ROLE_COUNTS_ENABLED`, which takes an app-wide override. */
export function toScoreRow(userId: string, r: RankedCommander, env: NodeJS.ProcessEnv = process.env) {
  return {
    userId,
    oracleId: r.oracleId,
    slug: r.slug,
    score: r.score,
    rankScore: r.rankScore,
    fitPool: r.fitPool,
    fitRoles: r.fitRoles,
    fitSynergy: r.fitSynergy,
    synergyState: r.synergyState,
    edhrecOwnedCount: r.edhrecOwnedCount,
    edhrecTotal: r.edhrecTotal,
    receipts: receiptsPreview(r.overlapOwned),
    colorPoolSize: r.colorPoolSize,
    roleCounts: r.roleCounts,
    // Named on every insert, which is what makes the column's default a sentinel
    // for rows an older deployment wrote. See `SCORE_WRITER_CURRENT`.
    writerVersion: scoreWriterVersion(env),
    computedAt: new Date(),
  };
}

export function rowToListItem(row: ScoreRowWithCard): CommanderListItem {
  return {
    oracleId: row.oracleId,
    slug: row.slug,
    name: row.name,
    typeLine: row.typeLine,
    colorIdentity: row.colorIdentity,
    colorPoolSize: row.colorPoolSize,
    roleCounts: row.roleCounts,
    edhrecOwnedCount: row.edhrecOwnedCount,
    edhrecTotal: row.edhrecTotal,
    receipts: row.receipts,
    fitPool: row.fitPool,
    fitRoles: row.fitRoles,
    fitSynergy: row.fitSynergy,
    synergyState: row.synergyState,
    score: row.score,
    rankScore: row.rankScore,
    measurableTotal: measurableTotalFor(row.fitSynergy),
    imageUri: row.imageUri,
    artCropUri: row.artCropUri,
  };
}

type Executor = Pick<typeof db, "execute">;

/**
 * Fingerprint of the collection a score compute is about to read: a token over BOTH of the
 * collection's writers (plan 2026-10-09, Decision 4).
 *
 * - `max(collection_history.seq)` moves on every ledger write (`applyCollectionChange`), a
 *   hand edit included.
 * - `max(csv_uploads.confirmed_at)` moves on every confirmed upload, which is the only
 *   collection write while the switch is off.
 *
 * Either alone misses a transition. Seq alone stands still when the switch is turned off
 * after a player has history, since a legacy upload writes no entry. The timestamp alone is
 * what a previous deployment compares, and a hand edit never moves it. The two are compared
 * WHOLE, so either moving moves the token; neither moves backwards, because `seq` is a
 * bigserial and retention prunes an entry's rows without deleting it.
 *
 * Callers capture this *before* reading the pool and hand it to persistScores.
 */
export async function collectionGeneration(userId: string): Promise<string> {
  return readCollectionGeneration(db, userId);
}

/**
 * Reads the generation token through `executor`, a transaction or the pool.
 *
 * The timestamp half is read as epoch millis IN SQL. The column is `timestamp` without time
 * zone, so the driver's own rendering parses as local time, and a token compared across two
 * paths that parsed it differently would never match.
 *
 * A database the ledger's migration has not reached (a preview deploy runs none) has no
 * `collection_history`, and the timestamp half is then the whole truth, since nothing can write
 * a ledger entry. That is asked first, in its own statement, rather than caught: inside
 * `persistScores`'s transaction a failed statement aborts the transaction, and every score
 * write on such a database would be dropped.
 */
export async function readCollectionGeneration(executor: Executor, userId: string): Promise<string> {
  const ledger = await executor.execute<{ present: boolean }>(
    sql`select to_regclass('public.collection_history') is not null as present`,
  );
  const seq = ledger.rows[0]?.present
    ? sql`(select max(h.seq) from collection_history h where h.user_id = ${userId})`
    : sql`null::bigint`;
  const rows = await executor.execute<{ seq: string | number | null; at: string | number | null }>(sql`
    select
      ${seq} as seq,
      (select (extract(epoch from max(u.confirmed_at)) * 1000)::bigint
         from csv_uploads u where u.user_id = ${userId}) as at
  `);
  const row = rows.rows[0];
  return generationToken(row?.seq ?? null, row?.at ?? null);
}

/** The token: both halves, `-` for an absent one, compared whole. */
export function generationToken(seq: string | number | null, at: string | number | null): string {
  return `${seq === null ? "-" : String(seq)}|${at === null ? "-" : String(at)}`;
}

/**
 * The advisory-lock key that coordinates score writes with an index rebuild.
 *
 * Not per-user, unlike the collection replace's: what it serialises is every
 * score write against the ONE rebuild, so the key names the resource rather
 * than a reader. `hashtextextended` because `pg_advisory_xact_lock` takes a
 * bigint and this repo already reaches for that pairing in `collection/import`
 * and `decks/assign`.
 */
export { SCORE_INDEX_LOCK };

/**
 * Fingerprint of the commander index a score compute is about to read.
 *
 * The same idea as `collectionGeneration` and for a sharper reason. Ruling D
 * made `fit_synergy` a function of `commander_support`, so a rebuild invalidates
 * a persisted score — and `buildCommanderIndex` deletes this table when it
 * finishes, which handles the ordinary case. What it cannot handle is the RACE:
 * a request reads support before that delete, finishes its fanout after it, and
 * upserts a set computed against the old index. Those rows are
 * writer-version-current, so nothing downstream can tell.
 *
 * `writer_version` cannot express this. It says which CODE wrote a row, and the
 * rebuild changes the DATA under identical code.
 *
 * Read as the WHOLE index token (`readIndexGeneration`), not `max(computed_at)` alone,
 * since the fit score reads the measured role targets (brief 2026-09-28 §5.4). The role
 * pass writes those without moving `computed_at`, and `db:build:staples` rewrites the
 * identity buckets after the build; a guard on the timestamp alone passed a score
 * computed against either input's previous figures. The token moves with both, and it
 * is the same one the deck pages' caches key on, so the two cannot disagree about what
 * an index change is.
 *
 * UNCACHED, deliberately: `cache/index-generation.ts`'s `indexGeneration` holds its
 * answer for 60 seconds, and a guard read from a cache compares two stale readings.
 *
 * Callers capture it BEFORE reading support and hand it to `persistScores`,
 * which re-reads it inside its own transaction and drops the write if it moved.
 */
export async function indexGeneration(): Promise<string> {
  try {
    return await readIndexGeneration(db, { strict: true });
  } catch {
    // Not the unstamped token: that is a real reading (nothing built), and two failed reads
    // answering it would compare equal and pass the guard. This one never matches a reading,
    // so `persistScores` declines the write. Recorded, since it sits on Home's cached path.
    recordSoftFailure();
    return INDEX_UNREADABLE;
  }
}

/** What `indexGeneration` answers when the index could not be read. No reading equals it. */
export const INDEX_UNREADABLE = "unreadable";

/**
 * Upsert rather than delete-then-insert: the after() warm and an inline compute
 * from a concurrent page load can run at once, and under READ COMMITTED a second
 * transaction's DELETE cannot see the first's uncommitted rows — its INSERT would
 * then collide on the composite primary key and abort the render.
 *
 * Last-write-wins is only safe between writers reading the same collection, so the
 * write is dropped when the generation moved after `generation` was captured. A
 * compute that started before a confirmUpload would otherwise commit old-collection
 * rows after the upload wiped the table, and loadScores' fast path would serve them
 * indefinitely — nothing marks them stale.
 *
 * The generation is `collectionGeneration`'s token, so it moves on a confirmed import and
 * on every ledger write. `pnpm db:seed:collection` writes through `replaceCollection` with
 * neither, so a collection can still change while the generation stands still. What keeps
 * that safe is not the generation but the unconditional `delete(commanderScores)` that every
 * collection writer runs in its own transaction alongside the rewrite (`replaceCollection`
 * and `applyCollectionChange` both): there is nothing stale left to serve.
 *
 * So the invariant to preserve is that one, not this function's. A future writer
 * that changes a collection without dropping `commanderScores` leaves every cached
 * score served as current, whether or not it moves the generation.
 */
export async function persistScores(
  userId: string,
  ranked: RankedCommander[],
  generation: string,
  /**
   * The commander-index generation the caller read its support data at. A write
   * whose index has moved since is dropped, which closes the rebuild race — see
   * `indexGeneration`.
   *
   * `undefined` — omitted — is "do not check", the behaviour every caller had
   * before this existed. Every reading is a string: an index with no rows at all
   * reads as the token's own unstamped constant, which compares equal to itself,
   * so "empty" stays a real reading rather than collapsing onto "no opinion".
   *
   * NO PRODUCTION CALLER OMITS IT, and the omitted path cannot be closed by
   * making the parameter required, because what still reaches it is a PREVIOUS
   * DEPLOYMENT running code that has no fourth argument to pass. That window is
   * closed by `SCORE_WRITER_CURRENT`, which version 4 bumps for this reason
   * alone: rows an unguarded writer leaves behind announce 3 and are refused.
   */
  indexGen?: string,
  /**
   * What the compute read its label sets as (labels basis only). Re-read under the same shared
   * lock a label publish retires scores behind: a publish committing before the compute's labels
   * were read is seen by the compute, one committing after the lock is seen here as a changed
   * fingerprint, and one holding the lock makes this wait. Either way no row counted by labels
   * that have since moved is stored. Absent is "do not check".
   */
  labelCheck?: LabelCheck,
  /** The env the scores were COMPUTED under (the reader's resolved switches), so the version stamped
   *  names the basis they were counted by, not the environment's. */
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  // A token taken over a failed read guards nothing, so there is nothing to compare against.
  if (indexGen === INDEX_UNREADABLE) return;
  const rows = ranked.map((r) => toScoreRow(userId, r, env));
  const keep = rows.map((r) => r.oracleId);
  await db.transaction(async (tx) => {
    // Announce which writer this is, transaction-locally. The trigger added in
    // 0027 stamps every row this transaction touches as version 1 unless it sees
    // this — which is how an older deployment's upsert is stopped from leaving a
    // truncated set marked current, whether it arrives by rollback or as a
    // compute that was already in flight at cutover. A writer that says nothing
    // is, by definition, one that predates the marker.
    await tx.execute(
      sql`select set_config('app.writer_version', ${String(scoreWriterVersion(env))}, true)`,
    );

    // BOTH LOCKS COME BEFORE EITHER FINGERPRINT READ, and that ordering is the
    // whole point rather than tidiness. A lock taken after a comparison means
    // the transaction can PARK on the lock while the very thing it just
    // compared moves underneath it: round 2 found that the index lock below,
    // placed after the collection read, let a rebuild hold this write long
    // enough for an upload to commit, delete this user's scores, and be
    // followed by these pre-upload rows landing anyway.
    //
    // The per-user key is `replaceCollection`'s own (`collection/import`), so
    // the collection comparison is atomic with the writes for the same reason
    // the index one is. Nothing takes these two in the opposite order — the
    // clear takes the index key alone, the replace takes the user key alone —
    // so the fixed order here cannot cycle.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    if (indexGen !== undefined) {
      await tx.execute(
        sql`select pg_advisory_xact_lock_shared(hashtextextended(${SCORE_INDEX_LOCK}, 0))`,
      );
    }

    if ((await readCollectionGeneration(tx, userId)) !== generation) return;

    // The same guard for the index, in the same transaction and for the same
    // reason: the compute that produced these rows read support some seconds
    // ago, and a rebuild committing in between makes every synergy figure in
    // them stale. Skipped when the caller passed nothing, so this cannot turn
    // an un-checked caller into one that never writes.
    //
    // THE LOCK IS WHAT MAKES THE COMPARISON MEAN ANYTHING, and a first version
    // of this guard had only the comparison. A read alone proves the index had
    // not moved at the instant it ran, not at COMMIT: the rebuild could commit
    // its support writes and its `clearScores()` in the gap between this check
    // and the inserts below, and those pre-rebuild rows would then survive the
    // clear. The shared lock taken above closes it from both sides — either
    // this transaction holds it and the clear waits until the rows it must
    // delete exist, or the clear holds it and this read happens afterwards and
    // sees the new generation. Shared rather than exclusive because score
    // writes have no reason to serialise against EACH OTHER; the one exclusive
    // taker is the rebuild.
    if (indexGen !== undefined) {
      // Strict: a failed re-read throws and abandons the write, never reads as a match.
      if ((await readIndexGeneration(tx, { strict: true })) !== indexGen) return;
    }
    if (labelCheck) {
      const now = await readLabelRoleSets(labelCheck.oracleIds, tx);
      if (roleSetFingerprint(labelCheck.oracleIds, now) !== labelCheck.fingerprint) return;
    }
    await tx.delete(commanderScores).where(
      keep.length === 0
        ? eq(commanderScores.userId, userId)
        : and(eq(commanderScores.userId, userId), notInArray(commanderScores.oracleId, keep)),
    );
    for (let i = 0; i < rows.length; i += 500) {
      await tx.insert(commanderScores).values(rows.slice(i, i + 500)).onConflictDoUpdate({
        target: [commanderScores.userId, commanderScores.oracleId],
        set: {
          slug: sql`excluded.slug`,
          score: sql`excluded.score`,
          rankScore: sql`excluded.rank_score`,
          fitPool: sql`excluded.fit_pool`,
          fitRoles: sql`excluded.fit_roles`,
          fitSynergy: sql`excluded.fit_synergy`,
          synergyState: sql`excluded.synergy_state`,
          edhrecOwnedCount: sql`excluded.edhrec_owned_count`,
          edhrecTotal: sql`excluded.edhrec_total`,
          receipts: sql`excluded.receipts`,
          colorPoolSize: sql`excluded.color_pool_size`,
          roleCounts: sql`excluded.role_counts`,
          // Load-bearing, not bookkeeping. Most of this set's rows already exist,
          // so without it a row written by an older writer keeps that version
          // through the very recompute meant to heal it — `loadScores` condemns
          // the set again on the next read, and every request recomputes forever.
          writerVersion: sql`excluded.writer_version`,
          computedAt: sql`excluded.computed_at`,
        },
      });
    }
  });
}

export async function loadScores(
  userId: string,
  /** The reader's resolved switches: a set is current only under the basis this reader counts by. */
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ items: CommanderListItem[]; degradedOracleIds: string[] }> {
  try {
    const rows = await db
      .select({
        oracleId: commanderScores.oracleId,
        slug: commanderScores.slug,
        score: commanderScores.score,
        rankScore: commanderScores.rankScore,
        fitPool: commanderScores.fitPool,
        fitRoles: commanderScores.fitRoles,
        fitSynergy: commanderScores.fitSynergy,
        synergyState: commanderScores.synergyState,
        edhrecOwnedCount: commanderScores.edhrecOwnedCount,
        edhrecTotal: commanderScores.edhrecTotal,
        receipts: commanderScores.receipts,
        colorPoolSize: commanderScores.colorPoolSize,
        roleCounts: commanderScores.roleCounts,
        writerVersion: commanderScores.writerVersion,
        name: cards.name,
        typeLine: cards.typeLine,
        colorIdentity: cards.colorIdentity,
        imageUri: cards.imageUri,
        artCropUri: cards.artCropUri,
      })
      .from(commanderScores)
      .innerJoin(cards, eq(commanderScores.oracleId, cards.oracleId))
      .where(eq(commanderScores.userId, userId))
      .orderBy(desc(commanderScores.rankScore), commanderScores.oracleId);

    // A row can only carry the sentinel if it was written between 0017 adding the column
    // and the deployment that knows about it going live. Such a row is neither empty nor
    // degraded — the two states `getRankedList` recomputes on — so serving it would pin
    // the whole list in an order nothing computed, until something unrelated happened to
    // invalidate it. Reporting no rows is a miss, and the recompute rewrites every one.
    //
    // One sentinel condemns the set rather than being filtered out of it, because
    // `persistScores` writes a user's rows in a single transaction: a set with one such
    // row was written entirely by that deployment, and the rest of it is no more current
    // than the row that gives it away.
    if (rows.some((r) => r.rankScore < 0)) return { items: [], degradedOracleIds: [] };

    // The same rule for the same reason, one sentinel later. A set written before
    // the writer scored built commanders has those rows deleted out of it, and is
    // neither empty nor degraded — so serving it would go on hiding a commander
    // whose deck has since been deleted, for as long as nothing else invalidated
    // the set. One stale row condemns the set: `persistScores` writes a user's
    // rows in one transaction, so the rest is no more current than the row that
    // gives it away.
    if (rows.some((r) => r.writerVersion !== scoreWriterVersion(env))) {
      return { items: [], degradedOracleIds: [] };
    }

    return {
      items: rows.map(rowToListItem),
      degradedOracleIds: rows.filter((r) => r.synergyState === "degraded").map((r) => r.oracleId),
    };
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
    // not a fallback: an empty read is a miss, and the caller recomputes the whole list from source.
    return { items: [], degradedOracleIds: [] };
  }
}

/**
 * The rows a rank may be counted over: this user's, from a set no older writer
 * touched, minus the commanders that already helm a deck.
 *
 * Exported so the emitted SQL is assertable — every clause here is a rule stated
 * somewhere else as well, and the failure mode of each is a number on one screen
 * disagreeing with the same number on another.
 *
 * Staleness is a property of the SET, not of the row, which is the same rule
 * `loadScores` applies and has to be: a row-level filter would quietly rank the
 * current rows of a mixed set, and that is a rank counted over a set the list has
 * already thrown away. One stale row refuses the whole set and the caller falls
 * through to the computed list.
 *
 * BOTH sentinels, for that same reason. `loadScores` condemns a set for an
 * unwritten `rank_score` as well as for an older writer, and a window that knew
 * only about one of them would hand a detail page a rank off a set the list is
 * recomputing — the two surfaces disagreeing about one commander, which is the
 * failure this whole rule exists to prevent.
 *
 * The built exclusion is here because the store deliberately HOLDS built
 * commanders — it is what `persistScores` writes from, and dropping them there is
 * what used to evict a commander permanently when a deck was built around it —
 * while the list deliberately does not draw them. A window counted over rows the
 * list does not show is a rank that disagrees with it: the commander at the top
 * of the page would read `Rank #2` because a built commander outscored it.
 *
 * A built commander therefore resolves nowhere through this query, which is where
 * it resolved before the store held it at all: `resolveCommanderSlug` falls
 * through to the owned list (which excludes it) and then to discovery (which
 * excludes what the player owns), and its detail page 404s. That is a separate
 * question, and not one to settle by handing out a rank no list agrees with.
 */
export function rankableScoreRows(userId: string, env: NodeJS.ProcessEnv = process.env) {
  return and(
    eq(commanderScores.userId, userId),
    sql`not exists (
      select 1 from ${commanderScores} stale
      where stale.user_id = ${userId}
        and (
          stale.writer_version <> ${scoreWriterVersion(env)}
          or stale.rank_score < ${0}
        )
    )`,
    notBuiltBy(userId, commanderScores.oracleId),
  );
}

/**
 * Resolves a persisted slug to its commander and rank in one query, returning a
 * single row rather than pulling the user's whole scored list into memory.
 * Rank comes from the stored ordering, so it matches the list the user clicked
 * from — including the oracleId tie-break that recommendCommanders applies.
 */
export async function findScoredCommander(
  userId: string,
  slug: string,
  /** The reader's resolved switches, as `loadScores` takes them: the rank window is the list's. */
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ oracleId: string; rank: number; anyDegraded: boolean } | null> {
  try {
    const ranked = db.$with("ranked").as(
      db
        .select({
          oracleId: commanderScores.oracleId,
          slug: commanderScores.slug,
          rank: sql<number>`(row_number() over (order by ${commanderScores.rankScore} desc, ${commanderScores.oracleId}))::int`.as("rank"),
          // Same window pass, so the caller learns whether these ranks came from an
          // outage-era compute without paying a second round trip.
          anyDegraded: sql<boolean>`bool_or(${commanderScores.synergyState} = 'degraded') over ()`.as("any_degraded"),
        })
        .from(commanderScores)
        // The window runs over the UNBUILT rows, the same population the list
        // shows. The store holds every scored commander, built ones included —
        // it is what `persistScores` writes from, and dropping them there is what
        // used to evict a commander permanently when a deck was built around it
        // — but a rank counted over rows the list does not draw is a rank that
        // disagrees with the list: the commander at the top of the page would
        // read `Rank #2` because a built commander outscored it.
        //
        // A built commander therefore resolves nowhere here, which is where it
        // resolved before this store held it at all: `resolveCommanderSlug` falls
        // through to the owned list (which excludes it) and then to discovery
        // (which excludes what the player owns). Its detail page 404s, exactly as
        // it did before — a separate question from this one, and not one to
        // settle by handing out a rank no list agrees with.
        .where(rankableScoreRows(userId, env)),
    );
    const [row] = await db
      .with(ranked)
      .select({ oracleId: ranked.oracleId, rank: ranked.rank, anyDegraded: ranked.anyDegraded })
      .from(ranked)
      .where(eq(ranked.slug, slug))
      .limit(1);
    return row ?? null;
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
    // not a fallback: only the commander detail route asks for one rank, and it caches nothing.
    return null;
  }
}

export async function deleteAllScores(userId: string): Promise<void> {
  await db.delete(commanderScores).where(eq(commanderScores.userId, userId));
}
