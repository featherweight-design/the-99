/**
 * The friend half of the cross-deck game history (`src/lib/games/history.ts`; design handoff
 * `design_handoff_the99_game_history`, build PR 1). The history is the OWNER's own: every game it reads is on one of
 * the viewer's decks, and every seat is the owner's snapshot. What lives here is the one thing that needs a friend's
 * live rows, the `public_id` that lets a seat be filtered on and a chip be keyed. Like every cross-user read it joins
 * the grant on the viewer in the SAME statement (the viewer's own `friend_links` row), so a person who is no longer
 * the viewer's friend, or whose account is gone, has no public id: the seat still draws its snapshot, and cannot be
 * filtered on.
 *
 * Nothing returned carries a Clerk id: `friend_user_id` is read only to join and group, never selected into a result.
 * A friend's name is minted by `named()` / `savedName()` here, in this layer, never as a plain string.
 */
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, deckGameOpponents, deckGames, decks, friendLinks, socialProfiles } from "../../db/schema";
import { assembleOpponents, type GameOpponent } from "../decks/game-opponents";
import { named } from "../person-name/mint";
import { commanderCard, commanderColumns, facePrinting, faceJoin, toCommander, type ProfileCommander } from "./commander";
import type { ThirdPartyName } from "../person-name/brand";

type Reader = Pick<typeof db, "select">;

/**
 * Whether a game has a seat held by the viewer's friend with this public id: an `exists` over the game's seats whose
 * friend is resolved through the viewer's own link row, in the same statement. A public id that is not the viewer's
 * current friend resolves to no account, so the predicate is false for every game. `won` narrows it to the seat that
 * won a game the viewer lost. Correlated on `deck_games`, which the caller selects from.
 */
export function friendSeatPredicate(viewerId: string, publicId: string, opts: { won?: boolean } = {}): SQL {
  return sql`exists (
    select 1 from ${deckGameOpponents} o
    where o.game_id = ${deckGames}.id
      ${opts.won ? sql`and o.won` : sql``}
      and o.friend_user_id = (
        select sp.user_id from ${socialProfiles} sp
        inner join ${friendLinks} fl on fl.friend_user_id = sp.user_id
        where fl.user_id = ${viewerId} and sp.public_id = ${publicId}
      )
  )`;
}

/** A seat as the history draws it: the shipped seat, its friend also carrying the public id (null once the link or account is gone). */
export type HistorySeat = Omit<GameOpponent, "friend"> & {
  friend: (NonNullable<GameOpponent["friend"]> & { publicId: string | null }) | null;
};

const partnerCard = alias(cards, "partner_card");

/** Every seat of these games, the viewer's own, with the friend's public id when the viewer is still their friend. Apart so a test can render its SQL. */
export function historySeatsQuery(viewerId: string, gameIds: readonly string[], q: Reader = db) {
  return q
    .select({
      gameId: deckGameOpponents.gameId,
      seat: deckGameOpponents.seat,
      friendUserId: deckGameOpponents.friendUserId,
      friendNameThen: deckGameOpponents.friendNameThen,
      deckNameThen: deckGameOpponents.deckNameThen,
      label: deckGameOpponents.label,
      won: deckGameOpponents.won,
      commanderOracleId: deckGameOpponents.commanderOracleId,
      commanderName: cards.name,
      commanderIdentity: cards.colorIdentity,
      partnerOracleId: deckGameOpponents.partnerOracleId,
      partnerName: partnerCard.name,
      partnerIdentity: partnerCard.colorIdentity,
      publicId: socialProfiles.publicId,
    })
    .from(deckGameOpponents)
    .innerJoin(deckGames, eq(deckGames.id, deckGameOpponents.gameId))
    .innerJoin(decks, and(eq(decks.id, deckGames.deckId), eq(decks.userId, viewerId)))
    .leftJoin(cards, eq(cards.oracleId, deckGameOpponents.commanderOracleId))
    .leftJoin(partnerCard, eq(partnerCard.oracleId, deckGameOpponents.partnerOracleId))
    .leftJoin(friendLinks, and(eq(friendLinks.userId, viewerId), eq(friendLinks.friendUserId, deckGameOpponents.friendUserId)))
    .leftJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    .where(and(eq(deckGames.userId, viewerId), inArray(deckGameOpponents.gameId, [...gameIds])))
    .orderBy(deckGameOpponents.gameId, deckGameOpponents.seat);
}

type HistorySeatRow = Awaited<ReturnType<typeof historySeatsQuery>>[number];

/** Pure: the rows a read returned, as seats per game. A seat's friend carries the public id its row joined, else null. */
export function seatsFromRows(rows: readonly HistorySeatRow[]): Map<string, HistorySeat[]> {
  const publicIds = new Map(rows.map((r) => [`${r.gameId}:${r.seat}`, r.publicId]));
  return new Map(
    [...assembleOpponents([...rows])].map(([gameId, list]) => [
      gameId,
      list.map((s): HistorySeat => ({ ...s, friend: s.friend && { ...s.friend, publicId: publicIds.get(`${gameId}:${s.seat}`) ?? null } })),
    ]),
  );
}

/** The seats of these games by game id; a game with none is absent. */
export async function loadHistorySeats(viewerId: string, gameIds: readonly string[]): Promise<Map<string, HistorySeat[]>> {
  if (gameIds.length === 0) return new Map();
  return seatsFromRows(await historySeatsQuery(viewerId, gameIds));
}

/** `commander` is the friend's face (their signature commander's art), null while they have chosen none. */
export type PlayedAgainstFriend = { publicId: string; name: ThirdPartyName; games: number; commander: ProfileCommander | null };

/** The viewer's current friends who sat in any of the viewer's games, with the number of games, over the whole history. */
export function playedAgainstFriendsQuery(viewerId: string, q: Reader = db) {
  const games = sql<number>`count(distinct ${deckGameOpponents.gameId})::int`;
  return q
    .select({ publicId: socialProfiles.publicId, displayName: socialProfiles.displayName, ...commanderColumns, games })
    .from(deckGameOpponents)
    .innerJoin(deckGames, eq(deckGames.id, deckGameOpponents.gameId))
    .innerJoin(decks, and(eq(decks.id, deckGames.deckId), eq(decks.userId, viewerId)))
    .innerJoin(friendLinks, and(eq(friendLinks.userId, viewerId), eq(friendLinks.friendUserId, deckGameOpponents.friendUserId)))
    .innerJoin(socialProfiles, eq(socialProfiles.userId, friendLinks.friendUserId))
    // The face joins in this same statement, so the grant above decides whose art may be drawn.
    .leftJoin(commanderCard, eq(commanderCard.oracleId, socialProfiles.commanderOracleId))
    .leftJoin(facePrinting, faceJoin)
    .where(eq(deckGames.userId, viewerId))
    .groupBy(socialProfiles.publicId, socialProfiles.displayName, commanderCard.oracleId, commanderCard.name, commanderCard.artCropUri, facePrinting.artCropUri)
    .orderBy(desc(games), socialProfiles.publicId);
}

export async function listPlayedAgainstFriends(viewerId: string): Promise<PlayedAgainstFriend[]> {
  const rows = await playedAgainstFriendsQuery(viewerId);
  return rows.map((r) => ({ publicId: r.publicId, name: named(r.displayName), games: r.games, commander: toCommander(r) }));
}
