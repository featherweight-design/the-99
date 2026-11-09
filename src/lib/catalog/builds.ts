import { and, desc, eq, isNull } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import type * as schema from "../../db/schema";
import { catalogBuilds } from "../../db/schema";
import { fingerprintKey, readCatalogFingerprint } from "./fingerprint";
import { INDEX_FINAL_PHASE, phaseOf, phaseReport } from "./phase";

export { handCloseReport, INDEX_FINAL_PHASE, INDEX_SWEEP_PHASE, phaseOf, phaseReport } from "./phase";

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

type LedgerRow = Pick<BuildRow, "ok" | "finishedAt" | "report">;

/** How many of the newest `index` rows `staplesBase` is handed (`recentBuilds`). */
export const STAPLES_LOOKBACK = 50;

/**
 * The row `db:build:staples` derives from and inherits its catalog and label fingerprints from, or why it
 * may not run. Pure, over the `index` rows NEWEST FIRST (`recentBuilds`, at most `STAPLES_LOOKBACK`).
 *
 * The newest FINISHED-OK row, looking back past FAILED STAPLES rows only, so a staples step that failed
 * after a good index step can be retried instead of wedging the ledger until a full rebuild. A staples
 * row is known by the phase `recordBuild` stamps when it STARTS (and keeps through a hand close), never
 * by text a closer typed (`handCloseReport`). So:
 * - a FAILED staples row, closed by `recordBuild` or by hand, is looked past;
 * - an UNFINISHED row refuses, whatever its phase. A killed staples step is named as one, with how to
 *   close it, but is not looked past while open: an open row may be a run still writing, and two
 *   staples runs at once would interleave their writes. Closed (`db:catalog-build finish index
 *   failed`), it keeps its staples stamp and the retry looks past it;
 * - a FAILED row of any other phase, or of none, refuses: a failed or killed `index` step must not
 *   have the older ok row's fingerprints vouch for the lists it half-replaced.
 * A ledger holding only failed staples rows has no baseline and refuses; one whose window is all
 * failed staples rows says so rather than reading as empty. An ok staples row is a base like any ok
 * row, so a staples-only ledger with an ok row re-derives over it. The copy never looks back: it reads
 * the newest row alone (`buildRefusal`), so it refuses while that row is failed.
 */
export function staplesBase<R extends LedgerRow>(rows: readonly R[], window = STAPLES_LOOKBACK): { base: R } | { refusal: string } {
  for (const b of rows) {
    const phase = phaseOf(b.report);
    if (b.finishedAt === null || b.ok === null) {
      return {
        refusal: phase === INDEX_FINAL_PHASE
          ? "a staples step has not finished (killed, or still running); once it has stopped, close it with "
            + "`db:catalog-build finish index failed` and retry"
          : `an index build step (${phase ?? "unmarked"}) has not finished (killed, or still running); close it, then rebuild the index`,
      };
    }
    if (b.ok) return { base: b };
    if (phase === INDEX_FINAL_PHASE) continue;
    return { refusal: `an index build step failed (${phase ?? "unmarked"}) with no ok step after it` };
  }
  if (rows.length === 0) return { refusal: "the ledger records no index build" };
  return {
    refusal: rows.length >= window
      ? `every one of the newest ${rows.length} index rows is a failed staples step; no ok step was found within the window`
      : "no baseline: the ledger holds only failed staples steps; run db:build:index first",
  };
}

/**
 * The index build's LABEL fingerprint (`roleSetFingerprint`), carried in its report the way the phase
 * is, so the copy can refuse a target whose labels would give different role sets than the ones the
 * `label_*` targets were derived from. The staples step inherits it from the index step, as it
 * inherits the catalog fingerprint. Null when the build wrote no label targets: there is then nothing
 * label-derived for a copy to vouch for.
 */
export const labelsDetail = (fingerprint: string | null): string => `labels=${fingerprint ?? "none"}`;
export const labelsOf = (report: string | null): string | null =>
  report?.match(/(?:^|; )labels=([0-9a-f]{32})(?:;|$)/)?.[1] ?? null;

/**
 * `inherit` carries an earlier step's catalog fingerprint instead of reading today's: the last
 * step of a build made of steps must vouch for the catalog the FIRST step derived from, or a catalog
 * refresh landing mid-build would be recorded as the build's catalog and pass every copy check.
 */
export async function startBuild(db: Db, kind: BuildKind, inherit?: string, phase?: string): Promise<BuildRow> {
  const catalogFingerprint = inherit ?? fingerprintKey(await readCatalogFingerprint(db));
  const [row] = await db.insert(catalogBuilds)
    // The PHASE at the start, so a step killed before it finishes is still known by it.
    .values({ kind, catalogFingerprint, report: phase ? phaseReport(phase, "started") : null })
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

/** The newest `limit` rows of `kind`, newest first: the history `staplesBase` walks. */
export async function recentBuilds(db: Reader, kind: BuildKind, limit = STAPLES_LOOKBACK): Promise<BuildRow[]> {
  return db.select().from(catalogBuilds)
    .where(eq(catalogBuilds.kind, kind))
    .orderBy(desc(catalogBuilds.startedAt))
    .limit(limit);
}

export async function latestBuild(db: Reader, kind: BuildKind): Promise<BuildRow | null> {
  return (await recentBuilds(db, kind, 1))[0] ?? null;
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
  inherit?: string,
  /** The step's PHASE, stamped when the row starts (so a killed step is still known by it) and on a
   *  FAILED row's report (`phase=<it>; failed: <error>`); a success's report is `report`'s. */
  phase?: string,
): Promise<T> {
  let row: BuildRow;
  try {
    row = phase === undefined ? await deps.start(db, kind, inherit) : await deps.start(db, kind, inherit, phase);
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
    const why = String(err instanceof Error ? err.message : err);
    await deps.finish(db, row.id, kind, false, phase ? phaseReport(phase, `failed: ${why}`) : why)
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
