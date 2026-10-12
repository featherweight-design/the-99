/**
 * Pods: a named group of friends (plan `boards/plan-social-foundation-2026-10-12.md`, Hugh's rulings Q4,
 * Q5). The owner adds members from their OWN friends, by `publicId`, resolved on the owner's links; a pod
 * is not a second invite system. Every write takes the viewer's id from the caller's session and checks
 * ownership or membership inside the statement or transaction that writes. A pod grants no visibility
 * of its own: what a member may see is decided by the reads that join it (spares, in PR 2).
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { podMembers, podSpareShares, pods, socialProfiles } from "../../db/schema";
import { resolveFriend } from "./access";
import { cleanPodName, isUuid, nextPodOwner } from "./rules";

const isId = isUuid;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A member out of a pod shares nothing with it any more (the read joins membership too). */
async function dropShare(tx: Tx, userId: string, podId: string): Promise<void> {
  await tx.delete(podSpareShares).where(and(eq(podSpareShares.userId, userId), eq(podSpareShares.podId, podId)));
}

export async function createPod(viewerId: string, rawName: unknown): Promise<{ id: string } | null> {
  const name = cleanPodName(rawName);
  if (name === null) return null;
  return db.transaction(async (tx) => {
    const [pod] = await tx.insert(pods).values({ ownerUserId: viewerId, name }).returning({ id: pods.id });
    await tx.insert(podMembers).values({ podId: pod.id, userId: viewerId });
    return pod;
  });
}

/** Owner only, enforced in the statement. */
export async function renamePod(viewerId: string, podId: unknown, rawName: unknown): Promise<boolean> {
  const name = cleanPodName(rawName);
  if (name === null || !isId(podId)) return false;
  const written = await db
    .update(pods)
    .set({ name })
    .where(and(eq(pods.id, podId), eq(pods.ownerUserId, viewerId)))
    .returning({ id: pods.id });
  return written.length > 0;
}

/** Owner only. Members go with it (`pod_members` cascades). */
export async function deletePod(viewerId: string, podId: unknown): Promise<boolean> {
  if (!isId(podId)) return false;
  const written = await db
    .delete(pods)
    .where(and(eq(pods.id, podId), eq(pods.ownerUserId, viewerId)))
    .returning({ id: pods.id });
  return written.length > 0;
}

/**
 * The owner adds one of their friends. The friend is resolved on the owner's own links in the same
 * transaction that writes, with the pod row locked against an ownership change, so a stranger's or a
 * removed friend's `publicId` adds nobody.
 */
export async function addMember(viewerId: string, podId: unknown, friendPublicId: unknown): Promise<boolean> {
  if (!isId(podId)) return false;
  return db.transaction(async (tx) => {
    const [pod] = await tx
      .select({ id: pods.id })
      .from(pods)
      .where(and(eq(pods.id, podId), eq(pods.ownerUserId, viewerId)))
      .for("update");
    if (!pod) return false;
    const friendId = await resolveFriend(viewerId, friendPublicId, tx);
    if (friendId === null) return false;
    await tx.insert(podMembers).values({ podId, userId: friendId }).onConflictDoNothing();
    return true;
  });
}

/**
 * The owner removes a member, by `publicId`. Not themselves: an owner leaves through `leavePod`. The pod
 * row is locked and its owner checked in the same transaction as the delete, the lock `leavePod` takes,
 * so a removal cannot authorize on a stale owner while the pod is being handed on.
 */
export async function removeMember(viewerId: string, podId: unknown, memberPublicId: unknown): Promise<boolean> {
  if (!isId(podId) || !isId(memberPublicId)) return false;
  return db.transaction(async (tx) => {
    const [pod] = await tx
      .select({ id: pods.id })
      .from(pods)
      .where(and(eq(pods.id, podId), eq(pods.ownerUserId, viewerId)))
      .for("update");
    if (!pod) return false;
    const written = await tx
      .delete(podMembers)
      .where(and(
        eq(podMembers.podId, podId),
        sql`${podMembers.userId} in (select user_id from ${socialProfiles} where public_id = ${memberPublicId})`,
        sql`${podMembers.userId} <> ${viewerId}`,
      ))
      .returning({ userId: podMembers.userId });
    for (const { userId } of written) await dropShare(tx, userId, podId);
    return written.length > 0;
  });
}

/**
 * Leave a pod. A member just goes. An owner hands the pod to the longest-standing remaining member
 * (Q5, `nextPodOwner`), and the last member out deletes it. The new owner need not be every member's
 * friend: "friends-only" governs who an owner may ADD, and a pod grants no visibility of its own, since
 * every read that uses one also joins the friendship. The pod row is locked first, so two leaves
 * at once cannot both hand it on.
 */
export async function leavePod(viewerId: string, podId: unknown): Promise<"left" | "handedOn" | "deleted" | "notMember"> {
  if (!isId(podId)) return "notMember";
  return db.transaction(async (tx) => {
    const [pod] = await tx.select({ ownerUserId: pods.ownerUserId }).from(pods).where(eq(pods.id, podId)).for("update");
    if (!pod) return "notMember";
    const members = await tx
      .select({ userId: podMembers.userId, joinedAt: podMembers.joinedAt })
      .from(podMembers)
      .where(eq(podMembers.podId, podId));
    if (!members.some((m) => m.userId === viewerId)) return "notMember";
    if (pod.ownerUserId !== viewerId) {
      await tx.delete(podMembers).where(and(eq(podMembers.podId, podId), eq(podMembers.userId, viewerId)));
      await dropShare(tx, viewerId, podId);
      return "left";
    }
    const next = nextPodOwner(members, viewerId);
    if (next === null) {
      await tx.delete(pods).where(eq(pods.id, podId));
      return "deleted";
    }
    await tx.update(pods).set({ ownerUserId: next }).where(eq(pods.id, podId));
    await tx.delete(podMembers).where(and(eq(podMembers.podId, podId), eq(podMembers.userId, viewerId)));
    await dropShare(tx, viewerId, podId);
    return "handedOn";
  });
}
