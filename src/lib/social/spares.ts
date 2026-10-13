/**
 * "A friend has a spare" (plan `boards/plan-social-foundation-2026-10-12.md`, PR 2; Hugh's rulings Q3, Q12,
 * and view-only spares). A friend's spare copies show to the viewer only when ALL of these hold, checked in
 * one statement on the viewer:
 *
 * - the two are friends (the viewer's own `friend_links` row);
 * - the friend shares spares with a pod (`pod_spare_shares`) the friend is still a member of;
 * - the viewer is a member of that same pod.
 *
 * A spare is a copy no deck of the friend's, committed or draft, is asking for: `owned − hard − soft`
 * from the friend's own claim model, never restated here (Q12: a copy only in a draft is NOT spare).
 * What comes back is the card, the friend's public id and display name, and the spare count. Never
 * `owned`, never a claim, never a deck name: a share is a fact about spares, not about decks.
 *
 * Nothing here moves a card or asks for one (no borrowing, no cart change). No surface calls it yet.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { friendLinks, podMembers, podSpareShares, pods, socialProfiles, userDataStamps } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import type { Reader } from "./access";
import { isUuid } from "./rules";

const viewerIn = alias(podMembers, "viewer_in");
const friendIn = alias(podMembers, "friend_in");

/**
 * The friends whose spares the viewer may see. Distinct by friend: sharing with two of the viewer's pods
 * is one grant. Apart so a test can render its SQL.
 */
export function spareGrantorsQuery(viewerId: string, q: Reader = db) {
  return q
    .selectDistinct({
      userId: friendLinks.friendUserId,
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
    })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .innerJoin(podSpareShares, eq(podSpareShares.userId, friendLinks.friendUserId))
    .innerJoin(friendIn, and(eq(friendIn.podId, podSpareShares.podId), eq(friendIn.userId, friendLinks.friendUserId)))
    .innerJoin(viewerIn, and(eq(viewerIn.podId, podSpareShares.podId), eq(viewerIn.userId, viewerId)))
    .where(eq(friendLinks.userId, viewerId))
    .orderBy(asc(friendLinks.friendUserId));
}

/** `max(0, owned − hard − soft)`: copies none of the owner's decks, committed or draft, is asking for. */
export function spareCount(a: { owned: number; hard: number; soft: number }): number {
  return Math.max(0, a.owned - a.hard - a.soft);
}

/** How many friends' claim models one read runs at once. */
export const CLAIM_MODELS_AT_ONCE = 4;

export type FriendSpare = { oracleId: string; friend: { publicId: string; displayName: string }; spare: number };

/**
 * Each granting friend's claim model narrowed to `asked`, in input order, at most CLAIM_MODELS_AT_ONCE at a
 * time. Each one runs in its own repeatable-read transaction (never a read-only one, which poisons the
 * pooled connection: `draft-state-snapshot.test.ts`) that FIRST re-reads the viewer's
 * grants inside it, so the authorization and the friend's rows are one snapshot: a friend whose grant is
 * absent at that instant reads as `null` and nothing of theirs is read.
 */
export async function claimModelsFor(viewerId: string, friends: readonly string[], asked: readonly string[]) {
  const models: (Awaited<ReturnType<typeof loadAvailability>> | null)[] = new Array(friends.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CLAIM_MODELS_AT_ONCE, friends.length) }, async () => {
    for (let i = next++; i < friends.length; i = next++) {
      const friend = friends[i];
      models[i] = await db.transaction(async (tx) => {
        const granting = await spareGrantorsQuery(viewerId, tx);
        if (!granting.some((g) => g.userId === friend)) return null;
        return loadAvailability(friend, { oracleIds: [...asked] }, tx);
      }, { isolationLevel: "repeatable read" });
    }
  }));
  return models;
}

/**
 * The spare copies the viewer's friends hold of the named cards (the viewer's demand: their decks' buy
 * rows, and their wishlist once it exists). One grant read, then the friend's own claim model per
 * granting friend, narrowed to the asked cards, each in one snapshot with its own grant check. Ordered by card, then by friend name.
 */
export async function loadFriendSpares(viewerId: string, oracleIds: readonly string[]): Promise<FriendSpare[]> {
  const asked = [...new Set(oracleIds.filter(isUuid))];
  if (asked.length === 0) return [];
  const grantors = await spareGrantorsQuery(viewerId);
  // One claim model per friend, at most CLAIM_MODELS_AT_ONCE side by side: measured at ~100ms each on a
  // staging copy (`measure:friend-spares`), so a handful of friends costs about one model, not their sum,
  // and a large pod queues behind the bound rather than taking the whole connection pool.
  const models = await claimModelsFor(viewerId, grantors.map((g) => g.userId), asked);
  const out: FriendSpare[] = [];
  grantors.forEach((g, i) => {
    const model = models[i];
    if (model === null) return;
    for (const [oracleId, a] of model) {
      const spare = spareCount(a);
      if (spare > 0) out.push({ oracleId, friend: { publicId: g.publicId, displayName: g.displayName }, spare });
    }
  });
  return out.sort((x, y) =>
    (x.oracleId < y.oracleId ? -1 : x.oracleId > y.oracleId ? 1 : 0)
    || (x.friend.displayName < y.friend.displayName ? -1 : x.friend.displayName > y.friend.displayName ? 1 : 0)
    || (x.friend.publicId < y.friend.publicId ? -1 : 1));
}

/**
 * Share spares with one of the viewer's pods, or stop. The viewer must be a member of the pod, checked
 * in the statement that writes; a pod id they do not belong to shares with nobody.
 */
export async function shareSparesWith(viewerId: string, podId: unknown, on: boolean): Promise<boolean> {
  if (!isUuid(podId)) return false;
  if (!on) {
    const gone = await db
      .delete(podSpareShares)
      .where(and(eq(podSpareShares.userId, viewerId), eq(podSpareShares.podId, podId)))
      .returning({ podId: podSpareShares.podId });
    return gone.length > 0;
  }
  // Locks in the order every removal takes them (leave, remove and unfriend lock the pod row FOR UPDATE,
  // then delete the membership): the pod first (FOR KEY SHARE, which waits on their FOR UPDATE), then the membership row while the grant is written. A
  // removal racing this either waits and then deletes the committed grant, or wins and leaves nothing to
  // insert from. The opposite order (membership, then the pod through the foreign key) can deadlock.
  return db.transaction(async (tx) => {
    const pod = await tx.execute(sql`select 1 from ${pods} where id = ${podId} for key share`);
    if (pod.rows.length === 0) return false;
    const written = await tx.execute<{ pod_id: string }>(sql`
      insert into ${podSpareShares} (user_id, pod_id)
      select ${viewerId}, m.pod_id from ${podMembers} m where m.pod_id = ${podId} and m.user_id = ${viewerId}
      for share of m
      on conflict do nothing
      returning pod_id
    `);
    if (written.rows.length > 0) return true;
    // Already shared reads as success; not a member reads as failure.
    const [member] = await tx
      .select({ podId: podMembers.podId })
      .from(podMembers)
      .where(and(eq(podMembers.podId, podId), eq(podMembers.userId, viewerId)));
    return member !== undefined;
  });
}

/** The pods the viewer shares spares with, among the pods they are still in. */
export function sharedPodsQuery(viewerId: string, q: Reader = db) {
  return q
    .select({ podId: podSpareShares.podId, name: pods.name })
    .from(podSpareShares)
    .innerJoin(pods, eq(pods.id, podSpareShares.podId))
    .innerJoin(podMembers, and(eq(podMembers.podId, podSpareShares.podId), eq(podMembers.userId, viewerId)))
    .where(eq(podSpareShares.userId, viewerId))
    .orderBy(asc(pods.name), asc(pods.id));
}

/**
 * A cache key part for any cached page that draws friends' spares (scope §5, option 3): each granting
 * friend's id, data stamp and display name, hashed. A friend's collection or deck write moves their stamp,
 * so this reader's key moves too; a rename moves the name (`social_profiles` carries no stamp trigger); a
 * friendship, membership or grant changing moves the set. One indexed read,
 * fresh per request like the reader's own stamp. `check:list-cache` fails a cached page that reaches this
 * module without putting it in its key.
 */
export async function friendGeneration(viewerId: string): Promise<string> {
  const grantors = spareGrantorsQuery(viewerId).as("grantors");
  const [row] = await db
    .select({
      // A structured aggregate, so a name holding `:` or `,` cannot forge a field or row boundary.
      g: sql<string>`coalesce(md5(json_agg(json_build_array(
        ${grantors.userId}, coalesce(${userDataStamps.stamp}, 0), ${grantors.displayName}) order by ${grantors.userId})::text), '')`,
    })
    .from(grantors)
    .leftJoin(userDataStamps, eq(userDataStamps.userId, grantors.userId));
  return row?.g ?? "";
}
