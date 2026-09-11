import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  cards, commanderScores, csvUploads, SCORE_WRITER_CURRENT, type RoleCounts,
} from "../../db/schema";
import { receiptsPreview } from "./format";
import { measurableTotalFor } from "./score";
import type { CommanderListItem, RankedCommander } from "./recommend";
import type { SynergyState } from "./synergy-state";
import { notBuiltBy } from "../decks/built";

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

export function toScoreRow(userId: string, r: RankedCommander) {
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
    writerVersion: SCORE_WRITER_CURRENT,
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

/**
 * Fingerprint of the collection a score compute is about to read. confirmUpload is
 * the only writer of collection_items, and it stamps confirmedAt in the same
 * transaction, so the latest confirm time identifies the collection generation.
 * Callers capture this *before* reading the pool and hand it to persistScores.
 */
export async function collectionGeneration(userId: string): Promise<number | null> {
  const [row] = await db
    .select({ at: sql<Date | null>`max(${csvUploads.confirmedAt})` })
    .from(csvUploads)
    .where(eq(csvUploads.userId, userId));
  return row?.at ? new Date(row.at).getTime() : null;
}

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
 * The generation is `max(csvUploads.confirmedAt)`, so it only moves on a *confirmed*
 * import — and `replaceCollection`, the sole writer of `collectionItems`, takes
 * `confirmUploadId` as optional. `pnpm db:seed:collection` writes without it, so a
 * collection can change while the generation stands still. What keeps that safe is
 * not the generation but the unconditional `delete(commanderScores)` that
 * `replaceCollection` itself runs, in its own transaction alongside the rewrite:
 * there is nothing stale left to serve.
 *
 * So the invariant to preserve is that one, not this function's. A future writer
 * that changes a collection without dropping `commanderScores` leaves every cached
 * score served as current, whether or not it moves the generation.
 */
export async function persistScores(
  userId: string,
  ranked: RankedCommander[],
  generation: number | null,
): Promise<void> {
  const rows = ranked.map((r) => toScoreRow(userId, r));
  const keep = rows.map((r) => r.oracleId);
  await db.transaction(async (tx) => {
    const [gen] = await tx
      .select({ at: sql<Date | null>`max(${csvUploads.confirmedAt})` })
      .from(csvUploads)
      .where(eq(csvUploads.userId, userId));
    const current = gen?.at ? new Date(gen.at).getTime() : null;
    if (current !== generation) return;
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
    if (rows.some((r) => r.writerVersion < SCORE_WRITER_CURRENT)) {
      return { items: [], degradedOracleIds: [] };
    }

    return {
      items: rows.map(rowToListItem),
      degradedOracleIds: rows.filter((r) => r.synergyState === "degraded").map((r) => r.oracleId),
    };
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
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
export function rankableScoreRows(userId: string) {
  return and(
    eq(commanderScores.userId, userId),
    sql`not exists (
      select 1 from ${commanderScores} stale
      where stale.user_id = ${userId}
        and stale.writer_version < ${SCORE_WRITER_CURRENT}
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
        .where(rankableScoreRows(userId)),
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
    return null;
  }
}

export async function deleteAllScores(userId: string): Promise<void> {
  await db.delete(commanderScores).where(eq(commanderScores.userId, userId));
}
