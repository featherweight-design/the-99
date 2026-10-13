/**
 * Opponents in the game log (social scope §4, Feature C; Hugh's ruling Q15): the read the history row and
 * the matchup panel draw from. The write path (`logGame`'s shape check, the catalog check and the seats
 * written in the game's transaction) lands beside it in the next PR; a friend's facts are resolved and
 * snapshot in `src/lib/social/`, the one place a friend's rows are read. Everything here is the owner's own.
 *
 * Every read draws the SNAPSHOT (the friend's name and the deck's name and commanders as they were when the
 * game was logged), never a friend's live rows, so this read has no cross-user cache dependency. The live
 * friend id only groups one person's seats and is never returned: a seat carries an opaque `friend.key`.
 *
 * The label is player-typed free text and reaches no model prompt: `game-opponents.test.ts` fails a module
 * outside the few allowed that names the table, which is what keeps a prompt builder from reading it.
 */
import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, deckGameOpponents, deckGames } from "../../db/schema";
import { isUuid } from "../social/rules";

export type OpponentCommander = { oracleId: string; name: string };

/** One seat as every surface draws it: the snapshot, never a friend's live rows. */
export type GameOpponent = {
  seat: number;
  /** A friend, by the name they had then. `key` groups one person's seats within this read; it is not an id. */
  friend: { key: string; name: string } | null;
  /** The friend's deck, by the name it had then. */
  deckName: string | null;
  commander: OpponentCommander | null;
  partner: OpponentCommander | null;
  /** The commanders' color identity, in WUBRG order. Empty for colorless, or for no commander. */
  colorIdentity: string[];
  label: string | null;
  won: boolean;
};

const partnerCard = alias(cards, "partner_card");

/** Every seat of the owner's games on one deck. Apart so a test can render its SQL. */
export function gameOpponentsQuery(deckId: string, userId: string, q: Pick<typeof db, "select"> = db) {
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
    })
    .from(deckGameOpponents)
    .innerJoin(deckGames, eq(deckGames.id, deckGameOpponents.gameId))
    .leftJoin(cards, eq(cards.oracleId, deckGameOpponents.commanderOracleId))
    .leftJoin(partnerCard, eq(partnerCard.oracleId, deckGameOpponents.partnerOracleId))
    .where(and(eq(deckGames.deckId, deckId), eq(deckGames.userId, userId)))
    .orderBy(asc(deckGameOpponents.gameId), asc(deckGameOpponents.seat));
}

const WUBRG = ["W", "U", "B", "R", "G"];

/** Pure: the rows a read returned, as seats per game. Friend keys are handed out in row order. */
export function assembleOpponents(rows: Awaited<ReturnType<typeof gameOpponentsQuery>>): Map<string, GameOpponent[]> {
  const keys = new Map<string, string>();
  const out = new Map<string, GameOpponent[]>();
  for (const r of rows) {
    let friend: GameOpponent["friend"] = null;
    if (r.friendNameThen !== null) {
      // A friend whose account has gone (the purge unlinks it) still groups by the name they had.
      let key = `n:${r.friendNameThen}`;
      if (r.friendUserId !== null) {
        if (!keys.has(r.friendUserId)) keys.set(r.friendUserId, `f${keys.size + 1}`);
        key = keys.get(r.friendUserId)!;
      }
      friend = { key, name: r.friendNameThen };
    }
    const identity = new Set([...(r.commanderIdentity ?? []), ...(r.partnerIdentity ?? [])]);
    const seat: GameOpponent = {
      seat: r.seat,
      friend,
      deckName: r.deckNameThen,
      commander: r.commanderOracleId !== null && r.commanderName !== null ? { oracleId: r.commanderOracleId, name: r.commanderName } : null,
      partner: r.partnerOracleId !== null && r.partnerName !== null ? { oracleId: r.partnerOracleId, name: r.partnerName } : null,
      colorIdentity: WUBRG.filter((c) => identity.has(c)),
      label: r.label,
      won: r.won,
    };
    const list = out.get(r.gameId);
    if (list) list.push(seat);
    else out.set(r.gameId, [seat]);
  }
  return out;
}

/** The opponents of every game on a deck the owner holds, by game id. A game with none is absent. */
export async function listGameOpponents(deckId: string, userId: string): Promise<Map<string, GameOpponent[]>> {
  if (!isUuid(deckId)) return new Map();
  return assembleOpponents(await gameOpponentsQuery(deckId, userId));
}
