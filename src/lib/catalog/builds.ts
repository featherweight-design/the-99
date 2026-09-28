import { desc, eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "../../db/schema";
import { catalogBuilds } from "../../db/schema";
import { fingerprintKey, readCatalogFingerprint } from "./fingerprint";

/**
 * The build ledger (`catalog_builds`, migration 0074): what a copy reads to decide whether the
 * source holds a build it may publish. Written only by `db:catalog-build start|finish` around a
 * build, which the build workflows call (plan PR 3), so a build run by hand without it records
 * nothing and a copy of it refuses.
 */
export type BuildKind = "index" | "combos";
type Db = NeonDatabase<typeof schema>;

export type BuildRow = typeof catalogBuilds.$inferSelect;

export async function startBuild(db: Db, kind: BuildKind): Promise<BuildRow> {
  const fingerprint = await readCatalogFingerprint(db);
  const [row] = await db.insert(catalogBuilds)
    .values({ kind, catalogFingerprint: fingerprintKey(fingerprint) })
    .returning();
  return row;
}

export async function finishBuild(db: Db, id: string, ok: boolean, report: string | null): Promise<void> {
  await db.update(catalogBuilds).set({ finishedAt: new Date(), ok, report }).where(eq(catalogBuilds.id, id));
}

/** Any connection or transaction that can select, on this schema. */
type Reader = Pick<Db, "select">;

export async function latestBuild(db: Reader, kind: BuildKind): Promise<BuildRow | null> {
  const [row] = await db.select().from(catalogBuilds)
    .where(eq(catalogBuilds.kind, kind))
    .orderBy(desc(catalogBuilds.startedAt))
    .limit(1);
  return row ?? null;
}

/**
 * Why the newest build may NOT be copied, or null when it may. Pure, so each refusal has a test.
 *
 * The NEWEST build decides, not the newest successful one: a failed build after a good one means
 * staging's tables may now hold that failure's partial writes, so the good row no longer
 * describes them. `sourceNow` and `target` are the catalogs' current fingerprints; both must
 * equal the one the build started from, or the copied facts were derived from a different
 * catalog than either side now holds.
 */
export function buildRefusal(
  build: Pick<BuildRow, "ok" | "finishedAt" | "catalogFingerprint"> | null,
  sourceNow: string,
  target: string,
): string | null {
  if (!build) return "the source records no build of this kind";
  if (build.finishedAt === null || build.ok === null) return "the source's newest build has not finished";
  if (!build.ok) return "the source's newest build failed";
  if (build.catalogFingerprint !== sourceNow) {
    return `the source's catalog moved since the build (built ${build.catalogFingerprint}, now ${sourceNow})`;
  }
  if (build.catalogFingerprint !== target) {
    return `the catalogs disagree (source built ${build.catalogFingerprint}, target ${target}); refresh the stale catalog`;
  }
  return null;
}
