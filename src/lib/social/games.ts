/**
 * A friend at the table (social scope §4, Feature C): the reads the game log's seating needs, and the
 * write-time resolution `logGame` snapshots a friend's facts through. Like every cross-user read it lives
 * here and joins the grant on the viewer in the SAME statement, with the viewer taken from the session.
 *
 * **The grant is the friendship.** A friend's deck shows its name and commanders to the viewer (Hugh's
 * ruling Q6, 2026-10-12: the full list is opt-in per deck, otherwise name and commander), so the viewer's
 * own `friend_links` row to the deck's owner is what lets a deck be offered and seated. A pod only SEATS
 * people (quick-seat): its members are offered only where each is also the viewer's friend, because a pod
 * grants no visibility by itself (a hand-on can leave a member who is not the new owner's friend). When
 * per-deck visibility lands, it joins `friendDecksQuery` and `friendDecksIn`, the two places a friend's
 * deck is read.
 *
 * Nothing returned carries a Clerk id: a friend is a `publicId` and a display name. `resolveFriendSeatsIn`
 * returns the friend's account id only to the write that stores it, never to a client.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { decks, friendLinks, podMembers, socialProfiles } from "../../db/schema";
import { listFriends, listPods, type Reader } from "./access";
import { commanderCard } from "./commander";
import { isUuid } from "./rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A deck as the picker draws it: its name and its commander's name and art, nothing of its list. */
export type FriendDeck = {
  deckId: string;
  name: string;
  commanderOracleId: string;
  partnerOracleId: string | null;
  commanderName: string;
  commanderImageUri: string | null;
};

/** A friend's decks, by name, only while the two are friends. Apart so a test can render its SQL. */
export function friendDecksQuery(viewerId: string, friendPublicIds: readonly string[], q: Reader = db) {
  return q
    .select({
      publicId: socialProfiles.publicId,
      deckId: decks.id,
      name: decks.name,
      commanderOracleId: decks.commanderOracleId,
      partnerOracleId: decks.partnerOracleId,
      commanderName: commanderCard.name,
      commanderImageUri: commanderCard.imageUri,
    })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .innerJoin(decks, eq(decks.userId, friendLinks.friendUserId))
    .innerJoin(commanderCard, eq(commanderCard.oracleId, decks.commanderOracleId))
    // Newest first (the handoff's F3): the deck a friend is playing now leads.
    .where(and(eq(friendLinks.userId, viewerId), inArray(socialProfiles.publicId, [...friendPublicIds])))
    .orderBy(asc(socialProfiles.publicId), desc(decks.createdAt), asc(decks.id));
}

const deckOf = (r: FriendDeck): FriendDeck => ({
  deckId: r.deckId,
  name: r.name,
  commanderOracleId: r.commanderOracleId,
  partnerOracleId: r.partnerOracleId,
  commanderName: r.commanderName,
  commanderImageUri: r.commanderImageUri,
});

/** The decks a friend can be seated with. A stranger, a former friend or a forged id reads nothing. */
export async function listFriendDecks(viewerId: string, friendPublicId: unknown): Promise<FriendDeck[]> {
  if (!isUuid(friendPublicId)) return [];
  const rows = await friendDecksQuery(viewerId, [friendPublicId]);
  return rows.map(deckOf);
}

const viewerIn = alias(podMembers, "viewer_in");

/** The OTHER members of one of the viewer's pods who are also the viewer's friends, in join order. */
export function podSeatsQuery(viewerId: string, podId: string, q: Reader = db) {
  return q
    .select({ publicId: socialProfiles.publicId, displayName: socialProfiles.displayName })
    .from(podMembers)
    .innerJoin(viewerIn, and(eq(viewerIn.podId, podMembers.podId), eq(viewerIn.userId, viewerId)))
    .innerJoin(friendLinks, and(eq(friendLinks.userId, viewerId), eq(friendLinks.friendUserId, podMembers.userId)))
    .innerJoin(socialProfiles, eq(socialProfiles.userId, podMembers.userId))
    .where(eq(podMembers.podId, podId))
    .orderBy(asc(podMembers.joinedAt), asc(podMembers.userId));
}

export type PodSeat = { publicId: string; displayName: string };

/**
 * One tap seats a pod: each friend in it, in join order. Members only: a seated friend's decks are read by
 * `listFriendDecks` when "Which deck?" asks, so a pod's answer does not grow with everyone's deck count.
 */
export async function listPodSeats(viewerId: string, podId: unknown): Promise<PodSeat[]> {
  if (!isUuid(podId)) return [];
  return podSeatsQuery(viewerId, podId);
}

/** A friend seat as the game log asked for it: a friend, and optionally one of their decks. */
export type FriendSeatAsk = { friend: string; deck: string | null };

/** What a seat stores for a friend, read at write time: the live links and the snapshot. */
export type FriendSeatFacts = {
  friendUserId: string;
  friendNameThen: string;
  friendDeckId: string | null;
  deckNameThen: string | null;
  commanderOracleId: string | null;
  partnerOracleId: string | null;
};

/** The viewer's friendship rows to the named friends, held FOR SHARE. Apart so a test can render its SQL. */
export function friendshipsIn(tx: Tx, viewerId: string, publicIds: readonly string[]) {
  return tx
    .select({ userId: friendLinks.friendUserId, publicId: socialProfiles.publicId, displayName: socialProfiles.displayName })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .where(and(eq(friendLinks.userId, viewerId), inArray(socialProfiles.publicId, [...publicIds])))
    .orderBy(asc(friendLinks.userId), asc(friendLinks.friendUserId))
    .for("share", { of: friendLinks });
}

/** The named decks whose owners are the viewer's friends, held FOR KEY SHARE. Apart so a test can render its SQL. */
export function friendDecksIn(tx: Tx, viewerId: string, deckIds: readonly string[]) {
  return tx
    .select({
      id: decks.id,
      userId: decks.userId,
      name: decks.name,
      commanderOracleId: decks.commanderOracleId,
      partnerOracleId: decks.partnerOracleId,
    })
    .from(decks)
    .innerJoin(friendLinks, and(eq(friendLinks.friendUserId, decks.userId), eq(friendLinks.userId, viewerId)))
    .where(inArray(decks.id, [...deckIds]))
    .orderBy(asc(decks.id))
    .for("key share", { of: decks });
}

/** A snapshot name never outgrows its column: a deck named before the 120 cap is cut, never refused. */
const clip = (s: string, max: number) => [...s].slice(0, max).join("");

/**
 * Resolve every friend seat inside the game's own transaction, or refuse them all (null). Each friend must
 * be the viewer's friend NOW, and each deck must be that friend's. The friendship rows are held FOR SHARE
 * until the game commits, so an unfriend or an account purge racing the log either waits for it (and then
 * finds the seats to unlink) or wins and leaves nothing to seat; the decks are held FOR KEY SHARE, which a
 * delete waits on, and its `set null` then reaches the new seat.
 */
export async function resolveFriendSeatsIn(tx: Tx, viewerId: string, asks: readonly FriendSeatAsk[]): Promise<FriendSeatFacts[] | null> {
  if (asks.length === 0) return [];
  if (!asks.every((a) => isUuid(a.friend) && (a.deck === null || isUuid(a.deck)))) return null;
  const friends = await friendshipsIn(tx, viewerId, [...new Set(asks.map((a) => a.friend))]);
  const byPublic = new Map(friends.map((f) => [f.publicId, f]));
  const deckIds = [...new Set(asks.flatMap((a) => (a.deck === null ? [] : [a.deck])))];
  const owned = deckIds.length === 0 ? [] : await friendDecksIn(tx, viewerId, deckIds);
  const byDeck = new Map(owned.map((d) => [d.id, d]));
  const out: FriendSeatFacts[] = [];
  for (const ask of asks) {
    const friend = byPublic.get(ask.friend);
    if (!friend) return null;
    if (ask.deck === null) {
      out.push({ friendUserId: friend.userId, friendNameThen: friend.displayName, friendDeckId: null, deckNameThen: null, commanderOracleId: null, partnerOracleId: null });
      continue;
    }
    const deck = byDeck.get(ask.deck);
    if (!deck || deck.userId !== friend.userId) return null;
    out.push({
      friendUserId: friend.userId,
      friendNameThen: friend.displayName,
      friendDeckId: deck.id,
      deckNameThen: clip(deck.name, 120),
      commanderOracleId: deck.commanderOracleId,
      partnerOracleId: deck.partnerOracleId,
    });
  }
  return out;
}

/** A friend as the seat picker lists them: a face, a name and how many decks they can be seated with. */
export type PickerFriend = { publicId: string; displayName: string; commanderArt: string | null; deckCount: number };

/** One count per friend of the viewer's who has a deck, through the viewer's own link rows. Apart so a test can render its SQL. */
export function friendDeckCountsQuery(viewerId: string, q: Reader = db) {
  return q
    .select({ publicId: socialProfiles.publicId, count: sql<number>`count(${decks.id})::int` })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .innerJoin(decks, eq(decks.userId, friendLinks.friendUserId))
    .where(eq(friendLinks.userId, viewerId))
    .groupBy(socialProfiles.publicId);
}

/** The viewer's friends with a deck count each, read when the picker OPENS (G7). Their live face, never persisted. */
export async function listPickerFriends(viewerId: string): Promise<PickerFriend[]> {
  const [friends, counts] = await Promise.all([listFriends(viewerId), friendDeckCountsQuery(viewerId)]);
  const byFriend = new Map(counts.map((c) => [c.publicId, c.count]));
  return friends.map((f) => ({
    publicId: f.publicId,
    displayName: f.displayName,
    commanderArt: f.commander?.artCropUri ?? null,
    deckCount: byFriend.get(f.publicId) ?? 0,
  }));
}

/** A pod the viewer is in, as a quick-seat chip: its name and how many people sit in it, the viewer included. */
export type PickerPod = { id: string; name: string; memberCount: number };

export async function listPickerPods(viewerId: string): Promise<PickerPod[]> {
  const pods = await listPods(viewerId);
  return pods.map((p) => ({ id: p.id, name: p.name, memberCount: p.members.length }));
}
