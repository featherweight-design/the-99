/**
 * The flyer spend (handoff `design/design_handoff_the99_flyer_trial/`; the twin of `src/lib/invites/spend.ts`).
 * SERVER-ONLY. When the Clerk invitation a flyer hand-over made is accepted, the invitation's metadata names the CLAIM
 * (not an `invite_reservations` row), so the sign-up webhook and the newcomer's first `/friends` fall through to here
 * when the personal-invite spend answers `unknown`. Both are idempotent, so the order never matters.
 *
 * One transaction spends the claim, takes the place on the code, lowers Hugh's stock by the invite the claim held,
 * puts the newcomer in the code's flag group, writes their profile and gives them three invites of their own. It forms
 * NO friendship with Hugh and records NO `invite_edges` row: an edge is a tree edge to the sender, and a flyer
 * sign-up has no sender to befriend (the admin tree draws these from `flyer_claims`). A claim that lapsed, was
 * released or belongs to a revoked code spends nothing: the newcomer keeps an account with no group and no friend,
 * which is what a lapsed invitation means.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { accountTombstones, flagGroupMembers, flyerClaims, flyerCodes, inviteBalances } from "../../db/schema";
import { tombstoneHash } from "../account/purge";
import { lockSenderIn } from "../invites/send";
import { createProfileIn } from "../social/friends";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The invites a flyer newcomer starts with. */
export const FLYER_STARTER_INVITES = 3;

export type FlyerSpendResult =
  | { spent: true }
  /** Already done for this account, by an earlier run: nothing written. */
  | { spent: false; reason: "already" }
  /** No such claim. */
  | { spent: false; reason: "unknown" | "lapsed" }
  /** The account was deleted: a delayed `user.created` must not bring its rows back. */
  | { spent: false; reason: "deleted" };

export async function spendFlyerOnSignUp(
  newUserId: string,
  claimId: string,
  offeredName: unknown,
  deps: { now?: Date } = {},
): Promise<FlyerSpendResult> {
  if (!UUID.test(claimId) || newUserId.length === 0) return { spent: false, reason: "unknown" };
  const [found] = await db.select({ hugh: flyerCodes.createdBy }).from(flyerClaims)
    .innerJoin(flyerCodes, eq(flyerCodes.id, flyerClaims.codeId))
    .where(eq(flyerClaims.id, claimId));
  if (!found) return { spent: false, reason: "unknown" };

  // The spent claim is the record of a spend and is visible without the lock: an account's invitation stays on its
  // Clerk user for good, so every later `/friends` lands here and must not queue on Hugh's lock to learn it is done.
  const [done] = await db.select({ id: flyerClaims.id }).from(flyerClaims)
    .where(and(eq(flyerClaims.userId, newUserId), eq(flyerClaims.state, "spent")));
  if (done) return { spent: false, reason: "already" };

  return db.transaction(async (tx): Promise<FlyerSpendResult> => {
    // Hugh's invite lock and the newcomer's, taken in the DATABASE's user-id order, exactly as the personal spend takes
    // its sender's and newcomer's, so no two writers wait on each other. The time to judge the hold by is read once both
    // are held.
    const order = await tx.execute(sql`select id from unnest(${sql.param([found.hugh, newUserId])}::text[]) as t(id) order by id`);
    let now = deps.now ?? new Date();
    for (const r of order.rows as { id: string }[]) now = await lockSenderIn(tx, r.id, deps.now);
    const [gone] = await tx.select({ id: accountTombstones.idHash }).from(accountTombstones)
      .where(eq(accountTombstones.idHash, tombstoneHash(newUserId)));
    if (gone) return { spent: false, reason: "deleted" };
    const [row] = await tx.select().from(flyerClaims).where(eq(flyerClaims.id, claimId)).for("update");
    if (!row) return { spent: false, reason: "unknown" };
    if (row.state === "spent") return { spent: false, reason: row.userId === newUserId ? "already" : "lapsed" };
    // Only a claim still holding its place spends. A revoked code spends nothing even for a claim already handed over:
    // revoking is Hugh's word that the code is over, and the revoke takes this same lock, so the two cannot interleave.
    const [code] = await tx.select().from(flyerCodes).where(eq(flyerCodes.id, row.codeId));
    const holding = (row.state === "open" || row.state === "proven") && row.holdsUntil.getTime() > now.getTime();
    if (!code || code.revokedAt !== null || !holding) return { spent: false, reason: "lapsed" };

    // The creator's stock first, and nothing else written until it moved: the claim was holding one of Hugh's invites (it
    // counts in his stock) and now it is gone. A purged creator has no balance row (and a tombstone), so the decrement
    // touches nothing and the claim spends nothing, rather than granting membership and invites against no stock.
    const [creatorGone] = await tx.select({ id: accountTombstones.idHash }).from(accountTombstones)
      .where(eq(accountTombstones.idHash, tombstoneHash(code.createdBy)));
    if (creatorGone) return { spent: false, reason: "lapsed" };
    const lowered = await tx.update(inviteBalances).set({ held: sql`${inviteBalances.held} - 1`, updatedAt: now })
      .where(and(eq(inviteBalances.userId, code.createdBy), sql`${inviteBalances.held} > 0`))
      .returning({ userId: inviteBalances.userId });
    if (lowered.length === 0) return { spent: false, reason: "lapsed" };
    // `clerk_invitation_id` stays (an id, no address) so the record of which invitation made the account survives.
    await tx.update(flyerClaims).set({
      state: "spent", userId: newUserId, email: null, codeHmac: null, codeExpiresAt: null, resolvedAt: now,
    }).where(eq(flyerClaims.id, row.id));
    if (code.groupId !== null) {
      await tx.insert(flagGroupMembers).values({ userId: newUserId, groupId: code.groupId, addedBy: code.createdBy })
        .onConflictDoNothing();
    }
    await createProfileIn(tx, newUserId, offeredName);
    // Never lowers a stock the account already has.
    await tx.insert(inviteBalances).values({ userId: newUserId, held: FLYER_STARTER_INVITES, updatedAt: now })
      .onConflictDoNothing();
    return { spent: true };
  });
}
