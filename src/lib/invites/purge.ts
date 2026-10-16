/**
 * The invite half of the account purge (plan `2026-10-16-invites.md`, R10). `invite_balances` and
 * `invite_reservations` are keyed `user_id` and go with `PURGE_ORDER`; this step handles the TREE, which is kept:
 * the deleted account's side of each edge is set null, so the other account's record (who invited them, or whom they
 * invited) survives and /admin draws a deleted account there. Runs inside the purge's one transaction.
 */
import { sql } from "drizzle-orm";
import type { db } from "../../db";

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
