import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderScores, csvUploads, type RoleCounts } from "../../db/schema";
import { receiptsPreview } from "./format";
import type { CommanderListItem, RankedCommander } from "./recommend";
import type { SynergyState } from "./synergy-state";

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
  colorIdentity: string[];
  imageUri: string | null;
};

export function toScoreRow(userId: string, r: RankedCommander) {
  return {
    userId,
    oracleId: r.oracleId,
    slug: r.slug,
    score: r.score,
    fitPool: r.fitPool,
    fitRoles: r.fitRoles,
    fitSynergy: r.fitSynergy,
    synergyState: r.synergyState,
    edhrecOwnedCount: r.edhrecOwnedCount,
    edhrecTotal: r.edhrecTotal,
    receipts: receiptsPreview(r.overlapOwned),
    colorPoolSize: r.colorPoolSize,
    roleCounts: r.roleCounts,
    computedAt: new Date(),
  };
}

export function rowToListItem(row: ScoreRowWithCard): CommanderListItem {
  return {
    oracleId: row.oracleId,
    slug: row.slug,
    name: row.name,
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
    imageUri: row.imageUri,
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
          fitPool: sql`excluded.fit_pool`,
          fitRoles: sql`excluded.fit_roles`,
          fitSynergy: sql`excluded.fit_synergy`,
          synergyState: sql`excluded.synergy_state`,
          edhrecOwnedCount: sql`excluded.edhrec_owned_count`,
          edhrecTotal: sql`excluded.edhrec_total`,
          receipts: sql`excluded.receipts`,
          colorPoolSize: sql`excluded.color_pool_size`,
          roleCounts: sql`excluded.role_counts`,
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
        fitPool: commanderScores.fitPool,
        fitRoles: commanderScores.fitRoles,
        fitSynergy: commanderScores.fitSynergy,
        synergyState: commanderScores.synergyState,
        edhrecOwnedCount: commanderScores.edhrecOwnedCount,
        edhrecTotal: commanderScores.edhrecTotal,
        receipts: commanderScores.receipts,
        colorPoolSize: commanderScores.colorPoolSize,
        roleCounts: commanderScores.roleCounts,
        name: cards.name,
        colorIdentity: cards.colorIdentity,
        imageUri: cards.imageUri,
      })
      .from(commanderScores)
      .innerJoin(cards, eq(commanderScores.oracleId, cards.oracleId))
      .where(eq(commanderScores.userId, userId))
      .orderBy(desc(commanderScores.score), commanderScores.oracleId);

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
          rank: sql<number>`(row_number() over (order by ${commanderScores.score} desc, ${commanderScores.oracleId}))::int`.as("rank"),
          // Same window pass, so the caller learns whether these ranks came from an
          // outage-era compute without paying a second round trip.
          anyDegraded: sql<boolean>`bool_or(${commanderScores.synergyState} = 'degraded') over ()`.as("any_degraded"),
        })
        .from(commanderScores)
        .where(eq(commanderScores.userId, userId)),
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
