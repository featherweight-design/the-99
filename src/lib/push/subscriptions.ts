/**
 * The device rows (`push_subscriptions`, plan `2026-10-22-push.md`, PR 2). One row per browser that turned push on,
 * keyed by its endpoint: a re-subscribe of the same browser replaces its row, and a browser that signs in as another
 * account takes the row over (the endpoint names the browser, not the account). A reader keeps at most `MAX_DEVICES`;
 * the oldest go first. A 404 or 410 from the push service, and a sign-out on the device, delete the row.
 */
import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { pushSubscriptions } from "../../db/schema";
import type { DeviceInput } from "./endpoint";

export const MAX_DEVICES = 10;

type Q = Pick<typeof db, "transaction">;

/**
 * Stores or refreshes a device and trims the reader to `MAX_DEVICES`, as ONE transaction under a per-reader lock. The
 * lock is what serializes two saves: without it a trim's snapshot can select a row a racing refresh is about to restamp,
 * wait for that update, and then delete the row it just renewed. Returns nothing: a save has no failure the caller can act on.
 */
export async function saveDevice(userId: string, device: DeviceInput, q: Q = db): Promise<void> {
  await q.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`push_devices:${userId}`}, 0))`);
    await tx
      .insert(pushSubscriptions)
      .values({ userId, ...device })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        // `created_at` is when the device last subscribed: a refresh or a takeover is the newest, so the trim never deletes the row just saved.
        set: { userId, p256dh: device.p256dh, auth: device.auth, userAgent: device.userAgent, timeZone: device.timeZone, createdAt: sql`now()` },
      });
    await trimDevices(userId, tx);
  });
}

/** The oldest devices beyond `MAX_DEVICES` leave. Aliased and qualified: the subquery shares column names with the outer table. */
export async function trimDevices(userId: string, q: Pick<typeof db, "execute"> = db): Promise<void> {
  await q.execute(sql`
    delete from push_subscriptions ps
    where ps.user_id = ${userId} and ps.id in (
      select inner_ps.id from push_subscriptions inner_ps
      where inner_ps.user_id = ${userId}
      order by inner_ps.created_at desc, inner_ps.id desc
      offset ${MAX_DEVICES}
    )`);
}

/** One of the reader's own devices leaves. Their rows only: another account's endpoint is never matched. */
export async function removeDevice(userId: string, endpoint: string, q: Pick<typeof db, "delete"> = db): Promise<boolean> {
  const rows = await q
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
    .returning({ id: pushSubscriptions.id });
  return rows.length > 0;
}
