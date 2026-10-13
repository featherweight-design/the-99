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
import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { decks, friendLinks, podMembers, socialProfiles } from "../../db/schema";
import type { Reader } from "./access";
import { isUuid } from "./rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type FriendDeck = { deckId: string; name: string; commanderOracleId: string; partnerOracleId: string | null };

/** A friend's decks, by name, only while the two are friends. Apart so a test can render its SQL. */
export function friendDecksQuery(viewerId: string, friendPublicIds: readonly string[], q: Reader = db) {
  return q
    .select({
      publicId: socialProfiles.publicId,
      deckId: decks.id,
      name: decks.name,
      commanderOracleId: decks.commanderOracleId,
      partnerOracleId: decks.partnerOracleId,
    })
    .from(friendLinks)
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .innerJoin(decks, eq(decks.userId, friendLinks.friendUserId))
    .where(and(eq(friendLinks.userId, viewerId), inArray(socialProfiles.publicId, [...friendPublicIds])))
    .orderBy(asc(socialProfiles.publicId), asc(decks.name), asc(decks.id));
}

const deckOf = (r: FriendDeck): FriendDeck =>
  ({ deckId: r.deckId, name: r.name, commanderOracleId: r.commanderOracleId, partnerOracleId: r.partnerOracleId });

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

export type PodSeat = { publicId: string; displayName: string; decks: FriendDeck[] };

/** One tap seats a pod: each friend in it, with the decks they can be seated with. */
export async function listPodSeats(viewerId: string, podId: unknown): Promise<PodSeat[]> {
  if (!isUuid(podId)) return [];
  const seats = await podSeatsQuery(viewerId, podId);
  if (seats.length === 0) return [];
  const owned = await friendDecksQuery(viewerId, seats.map((s) => s.publicId));
  return seats.map((s) => ({
    ...s,
    decks: owned.filter((d) => d.publicId === s.publicId).map(deckOf),
  }));
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
