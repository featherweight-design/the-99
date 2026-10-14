/**
 * The account sweep (orchestrator's ruling as Hugh's proxy, 2026-10-14). The Clerk webhook purges an account
 * the moment it is deleted and leaves a tombstone (`account_tombstones`); a request that was already past its
 * auth when that purge committed can still write a row for the account afterwards. Clerk revokes the account's
 * sessions on delete and a session token lives about a minute, so such writes stop within minutes. A Vercel cron
 * (`/api/cron/account-sweep`, every five minutes) therefore runs the idempotent purge again for every tombstone
 * still holding its raw id, which erases them.
 *
 * The raw id is held for a day and no longer: a tombstone past `deleted_at` + 24h gets its last purge on the
 * next sweep and then its `clerk_id` set null, leaving only the hash and the time. Without a raw id there is
 * nothing to purge by, so a tombstone is swept at most for its first day.
 */
import { and, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { accountTombstones } from "../../db/schema";
import { purgeAccount } from "./purge";

/** How long a tombstone keeps the raw id, and so how long the sweep re-purges it. */
export const SWEEP_WINDOW_MS = 24 * 60 * 60 * 1000;

export type SweepReport = { swept: number; failed: number; retired: number };

export type Holding = { clerkId: string; deletedAt: Date };

/** Which held ids a sweep at `now` retires once purged: those past the day. Pure, so it is tested alone. */
export function retiring(held: readonly Holding[], now: Date): string[] {
  const cutoff = now.getTime() - SWEEP_WINDOW_MS;
  return held.filter((h) => h.deletedAt.getTime() <= cutoff).map((h) => h.clerkId);
}

export async function sweepTombstones(now: Date = new Date(), purge: (id: string) => Promise<unknown> = purgeAccount): Promise<SweepReport> {
  const held: Holding[] = (await db
    .select({ clerkId: accountTombstones.clerkId, deletedAt: accountTombstones.deletedAt })
    .from(accountTombstones)
    .where(isNotNull(accountTombstones.clerkId))
    // EVERY tombstone holding a raw id, with no batch: a capped batch picks the same oldest rows on every sweep
    // for their whole day, and a newer one past the cap would not be re-purged until those retired. A day's
    // deletions number a handful for this app, and each re-purge of an emptied account is a few cheap deletes.
    .orderBy(accountTombstones.deletedAt)).map((r) => ({ clerkId: r.clerkId!, deletedAt: r.deletedAt }));
  let failed = 0;
  const purged = new Set<string>();
  // One at a time: each purge is a transaction holding the account's locks, and a sweep has no hurry.
  for (const h of held) {
    try {
      await purge(h.clerkId);
      purged.add(h.clerkId);
    } catch {
      failed += 1;
    }
  }
  // Only an id whose last purge went through gives up its raw id; a failed one is tried again next sweep.
  const retire = retiring(held, now).filter((id) => purged.has(id));
  let retired = 0;
  if (retire.length > 0) {
    const cutoff = new Date(now.getTime() - SWEEP_WINDOW_MS);
    const done = await db.update(accountTombstones).set({ clerkId: null })
      .where(and(sql`${accountTombstones.clerkId} = any(${sql.param(retire)}::text[])`, lte(accountTombstones.deletedAt, cutoff)));
    retired = done.rowCount ?? 0;
  }
  return { swept: purged.size, failed, retired };
}
