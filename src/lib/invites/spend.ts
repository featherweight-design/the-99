/**
 * The spend (plan `2026-10-16-invites.md`, §The spend, R8). SERVER-ONLY. When a Clerk invitation is accepted, one
 * transaction spends the reservation it names, records the tree edge and forms the friendship, and it runs from two
 * places, both idempotent so the order never matters: the `user.created` webhook, and the newcomer's first
 * `/friends`. An unknown or missing id spends nothing and forms nothing. A reservation that has lapsed, been
 * returned or revoked forms nothing either: the newcomer has an account and no friend, which is what a lapsed
 * invitation means.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { inviteBalances, inviteEdges, inviteReservations } from "../../db/schema";
import { welcomeInvitedIn } from "../social/friends";
import { lockSenderIn } from "./send";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SpendResult =
  | { spent: true }
  /** Already done for this account, by an earlier run: nothing written. */
  | { spent: false; reason: "already" }
  /** No such reservation, or it is not an invitation a newcomer can be spent on. */
  | { spent: false; reason: "unknown" | "lapsed" };

export function reservationIdFrom(metadata: unknown): string | null {
  const id = typeof metadata === "object" && metadata !== null ? (metadata as { inviteReservation?: unknown }).inviteReservation : undefined;
  return typeof id === "string" && UUID.test(id) ? id : null;
}

export async function spendInviteOnSignUp(
  newUserId: string,
  reservationId: string,
  offeredName: unknown,
  deps: { now?: Date } = {},
): Promise<SpendResult> {
  if (!UUID.test(reservationId) || newUserId.length === 0) return { spent: false, reason: "unknown" };
  const [found] = await db.select({ senderId: inviteReservations.userId }).from(inviteReservations)
    .where(eq(inviteReservations.id, reservationId));
  if (!found) return { spent: false, reason: "unknown" };

  return db.transaction(async (tx): Promise<SpendResult> => {
    const now = await lockSenderIn(tx, found.senderId, deps.now);
    const [row] = await tx.select().from(inviteReservations).where(eq(inviteReservations.id, reservationId)).for("update");
    if (!row) return { spent: false, reason: "unknown" };
    // An account an invite already created is not spent on twice: the one edge per invitee is the record.
    const [edge] = await tx.select({ inviter: inviteEdges.inviterUserId }).from(inviteEdges)
      .where(eq(inviteEdges.inviteeUserId, newUserId));
    if (edge) return { spent: false, reason: "already" };
    const waiting = row.state === "reserved" || row.state === "claimed";
    if (!waiting || row.holdsUntil === null || row.holdsUntil.getTime() <= now.getTime()) return { spent: false, reason: "lapsed" };

    await tx.update(inviteReservations).set({ state: "spent", email: null, resolvedAt: now, codeHmac: null, codeExpiresAt: null })
      .where(eq(inviteReservations.id, row.id));
    // The stock holds what is left plus what is holding: this one was holding, and now it is gone.
    await tx.update(inviteBalances).set({ held: sql`${inviteBalances.held} - 1`, updatedAt: now })
      .where(and(eq(inviteBalances.userId, row.userId), sql`${inviteBalances.held} > 0`));
    await tx.insert(inviteEdges).values({
      inviterUserId: row.userId, inviteeUserId: newUserId, kind: row.kind === "qr" ? "qr" : "email", joinedAt: now,
    }).onConflictDoNothing();
    await welcomeInvitedIn(tx, row.userId, newUserId, offeredName);
    return { spent: true };
  });
}

/**
 * The newcomer's first `/friends`, in either order with the webhook: when their edge has not yet shown its receipt it
 * is marked shown and the inviter's account id answered, once; every later call answers null. The band is drawn from
 * the edge, never from the URL, since the after-sign-up redirect carries no sender (ruling D).
 */
export async function takeReceipt(inviteeId: string, now: Date = new Date()): Promise<string | null> {
  const rows = await db.update(inviteEdges).set({ receiptShownAt: now })
    .where(and(eq(inviteEdges.inviteeUserId, inviteeId), isNull(inviteEdges.receiptShownAt)))
    .returning({ inviter: inviteEdges.inviterUserId });
  return rows[0]?.inviter ?? null;
}
