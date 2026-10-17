/**
 * The admin's invite writes (plan `2026-10-16-invites.md`, §Admin writes; screens in PR 6). SERVER-ONLY. The caller
 * has already decided the actor is an admin. Each write takes the sender's lock and keeps the invariant: a Set of
 * N stores N plus what is holding, so a waiting invite stays waiting and `held` never drops below the rows holding.
 * Each records one `admin_events` line, the admin's own audit trail.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { adminEvents, flagGroupMembers, flagGroups, inviteBalances, inviteReservations } from "../../db/schema";
import { clerkInvites, type ClerkInvites } from "./clerk";
import { readCountIn, type Tx } from "./read";
import { heldForSet, heldForTopUp, parseInvitesLeft } from "./rules";
import { lockSenderIn } from "./send";

async function storeHeldIn(tx: Tx, userId: string, held: number, now: Date): Promise<void> {
  await tx.insert(inviteBalances).values({ userId, held, updatedAt: now })
    .onConflictDoUpdate({ target: inviteBalances.userId, set: { held, updatedAt: now } });
}

export type SetInvitesResult = { ok: true; left: number } | { ok: false; reason: "invalid" };

/** Sets what an account has LEFT (M2) to a whole number from 0 to `INVITES_MAX`. */
export async function setInvites(
  actorId: string,
  userId: string,
  rawLeft: unknown,
  now: Date = new Date(),
): Promise<SetInvitesResult> {
  const left = parseInvitesLeft(rawLeft);
  if (left === null) return { ok: false, reason: "invalid" };
  await db.transaction(async (tx) => {
    await lockSenderIn(tx, userId);
    const { holding, count } = await readCountIn(tx, userId, now);
    await storeHeldIn(tx, userId, heldForSet(left, holding), now);
    await tx.insert(adminEvents).values({
      actorId, kind: "invites_set", userId, oldValue: String(count.left), newValue: String(left), at: now,
    });
  });
  return { ok: true, left };
}

export type TopUpResult = { ok: true; raised: number } | { ok: false; reason: "invalid" | "notFound" };

/**
 * Tops a group up (M3): every member with fewer than `to` left is raised to exactly `to` left; nobody is lowered,
 * and no group count is stored. One transaction, members locked in user id order.
 */
export async function topUpGroupInvites(
  actorId: string,
  groupId: string,
  rawTo: unknown,
  now: Date = new Date(),
): Promise<TopUpResult> {
  const to = parseInvitesLeft(rawTo);
  if (to === null) return { ok: false, reason: "invalid" };
  return db.transaction(async (tx) => {
    const [group] = await tx.select({ id: flagGroups.id }).from(flagGroups).where(eq(flagGroups.id, groupId));
    if (!group) return { ok: false as const, reason: "notFound" as const };
    const members = await tx.select({ userId: flagGroupMembers.userId }).from(flagGroupMembers)
      .where(eq(flagGroupMembers.groupId, groupId)).orderBy(asc(flagGroupMembers.userId));
    let raised = 0;
    for (const { userId } of members) {
      await lockSenderIn(tx, userId);
      const { holding, count } = await readCountIn(tx, userId, now);
      const held = heldForTopUp(count, holding, to);
      if (held === null) continue;
      await storeHeldIn(tx, userId, held, now);
      raised++;
    }
    await tx.insert(adminEvents).values({
      actorId, kind: "invites_topped_up", groupId, newValue: String(to), note: String(raised), at: now,
    });
    return { ok: true as const, raised };
  });
}

export type RevokeResult = { ok: true; changed: boolean };

/**
 * Revokes a WAITING reservation (R12): it stops holding, so its invite is back at once, its address is erased, and
 * Clerk's invitation is revoked after the commit. A reservation already resolved, or a live QR (which lapses by
 * itself in minutes), is left alone and reads as done.
 */
export async function revokeReservation(
  actorId: string,
  reservationId: string,
  deps: { clerk?: ClerkInvites; now?: Date } = {},
): Promise<RevokeResult> {
  const now = deps.now ?? new Date();
  const clerk = deps.clerk ?? clerkInvites;
  const [found] = await db.select({ userId: inviteReservations.userId }).from(inviteReservations)
    .where(eq(inviteReservations.id, reservationId));
  if (!found) return { ok: true, changed: false };

  const invitationId = await db.transaction(async (tx) => {
    await lockSenderIn(tx, found.userId);
    const [row] = await tx.update(inviteReservations)
      .set({ state: "revoked", email: null, resolvedAt: now })
      .where(and(eq(inviteReservations.id, reservationId), inArray(inviteReservations.state, ["claimed", "reserved"])))
      .returning({ clerkInvitationId: inviteReservations.clerkInvitationId });
    if (!row) return undefined;
    await tx.insert(adminEvents).values({ actorId, kind: "invite_revoked", userId: found.userId, at: now });
    return row.clerkInvitationId;
  });
  if (invitationId === undefined) return { ok: true, changed: false };
  if (invitationId && !(await clerk.revoke(invitationId))) {
    // Left to Clerk's own 7-day expiry, the same lapse; the spend refuses a revoked reservation in any case.
    console.warn("[invites] revoke: Clerk invitation not revoked");
  }
  return { ok: true, changed: true };
}
