/**
 * Pods: a named group of friends (plan `boards/plan-social-foundation-2026-10-12.md`, Hugh's rulings Q4,
 * Q5). The owner adds members from their OWN friends, by `publicId`, resolved on the owner's links; a pod
 * is not a second invite system. Every write takes the viewer's id from the caller's session and checks
 * ownership or membership inside the statement or transaction that writes. A pod grants no visibility
 * of its own: what a member may see is decided by the reads that join it (spares, in PR 2).
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { friendLinks, podMembers, podSpareShares, pods, socialProfiles } from "../../db/schema";
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
    // Hold the friendship row itself while adding (pod, then friendship: the order `unfriend` and the
    // account purge take them), so a friendship being ended waits for this add, or this add waits for it
    // and finds the row gone.
    const held = await tx.execute(sql`
      select 1 from ${friendLinks} where user_id = ${viewerId} and friend_user_id = ${friendId} for share`);
    if (held.rows.length === 0) return false;
    await tx.insert(podMembers).values({ podId, userId: friendId }).onConflictDoNothing();
    return true;
  });
}

/** The most friends one batch may name: a pod is a table, not a mailing list. */
export const ADD_MEMBERS_MAX = 32;

export type AddMembersResult =
  | { ok: true; added: number }
  | { ok: false; reason: "invalid" | "notOwner" | "notFriend" };

/**
 * The owner adds several friends at once (E11): ONE transaction, all or none. It takes `addMember`'s locks
 * in `addMember`'s order, the pod row FOR UPDATE and then every friendship row FOR SHARE (in friend id
 * order, so two batches lock them the same way round), and refuses the whole batch when any `publicId` is
 * not the owner's friend at that moment. A friend already in the pod counts as added, as `addMember`
 * answers for one; `added` is the number of rows actually written.
 */
export async function addMembers(viewerId: string, podId: unknown, friendPublicIds: unknown): Promise<AddMembersResult> {
  if (!isId(podId) || !Array.isArray(friendPublicIds)) return { ok: false, reason: "invalid" };
  const ids = [...new Set(friendPublicIds)];
  if (ids.length === 0 || ids.length > ADD_MEMBERS_MAX || !ids.every(isId)) return { ok: false, reason: "invalid" };
  return db.transaction(async (tx) => {
    const [pod] = await tx
      .select({ id: pods.id })
      .from(pods)
      .where(and(eq(pods.id, podId), eq(pods.ownerUserId, viewerId)))
      .for("update");
    if (!pod) return { ok: false as const, reason: "notOwner" as const };
    // Resolved on the owner's own links and held in the same statement: a friendship being ended waits for
    // this batch, or this batch waits for it and finds the row gone.
    const held = await tx
      .select({ friendUserId: friendLinks.friendUserId })
      .from(friendLinks)
      .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
      .where(and(eq(friendLinks.userId, viewerId), inArray(socialProfiles.publicId, ids)))
      .orderBy(asc(friendLinks.friendUserId))
      .for("share", { of: friendLinks });
    if (held.length !== ids.length) return { ok: false as const, reason: "notFriend" as const };
    const written = await tx
      .insert(podMembers)
      .values(held.map((h) => ({ podId, userId: h.friendUserId })))
      .onConflictDoNothing()
      .returning({ userId: podMembers.userId });
    return { ok: true as const, added: written.length };
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
export async function leavePod(viewerId: string, podId: unknown): Promise<LeaveOutcome> {
  if (!isId(podId)) return "notMember";
  return db.transaction((tx) => leavePodIn(tx, viewerId, podId));
}

export type LeaveOutcome = "left" | "handedOn" | "deleted" | "notMember";

/** `leavePod` inside a caller's transaction: the account purge leaves every pod inside its one transaction. */
export async function leavePodIn(tx: Tx, viewerId: string, podId: string): Promise<LeaveOutcome> {
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
}
