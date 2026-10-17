/**
 * A sender's own invite count (plan `2026-10-16-invites.md`): their stock and the rows that may still hold, read in
 * one repeatable-read snapshot (so a spend or an admin Set committing between the two reads cannot mix two moments)
 * and counted by `inviteCount`. Never a read-only one: on the pooled connection it breaks the next transaction
 * (`draft-state-snapshot.test.ts`). Every write reads the same way, inside its own transaction under the sender's
 * lock (`readCountIn`), so the gate and the count line share one definition.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { inviteBalances, inviteReservations } from "../../db/schema";
import { holdingCount, inviteCount, type HoldingRow, type InviteCount } from "./rules";

/** The states that can hold an invite; `inviteCount` decides from their clocks whether each still does. */
export const OPEN_STATES = ["qr_open", "claimed", "reserved"] as const;

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The stock, the rows holding and the count, read through `tx`. */
export async function readCountIn(
  tx: Tx,
  viewerId: string,
  now: Date,
): Promise<{ held: number; holding: number; count: InviteCount }> {
  const balance = await tx.select({ held: inviteBalances.held }).from(inviteBalances)
    .where(eq(inviteBalances.userId, viewerId));
  const rows = (await tx
    .select({
      kind: inviteReservations.kind,
      state: inviteReservations.state,
      qrExpiresAt: inviteReservations.qrExpiresAt,
      holdsUntil: inviteReservations.holdsUntil,
    })
    .from(inviteReservations)
    .where(and(eq(inviteReservations.userId, viewerId), inArray(inviteReservations.state, [...OPEN_STATES])))) as HoldingRow[];
  const held = balance[0]?.held ?? 0;
  return { held, holding: holdingCount(rows, now), count: inviteCount(held, rows, now) };
}

export async function loadInviteCount(viewerId: string, now: Date = new Date()): Promise<InviteCount> {
  const { count } = await db.transaction((tx) => readCountIn(tx, viewerId, now), { isolationLevel: "repeatable read" });
  return count;
}
