/**
 * A sender's own invite count (plan `2026-10-16-invites.md`): their stock and the rows that may still hold, read in
 * one repeatable-read snapshot (so a spend or an admin Set committing between the two reads cannot mix two moments)
 * and counted by `inviteCount`. Never a read-only one: on the pooled connection it breaks the next transaction
 * (`draft-state-snapshot.test.ts`). No caller beyond its tests and the probe until the sender's PRs.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { inviteBalances, inviteReservations } from "../../db/schema";
import { inviteCount, type HoldingRow, type InviteCount } from "./rules";

/** The states that can hold an invite; `inviteCount` decides from their clocks whether each still does. */
export const OPEN_STATES = ["qr_open", "claimed", "reserved"] as const;

export async function loadInviteCount(viewerId: string, now: Date = new Date()): Promise<InviteCount> {
  const [balance, rows] = await db.transaction(async (tx) => [
    await tx.select({ held: inviteBalances.held }).from(inviteBalances).where(eq(inviteBalances.userId, viewerId)),
    await tx
      .select({
        kind: inviteReservations.kind,
        state: inviteReservations.state,
        qrExpiresAt: inviteReservations.qrExpiresAt,
        holdsUntil: inviteReservations.holdsUntil,
      })
      .from(inviteReservations)
      .where(and(eq(inviteReservations.userId, viewerId), inArray(inviteReservations.state, [...OPEN_STATES]))),
  ] as const, { isolationLevel: "repeatable read" });
  return inviteCount(balance[0]?.held ?? 0, rows as HoldingRow[], now);
}
