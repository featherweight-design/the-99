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
import { friendInvites, friendLinks, podMembers, podSpareShares, pods, socialProfiles } from "../../db/schema";
import { leavePodIn } from "./pods";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The social tables this purge clears, each with the account columns it clears them by, for the coverage test. */
export const SOCIAL_PURGED: Readonly<Record<string, readonly string[]>> = {
  friend_invites: ["inviter_user_id", "redeemed_by"],
  pods: ["owner_user_id"],
  pod_members: ["user_id"],
  pod_spare_shares: ["user_id"],
  friend_links: ["user_id", "friend_user_id"],
  social_profiles: ["user_id"],
};

export type SocialPurge = { podsLeft: number; podsHandedOn: number; podsDeleted: number; friendLinks: number };

/** What the social half did, and the friends whose data stamps the purge moves (sorted). */
export type SocialPurged = { counts: SocialPurge; friendIds: string[] };

export async function purgeSocialIn(tx: Tx, userId: string): Promise<SocialPurged> {
  const out: SocialPurge = { podsLeft: 0, podsHandedOn: 0, podsDeleted: 0, friendLinks: 0 };
  // Locks in the hierarchy every social write takes them. The account's invites first, in token order:
  // `redeemInvite` locks its invite before it writes a friendship, so a redemption racing this either lands
  // first (and its new links are read and deleted below) or waits and finds the invite gone. Then (as
  // `unfriend`, `addMember` and `leavePod` take them) pods, in id order; then the friendship rows, in (user_id, friend_user_id) order, which is `friendshipRows`'
  // order. An unfriend takes the same three in the same order, so the two cannot each hold what the other
  // waits for.
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
  // The friends whose stamps this purge will move (through the friend_links triggers). Their stamp rows
  // are NOT locked here: the caller locks them last, after every row delete, which is where any other
  // writer takes a stamp (at its commit, after its rows).
  const friendIds = [...new Set(links.rows.map((r) => (r.user_id === userId ? r.friend_user_id : r.user_id)))].sort();
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
  return { counts: out, friendIds };
}
