"use server";

// The reads the game log's opponent picker calls (Social R3 plan, PR 1). Each takes the reader from the
// session. A friend's decks and a pod's seats are
// read in `lib/social/games.ts`, which joins the viewer's friendship in the same statement; nothing here
// names a social table.

import { requireUserId } from "../../../lib/auth";
import { searchOpponentBackgrounds, searchOpponentCommanders, type OpponentCommanderHit } from "../../../lib/decks/opponent-commanders";
import { readerStoreForAction } from "../../../lib/stores/action-store";
import { listFriendDecks, listPickerFriends, listPickerPods, listPodSeats, type FriendDeck, type PickerFriend, type PickerPod, type PodSeat } from "../../../lib/social/games";

/**
 * The commanders an "anyone" seat can name, by card name. Catalog data, but still behind sign-in. Each hit's art is
 * the printing the reader's store carries (store choice), resolved from their switches for this request.
 */
export async function searchOpponentCommandersAction(query: string): Promise<OpponentCommanderHit[]> {
  const userId = await requireUserId();
  return searchOpponentCommanders(query, await readerStoreForAction(userId));
}

/** The seat picker's Background step: a Background by name (opponent Background addendum, G1). */
export async function searchOpponentBackgroundsAction(query: string): Promise<OpponentCommanderHit[]> {
  const userId = await requireUserId();
  return searchOpponentBackgrounds(query, await readerStoreForAction(userId));
}

/** The decks a friend can be seated with, read when the picker opens that friend (G7). */
export async function listFriendDecksAction(friendPublicId: string): Promise<FriendDeck[]> {
  const userId = await requireUserId();
  return listFriendDecks(userId, friendPublicId);
}

/** The other members of one of the reader's pods who are also the reader's friends, with their decks. */
export async function listPodSeatsAction(podId: string): Promise<PodSeat[]> {
  const userId = await requireUserId();
  return listPodSeats(userId, podId);
}

/** The reader's friends with a deck count each, read when the seat picker OPENS (G7). */
export async function listPickerFriendsAction(): Promise<PickerFriend[]> {
  const userId = await requireUserId();
  return listPickerFriends(userId);
}

/** The reader's pods, for the Seat a pod chips: names and sizes only. */
export async function listPickerPodsAction(): Promise<PickerPod[]> {
  const userId = await requireUserId();
  return listPickerPods(userId);
}
