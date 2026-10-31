/**
 * The launch list's purge (flyer trial PR 4c): the addresses left on used-up and ended flyers are emailed once at launch
 * (the launch epic's, not this file) and then deleted. They go 30 days after the launch date.
 *
 * The launch date is the admin's value in `flyer_settings` (set on /admin/invites, `launch-date.ts`) FIRST, and only when
 * none is saved the `FLYER_LAUNCH_DATE` env value (the fallback from before the admin control): `YYYY-MM-DD` read as UTC
 * midnight, or a full ISO instant. An unset or unreadable value MEANS NO PURGE: the list is kept, never deleted on a
 * guess. A saved value that is unreadable does NOT fall through to the env value; it is a purge off. SERVER-ONLY (the
 * purge reads the database).
 */
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { readStoredLaunchDate } from "./launch-date";

/** Days after launch the list is kept (the READINESS "emailed once at launch, then purged"). */
export const LAUNCH_LIST_RETENTION_DAYS = 30;
/** The most rows one run deletes, so a large list drains over a few hourly runs and no run is long. */
export const LAUNCH_PURGE_BATCH = 1000;

/** The launch date, or null when unset or not a date. Null is never "now". */
export function readLaunchDate(raw: string | undefined): Date | null {
  const v = raw?.trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}(T[0-9:.]+(Z|[+-]\d{2}:\d{2}))?$/.test(v)) return null;
  const t = new Date(v.length === 10 ? `${v}T00:00:00Z` : v);
  if (Number.isNaN(t.getTime())) return null;
  // `new Date` rolls an impossible day over (2026-02-30 becomes March 2): the irreversible purge must not run on a
  // day the operator never wrote, so the written Y-M-D has to survive a round trip through the calendar.
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  const c = new Date(Date.UTC(y, m - 1, d));
  if (c.getUTCFullYear() !== y || c.getUTCMonth() !== m - 1 || c.getUTCDate() !== d) return null;
  return t;
}

/** True only for a real launch date whose retention has run out. */
export function launchPurgeDue(launch: Date | null, now: Date): boolean {
  if (launch === null) return false;
  return now.getTime() >= launch.getTime() + LAUNCH_LIST_RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

export type LaunchPurgeReport = { due: boolean; deleted: number };

/** Deletes up to one batch of `launch_list` rows when the purge is due; touches nothing else. Idempotent. */
export async function purgeLaunchList(
  deps: { now?: Date; launchRaw?: string | undefined; readStored?: () => Promise<string | null> } = {},
): Promise<LaunchPurgeReport> {
  // `launchRaw` (a test's) wins outright; otherwise the table value first, then the env fallback.
  const raw = "launchRaw" in deps ? deps.launchRaw : ((await (deps.readStored ?? readStoredLaunchDate)()) ?? process.env.FLYER_LAUNCH_DATE);
  const launch = readLaunchDate(raw);
  if (!launchPurgeDue(launch, deps.now ?? new Date())) return { due: false, deleted: 0 };
  const { rows } = await db.execute<{ n: number }>(sql`with gone as (
    delete from launch_list where email in (select email from launch_list limit ${LAUNCH_PURGE_BATCH}) returning 1
  ) select count(*)::int as n from gone`);
  return { due: true, deleted: rows[0]?.n ?? 0 };
}
