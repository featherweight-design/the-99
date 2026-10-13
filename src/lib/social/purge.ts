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
import { asc, eq, or } from "drizzle-orm";
import type { db } from "../../db";
import { friendInvites, friendLinks, podMembers, podSpareShares, pods, socialProfiles } from "../../db/schema";
import { leavePodIn } from "./pods";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The social tables this purge clears, by SQL name, for the purge's coverage test. */
export const SOCIAL_PURGED = [
  "pod_members", "pods", "pod_spare_shares", "friend_links", "friend_invites", "social_profiles",
] as const;

export type SocialPurge = { podsLeft: number; podsHandedOn: number; podsDeleted: number; friendLinks: number };

export async function purgeSocialIn(tx: Tx, userId: string): Promise<SocialPurge> {
  const out: SocialPurge = { podsLeft: 0, podsHandedOn: 0, podsDeleted: 0, friendLinks: 0 };
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
  const links = await tx
    .delete(friendLinks)
    .where(or(eq(friendLinks.userId, userId), eq(friendLinks.friendUserId, userId)))
    .returning({ userId: friendLinks.userId });
  out.friendLinks = links.length;
  // Both sides of an invite name the account: the ones it sent, and the spent ones it accepted.
  await tx.delete(friendInvites).where(or(eq(friendInvites.inviterUserId, userId), eq(friendInvites.redeemedBy, userId)));
  await tx.delete(socialProfiles).where(eq(socialProfiles.userId, userId));
  return out;
}
