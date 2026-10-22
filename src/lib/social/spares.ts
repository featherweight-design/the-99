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
 * What comes back is the card, the friend (public id, display name, face, and the names of the pods the
 * grant holds through), and the spare count. Never `owned`, never a claim, never a deck name: a share is a
 * fact about spares, not about decks.
 *
 * Nothing here moves a card or asks for one (no borrowing, no cart change). It is served by
 * `GET /api/friend-spares`, uncached, so no cached key carries a friend's data.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, collectionItems, friendLinks, podMembers, podSpareShares, pods, socialProfiles, userDataStamps, wishlistItems } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
// Each FRIEND's switches, not the viewer's. `check:list-cache` refuses this import on a cached page's path: a
// friend's override flip moves no key there, so such a page must first key on the friends' resolved switches.
import { resolveSwitchEnv } from "../switches/snapshot";
import { resolveFriend, type Reader } from "./access";
import { commanderCard, commanderColumns, toCommander, type ProfileCommander } from "./commander";
import { isUuid } from "./rules";
import { isOffered, spareCount } from "./spare-rules";
import { spareSettingsIn, type SpareSettings } from "./spare-settings";

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

/**
 * The same grant, with what a spare row draws of the friend (Social R2, plan `2026-10-15-social-r2.md` PR 2):
 * the face, through the friendship this statement already joins (D1), and the names of the pods the grant
 * holds through, `shares with {pod}`. One row per friend, its pods in name order.
 */
export function spareGrantDetailsQuery(viewerId: string, q: Reader = db) {
  return q
    .select({
      userId: friendLinks.friendUserId,
      publicId: socialProfiles.publicId,
      displayName: socialProfiles.displayName,
      ...commanderColumns,
      pods: sql<string[]>`array_agg(${pods.name} order by ${pods.name}, ${pods.id})`,
    })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .innerJoin(podSpareShares, eq(podSpareShares.userId, friendLinks.friendUserId))
    .innerJoin(friendIn, and(eq(friendIn.podId, podSpareShares.podId), eq(friendIn.userId, friendLinks.friendUserId)))
    .innerJoin(viewerIn, and(eq(viewerIn.podId, podSpareShares.podId), eq(viewerIn.userId, viewerId)))
    .innerJoin(pods, eq(pods.id, podSpareShares.podId))
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .where(eq(friendLinks.userId, viewerId))
    .groupBy(
      friendLinks.friendUserId, socialProfiles.publicId, socialProfiles.displayName,
      commanderCard.oracleId, commanderCard.name, commanderCard.artCropUri,
    )
    .orderBy(asc(friendLinks.friendUserId));
}

type GrantDetails = Awaited<ReturnType<typeof spareGrantDetailsQuery>>[number];

export { spareCount };

/** How many friends' claim models one read runs at once. */
export const CLAIM_MODELS_AT_ONCE = 4;

export type SpareFriend = {
  publicId: string;
  displayName: string;
  /** The friend's face (G10), or null for initials. */
  commander: ProfileCommander | null;
  /** The pods the share reaches the viewer through, in name order: `shares with {pod}`. */
  pods: string[];
};
export type FriendSpare = { oracleId: string; friend: SpareFriend; spare: number };

// The most cards one spares read asks about: a request past it is refused rather than cut. It lives in client-rules
// so the deck page batches by the same number the route refuses past.
export { MAX_SPARES_BATCH } from "./client-rules";

/**
 * Each granting friend's claim model narrowed to `asked`, in input order, at most CLAIM_MODELS_AT_ONCE at a
 * time. Each one runs in its own repeatable-read transaction (never a read-only one, which poisons the
 * pooled connection: `draft-state-snapshot.test.ts`) that FIRST re-reads the viewer's
 * grants inside it, so the authorization and the friend's rows are one snapshot: a friend whose grant is
 * absent at that instant reads as `null` and nothing of theirs is read.
 *
 * Each model runs under the FRIEND's resolved switches (`resolveSwitchEnv(friend)`), never the viewer's:
 * the claim model's `locked` key and pending clause describe the friend's decks, so they follow the switches
 * the friend's own pages read them under (admin PR 6f). A spare is counted from `owned`, `hard` and `soft`
 * alone, which neither switch moves today, so this keeps the two reads of one friend's model in step rather
 * than changing a figure.
 */
export async function claimModelsFor(viewerId: string, friends: readonly string[], asked: readonly string[]) {
  type Read = { grant: GrantDetails; model: Awaited<ReturnType<typeof loadAvailability>>; settings: SpareSettings };
  const models: (Read | null)[] = new Array(friends.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CLAIM_MODELS_AT_ONCE, friends.length) }, async () => {
    for (let i = next++; i < friends.length; i = next++) {
      const friend = friends[i];
      const env = await resolveSwitchEnv(friend);
      models[i] = await db.transaction(async (tx) => {
        // The grant with its pods and face, read in the same snapshot as the model, so a row never names a
        // pod the share stopped reaching the viewer through before the friend's rows were read.
        const grant = (await spareGrantDetailsQuery(viewerId, tx)).find((g) => g.userId === friend);
        if (!grant) return null;
        // The friend's own threshold and keeps (Settings' Spares, G3), in the same snapshot and only past its grant
        // check: they are the GRANTOR's settings, so a friend's choice never reaches another friend's rows.
        const model = await loadAvailability(friend, { oracleIds: [...asked], env }, tx);
        return { grant, model, settings: await spareSettingsIn(tx, friend, asked) };
      }, { isolationLevel: "repeatable read" });
    }
  }));
  return models;
}

/**
 * The spare copies the viewer's friends hold of the named cards (the viewer's demand: their decks' buy
 * rows, and their wishlist once it exists). One grant read, then the friend's own claim model per
 * granting friend, narrowed to the asked cards, each in one snapshot with its own grant check. Ordered by card, then by friend name.
 *
 * A friend's card is offered by ONE rule (Settings' Spares, G3), `spareCount` then `isOffered` in `spare-rules`: at
 * least that friend's own `spare_min` spare copies (default 1, every spare, as before the setting) and not kept back
 * by that friend. The stand-ins modal and the feed read through here; a friend's Spares tab reads every card through
 * `loadFriendSpareList`, which applies the same two calls, so they agree.
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
  for (const read of models) {
    if (read === null) continue;
    const g = read.grant;
    const friend: SpareFriend = { publicId: g.publicId, displayName: g.displayName, commander: toCommander(g), pods: g.pods };
    const { min, kept } = read.settings;
    for (const [oracleId, a] of read.model) {
      const spare = spareCount(a);
      if (isOffered(spare, min, kept.has(oracleId))) out.push({ oracleId, friend, spare });
    }
  }
  return out.sort((x, y) =>
    (x.oracleId < y.oracleId ? -1 : x.oracleId > y.oracleId ? 1 : 0)
    || (x.friend.displayName < y.friend.displayName ? -1 : x.friend.displayName > y.friend.displayName ? 1 : 0)
    || (x.friend.publicId < y.friend.publicId ? -1 : 1));
}

/**
 * Which of `oracleIds` the reader THEMSELVES offers to friends, with each one's spare count: the rule
 * `loadFriendSpares` applies to a friend (`spareCount`, then `isOffered` with their own `spare_min` and keeps), on
 * the reader's own collection and claims, in one repeatable-read snapshot. Spare requests read it on the holder's
 * side (G3): an ask for a card the holder no longer offers leaves Waiting on you and the badge. `env` is the reader's
 * own resolved switches. Reads only the reader's rows, so it needs no grant.
 */
export async function loadOwnOffered(userId: string, oracleIds: readonly string[], env: NodeJS.ProcessEnv): Promise<Map<string, number>> {
  const asked = [...new Set(oracleIds.filter(isUuid))];
  const out = new Map<string, number>();
  if (asked.length === 0) return out;
  const read = await db.transaction(async (tx) => ({
    model: await loadAvailability(userId, { oracleIds: asked, env }, tx),
    settings: await spareSettingsIn(tx, userId, asked),
  }), { isolationLevel: "repeatable read" });
  for (const [oracleId, a] of read.model) {
    const spare = spareCount(a);
    if (isOffered(spare, read.settings.min, read.settings.kept.has(oracleId))) out.set(oracleId, spare);
  }
  return out;
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

export type SharedPod = { podId: string; name: string };

/** The pods the viewer shares spares with, for each pod's checkbox (E5). Only pods they are still in. */
export async function listSharedPods(viewerId: string, q: Reader = db): Promise<SharedPod[]> {
  return sharedPodsQuery(viewerId, q);
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

export type FriendSpareLine = {
  oracleId: string;
  name: string;
  imageUri: string | null;
  spare: number;
  /** The viewer wants this card (a line on their own wishlist). */
  onWishlist: boolean;
};

/** The Spares tab's order: cards on the viewer's wishlist first, then by name, then by id so a tie is stable. */
export function spareLineOrder(a: FriendSpareLine, b: FriendSpareLine): number {
  return Number(b.onWishlist) - Number(a.onWishlist) || a.name.localeCompare(b.name, "en-US", { sensitivity: "base" }) || (a.oracleId < b.oracleId ? -1 : 1);
}

/** What one friend offers the viewer, for the friend page's Spares tab. */
export type FriendSpareList = {
  /** The pods the share reaches the viewer through, in name order: `shared with {pod}`. */
  pods: string[];
  /** Cards on the viewer's wishlist first, then by name; by name alone while the viewer's wishlist is off. */
  lines: FriendSpareLine[];
  /** `SOCIAL_WISHLIST_ENABLED` for the VIEWER: off, no card is marked or ordered by their wishlist, and the line says nothing of it. */
  wishlist: boolean;
};

/**
 * Every spare ONE friend offers the viewer (menu and Home plan, PR 7; erratum 9): `loadFriendSpares` answers only
 * for cards the viewer asks about, and this tab asks about everything the friend owns. Null when the friend is not
 * the viewer's, or shares no spares with a pod the viewer is in: the tab says so, and nothing of the friend's is read.
 *
 * The grant is read INSIDE the repeatable-read transaction that reads the friend's claim model, as `claimModelsFor`
 * does, so the authorization and the rows are one snapshot, and the friend's own threshold and keeps filter the
 * result through `isOffered`, the one place a spare is decided offered (Settings' Spares, G3). Run under the
 * FRIEND's resolved switches; `wishlist` is the VIEWER's `SOCIAL_WISHLIST_ENABLED`, and off, their wishlist is not read.
 */
export async function loadFriendSpareList(viewerId: string, publicId: unknown, wishlist: boolean): Promise<FriendSpareList | null> {
  const friend = await resolveFriend(viewerId, publicId);
  if (friend === null) return null;
  const env = await resolveSwitchEnv(friend);
  const read = await db.transaction(async (tx) => {
    const grant = (await spareGrantDetailsQuery(viewerId, tx)).find((g) => g.userId === friend);
    if (!grant) return null;
    const owned = (await tx
      .selectDistinct({ oracleId: collectionItems.oracleId })
      .from(collectionItems)
      .where(eq(collectionItems.userId, friend))).map((r) => r.oracleId);
    const model = await loadAvailability(friend, { oracleIds: owned, env }, tx);
    const settings = await spareSettingsIn(tx, friend, owned);
    const offered: { oracleId: string; spare: number }[] = [];
    for (const [oracleId, a] of model) {
      const spare = spareCount(a);
      if (isOffered(spare, settings.min, settings.kept.has(oracleId))) offered.push({ oracleId, spare });
    }
    return { grant, offered };
  }, { isolationLevel: "repeatable read" });
  if (read === null) return null;
  const ids = read.offered.map((o) => o.oracleId);
  if (ids.length === 0) return { pods: read.grant.pods, lines: [], wishlist };
  const [info, wanted] = await Promise.all([
    db.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri }).from(cards).where(inArray(cards.oracleId, ids)),
    wishlist
      ? db.select({ oracleId: wishlistItems.oracleId }).from(wishlistItems).where(and(eq(wishlistItems.userId, viewerId), inArray(wishlistItems.oracleId, ids)))
      : Promise.resolve([]),
  ]);
  const byId = new Map(info.map((c) => [c.oracleId, c]));
  const onList = new Set(wanted.map((w) => w.oracleId));
  const lines = read.offered.flatMap((o) => {
    const c = byId.get(o.oracleId);
    return c ? [{ oracleId: o.oracleId, name: c.name, imageUri: c.imageUri, spare: o.spare, onWishlist: onList.has(o.oracleId) }] : [];
  });
  lines.sort(spareLineOrder);
  return { pods: read.grant.pods, lines, wishlist };
}
