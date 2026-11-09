/**
 * Whether the commander index is due a build today (plan `2026-09-28-card-data-replicate.md`, §4).
 *
 * Two rules, and one successful build satisfies both for everything before it:
 *
 * - **Monthly:** from the 3rd, when no `ok` index build has started this month. The 3rd rather
 *   than the 1st so a set released in the last week of the month has been through a catalog
 *   refresh first.
 * - **Release:** a set whose type is in `RELEASE_SET_TYPES` comes due `RELEASE_DELAY_DAYS` after
 *   it releases, when no `ok` build has started on or after that date. Those are the set types new
 *   commanders arrive in; the delay gives EDHREC time to hold decks for them. A set released on
 *   the 2nd comes due on the 16th, where the monthly rule alone would wait for the 3rd of the next
 *   month.
 *
 * **No baseline, no build.** A ledger holding no `ok` index build answers NOT due, with the reason
 * `no baseline`: every old release would otherwise read due, and a backfill would start as an
 * accident of switching the chain on rather than as a decision. The first build is a dispatched
 * catch-up, which the workflow runs whatever this says.
 *
 * Pure over the catalog's own `sets` rows and the ledger's `ok` index builds, so the dates come
 * from the data and never from a hardcoded set.
 */

import { INDEX_SWEEP_PHASE, phaseOf } from "./phase";

/**
 * Before this, an unmarked ok `index` row is a LEGACY build: `recordBuild` has stamped the index's
 * phase since the ledger's index steps landed (#1111, 2026-09-28), so an unmarked row after it is
 * not a sweep `db:build:index` recorded but a row `db:catalog-build start|finish` bracketed by hand,
 * and it does not reset the clock.
 */
export const LEGACY_UNMARKED_BEFORE = new Date("2026-09-30T00:00:00Z");

/**
 * The ok `index` ledger rows that count as a BUILD for this rule: the `db:build:index` step itself
 * (phase `index`, `INDEX_SWEEP_PHASE`), or an unmarked row from before steps were stamped
 * (`LEGACY_UNMARKED_BEFORE`). A row closed by hand keeps the phase its start stamped, so a hand-closed
 * staples step never counts, and an unmarked row after the cutoff never does either. The steps after it do not
 * reset the clock, because they fetch nothing from EDHREC: `db:build:staples` (phase `staples`)
 * derives from the stored lists, and counting it, or a staples step run alone, would postpone the
 * monthly or release refresh it never made. Pure, and returns when each counted build STARTED, which is what `indexDue` reads.
 */
export function sweepStarts(rows: readonly { startedAt: Date; report: string | null }[]): Date[] {
  return rows.filter((r) => {
    const phase = phaseOf(r.report);
    return phase === INDEX_SWEEP_PHASE || (phase === null && r.startedAt.getTime() < LEGACY_UNMARKED_BEFORE.getTime());
  }).map((r) => r.startedAt);
}

/** The set types a release index waits on. `draft_innovation` (reprint boxes) is left out. */
export const RELEASE_SET_TYPES: readonly string[] = ["expansion", "commander"];
export const RELEASE_DELAY_DAYS = 14;
export const MONTHLY_FROM_DAY = 3;

export type ReleasedSet = { code: string; setType: string; releasedAt: string | null; digital: boolean };

export type IndexDue = { due: boolean; reasons: string[] };

/** A `YYYY-MM-DD` date plus `days`, as a UTC midnight. */
function dayAfter(date: string, days: number): Date {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * @param now the moment the gate runs
 * @param sets the catalog's sets
 * @param okBuilds when each `ok` index build STARTED (`sweepStarts`: the EDHREC sweep step only)
 */
export function indexDue(now: Date, sets: readonly ReleasedSet[], okBuilds: readonly Date[]): IndexDue {
  if (okBuilds.length === 0) {
    return { due: false, reasons: ["no baseline: no ok index build on record; the first build is a dispatched catch-up"] };
  }
  const reasons: string[] = [];
  const since = (from: Date) => okBuilds.some((b) => b.getTime() >= from.getTime());

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (now.getUTCDate() >= MONTHLY_FROM_DAY && !since(monthStart)) {
    reasons.push(`monthly: no ok index build since ${iso(monthStart)}`);
  }

  for (const set of sets) {
    if (set.digital || !set.releasedAt || !RELEASE_SET_TYPES.includes(set.setType)) continue;
    const dueOn = dayAfter(set.releasedAt, RELEASE_DELAY_DAYS);
    if (dueOn.getTime() <= now.getTime() && !since(dueOn)) {
      reasons.push(`release: ${set.code} (released ${set.releasedAt}) due ${iso(dueOn)}`);
    }
  }

  return { due: reasons.length > 0, reasons };
}
