import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderScores, type RoleCounts } from "../../db/schema";
import { receiptsPreview } from "./format";
import type { CommanderListItem, RankedCommander } from "./recommend";
import type { SynergyState } from "./synergy-state";

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
    score: row.score,
    imageUri: row.imageUri,
  };
}

/**
 * Upsert rather than delete-then-insert: the after() warm and an inline compute
 * from a concurrent page load can run at once, and under READ COMMITTED a second
 * transaction's DELETE cannot see the first's uncommitted rows — its INSERT would
 * then collide on the composite primary key and abort the render. Both writers
 * derive from the same collection snapshot, so last-write-wins is safe.
 */
export async function persistScores(userId: string, ranked: RankedCommander[]): Promise<void> {
  const rows = ranked.map((r) => toScoreRow(userId, r));
  const keep = rows.map((r) => r.oracleId);
  await db.transaction(async (tx) => {
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
}

export async function deleteAllScores(userId: string): Promise<void> {
  await db.delete(commanderScores).where(eq(commanderScores.userId, userId));
}
