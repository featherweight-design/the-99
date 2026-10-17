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

/**
 * The Clerk invitations this account's reservations hold, read INSIDE the purge's transaction before the rows go
 * (R10): a pending invitation is a ticket that would otherwise outlive the sender. Ids only, never an address.
 */
export async function invitationIdsIn(tx: Tx, userId: string): Promise<string[]> {
  const rows = await tx.execute(sql`select clerk_invitation_id from invite_reservations where user_id = ${userId} and clerk_invitation_id is not null`);
  return rows.rows.map((r) => String((r as { clerk_invitation_id: unknown }).clerk_invitation_id));
}

/**
 * Revokes them AFTER the purge commits, one at a time and best effort: a revoke that fails is left to Clerk's own
 * 7-day expiry, which is the same lapse, so it never fails the purge. Counts only.
 */
export async function revokeAfterPurge(
  ids: readonly string[],
  revoke: (id: string) => Promise<boolean> = (id) => clerkInvites.revoke(id),
): Promise<{ found: number; revoked: number }> {
  let revoked = 0;
  for (const id of ids) {
    try {
      if (await revoke(id)) revoked += 1;
    } catch {
      // Left to expire.
    }
  }
  return { found: ids.length, revoked };
}
