/**
 * A sender's own invite count (plan `2026-10-16-invites.md`): their stock and the rows that may still hold, read in
 * one statement and counted by `inviteCount`. No caller beyond its tests and the probe until the sender's PRs.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { inviteBalances, inviteReservations } from "../../db/schema";
import { inviteCount, type HoldingRow, type InviteCount } from "./rules";

/** The states that can hold an invite; `inviteCount` decides from their clocks whether each still does. */
export const OPEN_STATES = ["qr_open", "claimed", "reserved"] as const;

export async function loadInviteCount(viewerId: string, now: Date = new Date()): Promise<InviteCount> {
  const [balance, rows] = await Promise.all([
    db.select({ held: inviteBalances.held }).from(inviteBalances).where(eq(inviteBalances.userId, viewerId)),
    db
      .select({
        kind: inviteReservations.kind,
        state: inviteReservations.state,
        qrExpiresAt: inviteReservations.qrExpiresAt,
        holdsUntil: inviteReservations.holdsUntil,
      })
      .from(inviteReservations)
      .where(and(eq(inviteReservations.userId, viewerId), inArray(inviteReservations.state, [...OPEN_STATES]))),
  ]);
  return inviteCount(balance[0]?.held ?? 0, rows as HoldingRow[], now);
}
