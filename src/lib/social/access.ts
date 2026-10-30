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
import { and, asc, eq, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { friendLinks, podMembers, pods, socialProfiles } from "../../db/schema";
import { commanderCard, commanderColumns, facePrinting, faceJoin, toCommander, type ProfileCommander } from "./commander";
import { isUuid, nextPodOwner } from "./rules";
import { named } from "../person-name/mint";
import type { ThirdPartyName } from "../person-name/brand";

export type Reader = Pick<typeof db, "select" | "selectDistinct">;

/** `displayName` is branded: another reader's name never leaves this layer as a string (PersonName plan, PR B). */
export type Friend = { publicId: string; displayName: ThirdPartyName; since: Date; commander: ProfileCommander | null };

/**
 * The viewer's friends, by the viewer's own link rows. A friend with no profile row is not drawn (an
 * inner join), so a missed purge degrades to a friend who vanished rather than a broken row.
 */
export function friendsQuery(viewerId: string, q: Reader = db) {
  return friendRows(q)
    .where(eq(friendLinks.userId, viewerId))
    .orderBy(asc(socialProfiles.displayName), asc(socialProfiles.publicId));
}

/**
 * One friend by public id (Social R2's friend page, handoff G2): the list's own read, narrowed. The
 * viewer's link row is in the same statement, so a public id that is not the viewer's current friend
 * reads as nothing, whoever's profile it names.
 */
export function friendQuery(viewerId: string, publicId: string, q: Reader = db) {
  return friendRows(q)
    .where(and(eq(friendLinks.userId, viewerId), eq(socialProfiles.publicId, publicId)))
    .limit(1);
}

/** The columns and joins a friend is drawn from, for the list and for one friend. */
function friendRows(q: Reader) {
  return q
    .select({
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
      since: friendLinks.createdAt,
      ...commanderColumns,
    })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .leftJoin(facePrinting, faceJoin)
    .$dynamic();
}

type FriendRow = Awaited<ReturnType<typeof friendsQuery>>[number];
const toFriend = (r: FriendRow): Friend =>
  ({ publicId: r.publicId, displayName: named(r.displayName), since: r.since, commander: toCommander(r) });

export async function listFriends(viewerId: string, q: Reader = db): Promise<Friend[]> {
  // Sorted on the rows, while the name is still a string: a branded name is never compared.
  return sortFriends(await friendsQuery(viewerId, q)).map(toFriend);
}

/** The viewer's friend with this public id, or null: not a friend, no profile, or not an id at all. */
export async function loadFriend(viewerId: string, publicId: unknown, q: Reader = db): Promise<Friend | null> {
  if (!isUuid(publicId)) return null;
  const [row] = await friendQuery(viewerId, publicId, q);
  return row ? toFriend(row) : null;
}

/**
 * By name as a reader reads it (C4): the database's `order by` compares bytes under its C collation, which puts
 * every capital before every lower-case letter (`Bob` before `alex`) and an accent after `z`. Sorted here as the
 * pods pane sorts its pods, case- and accent-insensitive, the public id breaking a tie.
 */
export function sortFriends<T extends { displayName: string; publicId: string }>(friends: readonly T[]): T[] {
  return [...friends].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "en-US", { sensitivity: "base" })
    || (a.publicId < b.publicId ? -1 : a.publicId > b.publicId ? 1 : 0));
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

export type PodMember = {
  publicId: string;
  displayName: ThirdPartyName;
  joinedAt: Date;
  isOwner: boolean;
  isYou: boolean;
  /** The viewer's current friend. False for the viewer, and for a member a hand-on left (D3). */
  isFriend: boolean;
  /** Only for the viewer and the viewer's friends; a member who is neither stays name-only (D2). */
  commander: ProfileCommander | null;
};
export type Pod = {
  id: string;
  /** Branded for everyone, the creator included. */
  name: ThirdPartyName;
  isOwner: boolean;
  /** Owner first, then the viewer, then by name (G9). */
  members: PodMember[];
  /**
   * Who holds the pod if the viewer, its owner, leaves (Q5): computed here because `nextPodOwner` breaks a
   * tie by account id, which no client holds (E4). Null when the viewer is not the owner, or is alone.
   */
  nextOwner: { publicId: string; displayName: ThirdPartyName } | null;
};

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
const viewerFriend = alias(friendLinks, "viewer_friend");

/**
 * Every member of every pod the viewer belongs to, the viewer's own membership joined in the same
 * statement, so no pod id from anywhere else can widen it. The viewer's friendship with each member is
 * joined there too, and a member's commander is joined only through it (or for the viewer): a member
 * who is not the viewer's friend reads with no face (D2), whatever their profile holds.
 */
export function podMembersQuery(viewerId: string, q: Reader = db) {
  return q
    .select({
      podId: podMembers.podId,
      userId: podMembers.userId,
      joinedAt: podMembers.joinedAt,
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
      isFriend: sql<boolean>`${viewerFriend.userId} is not null`,
      ...commanderColumns,
    })
    .from(podMembers)
    .innerJoin(viewerMembership, and(eq(viewerMembership.podId, podMembers.podId), eq(viewerMembership.userId, viewerId)))
    .innerJoin(socialProfiles, eq(socialProfiles.userId, podMembers.userId))
    .leftJoin(viewerFriend, and(eq(viewerFriend.userId, viewerId), eq(viewerFriend.friendUserId, podMembers.userId)))
    .leftJoin(commanderCard, and(
      eq(commanderCard.oracleId, socialProfiles.commanderOracleId),
      or(eq(podMembers.userId, viewerId), isNotNull(viewerFriend.userId)),
    ))
    // The printing is shown only where the card is, so the grant above decides both.
    .leftJoin(facePrinting, and(faceJoin, isNotNull(commanderCard.oracleId)))
    .orderBy(asc(podMembers.joinedAt), asc(podMembers.userId));
}

type MemberRow = Awaited<ReturnType<typeof podMembersQuery>>[number];

/** Owner, then the viewer, then by name (G9), then public id so two of one name never swap. */
export function orderMembers<T extends { isOwner: boolean; isYou: boolean; displayName: string; publicId: string }>(
  members: readonly T[],
): T[] {
  const rank = (m: T) => (m.isOwner ? 0 : m.isYou ? 1 : 2);
  return [...members].sort((a, b) =>
    rank(a) - rank(b)
    || (a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0)
    || (a.publicId < b.publicId ? -1 : a.publicId > b.publicId ? 1 : 0));
}

/** The pod as the viewer sees it, from its rows. Pure, so the order, D2 and the next owner are tested
 *  without a database. */
export function shapePod(
  pod: { id: string; name: string; ownerUserId: string },
  rows: readonly MemberRow[],
  viewerId: string,
): Pod {
  const isOwner = pod.ownerUserId === viewerId;
  const next = isOwner ? nextPodOwner(rows, viewerId) : null;
  const heir = next === null ? undefined : rows.find((r) => r.userId === next);
  return {
    id: pod.id,
    name: named(pod.name),
    isOwner,
    members: orderMembers(rows.map((m) => ({
      publicId: m.publicId,
      displayName: m.displayName,
      joinedAt: m.joinedAt,
      isOwner: m.userId === pod.ownerUserId,
      isYou: m.userId === viewerId,
      isFriend: m.userId !== viewerId && m.isFriend,
      commander: toCommander(m),
    // Ordered on the strings above, then branded.
    }))).map((m) => ({ ...m, displayName: named(m.displayName) })),
    nextOwner: heir ? { publicId: heir.publicId, displayName: named(heir.displayName) } : null,
  };
}

export async function listPods(viewerId: string, q: Reader = db): Promise<Pod[]> {
  const mine = await viewerPodsQuery(viewerId, q);
  if (mine.length === 0) return [];
  const members = await podMembersQuery(viewerId, q);
  return mine.map((p) => shapePod(p, members.filter((m) => m.podId === p.id), viewerId));
}
