/**
 * The social half of the account purge (Hugh's ruling Q8, 2026-10-12: deleting an account deletes
 * everything). Runs inside the purge's one transaction, so a failure anywhere leaves the account whole.
 * It lives here because every social table is read and written only from `src/lib/social/`
 * (`check:social-reads`); `src/lib/account/purge.ts` calls it and handles every other table.
 *
 * Pods are LEFT the way a player leaves them (Q5): a pod the account owns passes to its longest-standing
 * remaining member, and a pod with no one else in it is deleted. Pods are taken in id order, so two purges
 * (or a purge and a leave) lock them the same way round.
 */
import { asc, eq, or, sql } from "drizzle-orm";
import type { db } from "../../db";
import { friendInvites, friendLinks, podMembers, podSpareShares, pods, socialProfiles, userDataStamps } from "../../db/schema";
import { leavePodIn } from "./pods";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The social tables this purge clears, by SQL name, for the purge's coverage test. */
export const SOCIAL_PURGED = [
  "pod_members", "pods", "pod_spare_shares", "friend_links", "friend_invites", "social_profiles",
] as const;

export type SocialPurge = { podsLeft: number; podsHandedOn: number; podsDeleted: number; friendLinks: number };

export async function purgeSocialIn(tx: Tx, userId: string): Promise<SocialPurge> {
  const out: SocialPurge = { podsLeft: 0, podsHandedOn: 0, podsDeleted: 0, friendLinks: 0 };
  // Locks in the hierarchy every social write takes them. The account's invites first, in token order:
  // `redeemInvite` locks its invite before it writes a friendship, so a redemption racing this either lands
  // first (and its new links are read and deleted below) or waits and finds the invite gone. Then (as
  // `unfriend`, `addMember` and `leavePod` take them) pods, in id order; then the friendship rows, in (user_id, friend_user_id) order, which is `friendshipRows`'
  // order; then the data stamps, in user id order. Left to the deletes and triggers below, they would be
  // taken in whatever order rows were visited, and an unfriend holding a shared pod could wait on a stamp
  // this purge held while it waited on that pod.
  await tx.execute(sql`
    select i.token from ${friendInvites} i
    where i.inviter_user_id = ${userId} or i.redeemed_by = ${userId}
    order by i.token for update`);
  await tx.execute(sql`
    select p.id from ${pods} p
    where p.owner_user_id = ${userId} or p.id in (select m.pod_id from ${podMembers} m where m.user_id = ${userId})
    order by p.id for update`);
  const links = await tx.execute<{ user_id: string; friend_user_id: string }>(sql`
    select l.user_id, l.friend_user_id from ${friendLinks} l
    where l.user_id = ${userId} or l.friend_user_id = ${userId}
    order by l.user_id, l.friend_user_id for update`);
  // Every stamp this purge will move (the account's and each friend's, through the friend_links triggers).
  // A missing row is created at 0, which reads the same as no row (`userDataStamp`). With no friend there is
  // no second reader to order against, and creating the account's row only to delete it would make a
  // retried purge write something.
  const friendIds = links.rows.map((r) => (r.user_id === userId ? r.friend_user_id : r.user_id));
  const stamped = [...new Set([userId, ...friendIds])].sort();
  if (friendIds.length > 0) await tx.execute(sql`
    insert into ${userDataStamps} (user_id, stamp)
    select u, 0 from unnest(${sql.param(stamped)}::text[]) as u order by u
    on conflict (user_id) do nothing`);
  await tx.execute(sql`
    select 1 from ${userDataStamps} where user_id = any(${sql.param(stamped)}::text[]) order by user_id for update`);
  const memberOf = await tx
    .select({ podId: podMembers.podId })
    .from(podMembers)
    .where(eq(podMembers.userId, userId))
    .orderBy(asc(podMembers.podId));
  for (const { podId } of memberOf) {
    const outcome = await leavePodIn(tx, userId, podId);
    if (outcome === "left") out.podsLeft++;
    else if (outcome === "handedOn") out.podsHandedOn++;
    else if (outcome === "deleted") out.podsDeleted++;
  }
  // A pod still owned with the owner not a member (no write path makes one) goes too, with its rows.
  await tx.delete(pods).where(eq(pods.ownerUserId, userId));
  await tx.delete(podSpareShares).where(eq(podSpareShares.userId, userId));
  const gone = await tx
    .delete(friendLinks)
    .where(or(eq(friendLinks.userId, userId), eq(friendLinks.friendUserId, userId)))
    .returning({ userId: friendLinks.userId });
  out.friendLinks = gone.length;
  // Both sides of an invite name the account: the ones it sent, and the spent ones it accepted.
  await tx.delete(friendInvites).where(or(eq(friendInvites.inviterUserId, userId), eq(friendInvites.redeemedBy, userId)));
  await tx.delete(socialProfiles).where(eq(socialProfiles.userId, userId));
  return out;
}
