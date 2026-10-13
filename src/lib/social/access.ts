/**
 * The ONE place a read crosses from one account to another (plan `boards/plan-social-foundation-2026-10-12.md`,
 * scope §5). Every read here takes the viewer's id, which the caller has from the session and never from
 * a client, and JOINS the grant on that viewer in the same statement. None checks first and then runs an
 * unscoped read: that is both a race and the step a later caller forgets.
 *
 * Nothing returned carries a Clerk id. A friend is a `publicId` and a display name; `resolveFriend` turns a
 * `publicId` back into an account id for the module's own writes, and only for a current friend.
 * `check:social-reads` keeps the social tables out of every module but this directory.
 */
import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { friendLinks, podMembers, pods, socialProfiles } from "../../db/schema";
import { isUuid } from "./rules";

export type Reader = Pick<typeof db, "select" | "selectDistinct">;

export type Friend = { publicId: string; displayName: string; since: Date };

/**
 * The viewer's friends, by the viewer's own link rows. A friend with no profile row is not drawn (an
 * inner join), so a missed purge degrades to a friend who vanished rather than a broken row.
 */
export function friendsQuery(viewerId: string, q: Reader = db) {
  return q
    .select({ publicId: socialProfiles.publicId, displayName: socialProfiles.displayName, since: friendLinks.createdAt })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .where(eq(friendLinks.userId, viewerId))
    .orderBy(asc(socialProfiles.displayName), asc(socialProfiles.publicId));
}

export async function listFriends(viewerId: string, q: Reader = db): Promise<Friend[]> {
  return friendsQuery(viewerId, q);
}

/** The account a `publicId` names, ONLY when it is the viewer's current friend. Anything else is null. */
export function resolveFriendQuery(viewerId: string, publicId: string, q: Reader = db) {
  return q
    .select({ userId: friendLinks.friendUserId })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .where(and(eq(friendLinks.userId, viewerId), eq(socialProfiles.publicId, publicId)))
    .limit(1);
}

export async function resolveFriend(viewerId: string, publicId: unknown, q: Reader = db): Promise<string | null> {
  if (!isUuid(publicId)) return null;
  const [row] = await resolveFriendQuery(viewerId, publicId, q);
  return row?.userId ?? null;
}

export type PodMember = { publicId: string; displayName: string; joinedAt: Date; isOwner: boolean; isYou: boolean };
export type Pod = { id: string; name: string; isOwner: boolean; members: PodMember[] };

/** The pods the viewer is a member of: membership on the viewer IS the grant to read the pod. */
export function viewerPodsQuery(viewerId: string, q: Reader = db) {
  return q
    .select({ id: pods.id, name: pods.name, ownerUserId: pods.ownerUserId, createdAt: pods.createdAt })
    .from(podMembers)
    .innerJoin(pods, eq(pods.id, podMembers.podId))
    .where(eq(podMembers.userId, viewerId))
    .orderBy(asc(pods.createdAt), asc(pods.id));
}

const viewerMembership = alias(podMembers, "viewer_membership");

/** Every member of every pod the viewer belongs to, the viewer's own membership joined in the same
 *  statement, so no pod id from anywhere else can widen it. */
export function podMembersQuery(viewerId: string, q: Reader = db) {
  return q
    .select({
      podId: podMembers.podId,
      userId: podMembers.userId,
      joinedAt: podMembers.joinedAt,
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
    })
    .from(podMembers)
    .innerJoin(viewerMembership, and(eq(viewerMembership.podId, podMembers.podId), eq(viewerMembership.userId, viewerId)))
    .innerJoin(socialProfiles, eq(socialProfiles.userId, podMembers.userId))
    .orderBy(asc(podMembers.joinedAt), asc(podMembers.userId));
}

export async function listPods(viewerId: string, q: Reader = db): Promise<Pod[]> {
  const mine = await viewerPodsQuery(viewerId, q);
  if (mine.length === 0) return [];
  const members = await podMembersQuery(viewerId, q);
  return mine.map((p) => ({
    id: p.id,
    name: p.name,
    isOwner: p.ownerUserId === viewerId,
    members: members
      .filter((m) => m.podId === p.id)
      .map((m) => ({
        publicId: m.publicId,
        displayName: m.displayName,
        joinedAt: m.joinedAt,
        isOwner: m.userId === p.ownerUserId,
        isYou: m.userId === viewerId,
      })),
  }));
}
