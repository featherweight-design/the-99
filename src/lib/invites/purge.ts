/**
 * The invite half of the account purge (plan `2026-10-16-invites.md`, R10). `invite_balances` and
 * `invite_reservations` are keyed `user_id` and go with `PURGE_ORDER`; this step handles the TREE, which is kept:
 * the deleted account's side of each edge is set null, so the other account's record (who invited them, or whom they
 * invited) survives and /admin draws a deleted account there. Runs inside the purge's one transaction.
 */
import { sql } from "drizzle-orm";
import type { db } from "../../db";
import { clerkInvites } from "./clerk";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Account columns the purge UNLINKS rather than deletes, for the coverage test (`purge.test.ts`). */
export const INVITES_UNLINKED: Readonly<Record<string, readonly string[]>> = {
  invite_edges: ["inviter_user_id", "invitee_user_id"],
};

/** Sets the account's side of every edge null; the number of edges it touched. */
export async function unlinkInvitesIn(tx: Tx, userId: string): Promise<number> {
  const inviter = await tx.execute(sql`update invite_edges set inviter_user_id = null where inviter_user_id = ${userId}`);
  const invitee = await tx.execute(sql`update invite_edges set invitee_user_id = null where invitee_user_id = ${userId}`);
  return (inviter.rowCount ?? 0) + (invitee.rowCount ?? 0);
}

/** What the account's reservations leave pending at Clerk: invitations by id, and by address and reservation. */
export type PendingInvitations = { ids: string[]; unstored: { email: string; reservationId: string }[] };

/**
 * The Clerk invitations this account's reservations hold, read INSIDE the purge's transaction before the rows go
 * (R10): a pending invitation is a ticket that would otherwise outlive the sender. Ids only for the stored ones, and,
 * for an email send whose answer was lost (no id stored), the address and reservation id its invitation is found by:
 * once the rows are deleted nothing else could find it. Never logged.
 */
export async function invitationIdsIn(tx: Tx, userId: string): Promise<PendingInvitations> {
  const rows = await tx.execute(sql`
    select id, email, clerk_invitation_id from invite_reservations
    where user_id = ${userId} and (clerk_invitation_id is not null or (email is not null and state in ('reserved', 'claimed')))`);
  const out: PendingInvitations = { ids: [], unstored: [] };
  for (const r of rows.rows as { id: string; email: string | null; clerk_invitation_id: string | null }[]) {
    if (r.clerk_invitation_id !== null) out.ids.push(r.clerk_invitation_id);
    // Also for a row WITH a stored id: a replacement made after it was revoked may not be the stored one.
    if (r.email !== null) out.unstored.push({ email: r.email, reservationId: r.id });
  }
  return out;
}

/**
 * Revokes them AFTER the purge commits, one at a time and best effort: a revoke that fails is left to Clerk's own
 * 7-day expiry, which is the same lapse, so it never fails the purge. Counts only.
 */
export async function revokeAfterPurge(
  pending: PendingInvitations,
  deps: {
    revoke?: (id: string) => Promise<boolean>;
    revokeFor?: (email: string, reservationId: string) => Promise<boolean>;
  } = {},
): Promise<{ found: number; revoked: number }> {
  const revoke = deps.revoke ?? ((id: string) => clerkInvites.revoke(id));
  const revokeFor = deps.revokeFor ?? ((e: string, r: string) => clerkInvites.revokeFor(e, r));
  let revoked = 0;
  for (const id of pending.ids) {
    try {
      if (await revoke(id)) revoked += 1;
    } catch {
      // Left to expire.
    }
  }
  for (const u of pending.unstored) {
    try {
      if (await revokeFor(u.email, u.reservationId)) revoked += 1;
    } catch {
      // Left to expire.
    }
  }
  return { found: pending.ids.length + pending.unstored.length, revoked };
}
