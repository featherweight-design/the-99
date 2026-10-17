/**
 * The invite sweep (plan `2026-10-16-invites.md`, §The sweep), run hourly by `GET /api/cron/invite-sweep`. Counts never
 * wait on it: a row's expiry is derived from time (`holdsInvite`), so the sweep only writes it down. SERVER-ONLY.
 *
 * It does three things, each safe to repeat:
 * 1. RETURNS every open row whose time has passed (`returned`, its address erased) after ending its Clerk
 *    invitation. A row whose invitation could not be ended is left as it is and tried again next hour, while its id
 *    is kept, so a ticket never outlives its hold unrevoked.
 * 2. Ends the invitation of a row already resolved whose revoke failed earlier (the id was kept for this).
 * 3. RECONCILES a holding email reservation that has no `clerk_invitation_id` (an indeterminate send): it finds the
 *    pending invitation whose public metadata names the reservation and records its id, so the spend and the return
 *    both find it.
 */
import { and, eq, gt, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { inviteReservations } from "../../db/schema";
import { clerkInvites, type ClerkInvites } from "./clerk";

/** The most rows one run touches in each step, so a backlog never makes a run that does not finish. */
export const SWEEP_BATCH = 50;
/** A send this young may still be answering: it is not reconciled yet. */
export const RECONCILE_AFTER_MS = 2 * 60 * 1000;

export type SweepReport = { returned: number; revoked: number; reconciled: number; kept: number };

type Row = typeof inviteReservations.$inferSelect;

/** Ends a row's Clerk invitation, by its stored id or, with none stored, by what the address and reservation name. */
async function endInvitation(clerk: ClerkInvites, row: Pick<Row, "id" | "email" | "clerkInvitationId">): Promise<boolean> {
  if (row.clerkInvitationId !== null) return clerk.revoke(row.clerkInvitationId);
  if (row.email !== null) return clerk.revokeFor(row.email, row.id);
  return true;
}

export async function sweepInvites(now: Date = new Date(), clerk: ClerkInvites = clerkInvites): Promise<SweepReport> {
  const report: SweepReport = { returned: 0, revoked: 0, reconciled: 0, kept: 0 };

  // 1. Open rows whose time has passed.
  const lapsed = await db.select().from(inviteReservations).where(or(
    and(eq(inviteReservations.state, "qr_open"), lte(inviteReservations.qrExpiresAt, now)),
    and(inArray(inviteReservations.state, ["claimed", "reserved"]), lte(inviteReservations.holdsUntil, now)),
  )).limit(SWEEP_BATCH);
  for (const row of lapsed) {
    if (!(await endInvitation(clerk, row))) {
      report.kept += 1;
      continue;
    }
    // Only the state it was read in: a row spent or revoked meanwhile is not turned back into a return.
    const done = await db.update(inviteReservations).set({ state: "returned", email: null, clerkInvitationId: null, codeHmac: null, codeExpiresAt: null, resolvedAt: now })
      .where(and(eq(inviteReservations.id, row.id), eq(inviteReservations.state, row.state)))
      .returning({ id: inviteReservations.id });
    report.returned += done.length;
  }

  // 2. Resolved rows still carrying an invitation id: a revoke that failed when they ended.
  const leftover = await db.select().from(inviteReservations).where(and(
    inArray(inviteReservations.state, ["returned", "revoked"]),
    isNotNull(inviteReservations.clerkInvitationId),
  )).limit(SWEEP_BATCH);
  for (const row of leftover) {
    if (await clerk.revoke(row.clerkInvitationId!)) {
      const done = await db.update(inviteReservations).set({ clerkInvitationId: null })
        .where(and(eq(inviteReservations.id, row.id), eq(inviteReservations.clerkInvitationId, row.clerkInvitationId!)))
        .returning({ id: inviteReservations.id });
      report.revoked += done.length;
    } else {
      report.kept += 1;
    }
  }

  // 3. Holding email reservations whose send was indeterminate.
  const unknown = await db.select().from(inviteReservations).where(and(
    eq(inviteReservations.kind, "email"),
    eq(inviteReservations.state, "reserved"),
    isNull(inviteReservations.clerkInvitationId),
    isNotNull(inviteReservations.email),
    gt(inviteReservations.holdsUntil, now),
    lte(inviteReservations.createdAt, new Date(now.getTime() - RECONCILE_AFTER_MS)),
    // A refused send stays reserved with no id until its hold ends, and looks the same as an indeterminate one: a fixed
    // order would let a backlog of them take every run's batch. A random draw gives each its turn.
  )).orderBy(sql`random()`).limit(SWEEP_BATCH);
  for (const row of unknown) {
    const found = await clerk.findFor(row.email!, row.id);
    if (!found.ok || found.id === null) continue;
    const done = await db.update(inviteReservations).set({ clerkInvitationId: found.id })
      .where(and(eq(inviteReservations.id, row.id), eq(inviteReservations.state, "reserved"), isNull(inviteReservations.clerkInvitationId)))
      .returning({ id: inviteReservations.id });
    report.reconciled += done.length;
  }
  return report;
}
