"use server";

// The reads the game log's opponent picker calls (Social R3 plan, PR 1). Each takes the reader from the
// session, re-checks `SOCIAL_GAMES_ENABLED` for THAT reader, and answers an empty list when it is off, so
// a client that never saw the switch learns nothing from the answer. A friend's decks and a pod's seats are
// read in `lib/social/games.ts`, which joins the viewer's friendship in the same statement; nothing here
// names a social table.

import { requireUserId } from "../../../lib/auth";
import { searchOpponentCommanders, type OpponentCommanderHit } from "../../../lib/decks/opponent-commanders";
import { listFriendDecks, listPodSeats, type FriendDeck, type PodSeat } from "../../../lib/social/games";
import { socialGamesEnabled } from "../../../lib/social/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";

async function gamesOn(userId: string): Promise<boolean> {
  return socialGamesEnabled(await requestSwitchEnv(userId));
}

/** The commanders an "anyone" seat can name, by card name. Catalog data, but still behind the switch. */
export async function searchOpponentCommandersAction(query: string): Promise<OpponentCommanderHit[]> {
  const userId = await requireUserId();
  if (!(await gamesOn(userId))) return [];
  return searchOpponentCommanders(query);
}

/** The decks a friend can be seated with, read when the picker opens that friend (G7). */
export async function listFriendDecksAction(friendPublicId: string): Promise<FriendDeck[]> {
  const userId = await requireUserId();
  if (!(await gamesOn(userId))) return [];
  return listFriendDecks(userId, friendPublicId);
}

/** The other members of one of the reader's pods who are also the reader's friends, with their decks. */
export async function listPodSeatsAction(podId: string): Promise<PodSeat[]> {
  const userId = await requireUserId();
  if (!(await gamesOn(userId))) return [];
  return listPodSeats(userId, podId);
}
