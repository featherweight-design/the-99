import { and, desc, eq, isNull } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "../../db/schema";
import { catalogBuilds } from "../../db/schema";
import { fingerprintKey, readCatalogFingerprint } from "./fingerprint";

/**
 * The build ledger (`catalog_builds`, migration 0074): what a copy reads to decide whether the
 * source holds a build it may publish. A builder records ITSELF through `recordBuild`, so every
 * invocation, scheduled or by hand, leaves a newer row: a run that dies part-way leaves that row
 * failed or unfinished as the newest, and a copy refuses it rather than trusting an older `ok`
 * over tables that have since moved. `db:catalog-build start|finish` remains for a build made of
 * several steps that a workflow brackets.
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

/**
 * Closes the one unfinished build of `kind` with this id, and throws when there is none: a stale
 * or mistyped id, one of the other kind, or a row already finished. A `finish` step that closed
 * nothing and exited green would leave the build open, and every copy of it refusing, behind a
 * job that reported success.
 */
export async function finishBuild(
  db: Db, id: string, kind: BuildKind, ok: boolean, report: string | null,
): Promise<BuildRow> {
  const [row] = await db.update(catalogBuilds)
    .set({ finishedAt: new Date(), ok, report })
    .where(and(eq(catalogBuilds.id, id), eq(catalogBuilds.kind, kind), isNull(catalogBuilds.finishedAt)))
    .returning();
  if (!row) throw new Error(`no unfinished ${kind} build ${id} to finish`);
  return row;
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

/**
 * Runs one build between its own ledger rows: started before `run`, finished `ok` only when it
 * returns, and finished failed when it throws, which is rethrown. A finish that cannot be written
 * after a failed run is reported beside that failure and never replaces it.
 */
export async function recordBuild<T>(
  db: Db,
  kind: BuildKind,
  run: () => Promise<T>,
  report: (result: T) => string | null = () => null,
  deps: { start: typeof startBuild; finish: typeof finishBuild } = { start: startBuild, finish: finishBuild },
): Promise<T> {
  let row: BuildRow;
  try {
    row = await deps.start(db, kind);
  } catch (err) {
    // A database migrations have not reached (0074): the build runs unrecorded, with a warning,
    // as `catalog_refreshes` is written. That is safe because a copy reads the same table and
    // refuses on its absence. Any other failure to record stops the build.
    if (!isMissingTable(err)) throw err;
    console.warn(`catalog_builds does not exist here yet (migration 0074): this ${kind} build is not recorded, and no copy of it can run.`);
    return run();
  }
  let result: T;
  try {
    result = await run();
  } catch (err) {
    await deps.finish(db, row.id, kind, false, String(err instanceof Error ? err.message : err))
      .catch((finishErr) => console.error(`build ${row.id} could not be closed as failed: ${String(finishErr)}`));
    throw err;
  }
  await deps.finish(db, row.id, kind, true, report(result));
  return result;
}

/** Postgres `undefined_table`, whether raised directly or wrapped by the query builder. */
function isMissingTable(err: unknown): boolean {
  const code = (e: unknown) => (e && typeof e === "object" && "code" in e ? (e as { code: unknown }).code : undefined);
  return code(err) === "42P01" || code((err as { cause?: unknown } | null)?.cause) === "42P01";
}
