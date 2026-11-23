// Each picker action reads as the READER from the session, and refuses before reading without one.
// A component test mocks these away, so a read that skipped the session would pass everywhere else.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { readerStoreForAction, requireUserId, searchOpponentCommanders, searchOpponentBackgrounds, listFriendDecks, listPodSeats, listPickerFriends, listPickerPods } = vi.hoisted(() => ({
  readerStoreForAction: vi.fn(),
  requireUserId: vi.fn(),
  searchOpponentCommanders: vi.fn(),
  searchOpponentBackgrounds: vi.fn(),
  listFriendDecks: vi.fn(),
  listPodSeats: vi.fn(),
  listPickerFriends: vi.fn(),
  listPickerPods: vi.fn(),
}));
vi.mock("../../../lib/auth", () => ({ requireUserId }));
vi.mock("../../../lib/decks/opponent-commanders", () => ({ searchOpponentCommanders, searchOpponentBackgrounds }));
vi.mock("../../../lib/stores/action-store", () => ({ readerStoreForAction }));
vi.mock("../../../lib/social/games", () => ({ listFriendDecks, listPodSeats, listPickerFriends, listPickerPods }));

import {
  listFriendDecksAction, listPickerFriendsAction, listPickerPodsAction, listPodSeatsAction, searchOpponentBackgroundsAction, searchOpponentCommandersAction,
} from "./opponent-actions";

beforeEach(() => {
  vi.resetAllMocks();
  requireUserId.mockResolvedValue("user_1");
  readerStoreForAction.mockResolvedValue("tcgplayer");
  searchOpponentCommanders.mockResolvedValue([{ oracleId: "y" }]);
  searchOpponentBackgrounds.mockResolvedValue([{ oracleId: "b" }]);
  listFriendDecks.mockResolvedValue([{ deckId: "d" }]);
  listPodSeats.mockResolvedValue([{ publicId: "p" }]);
  listPickerFriends.mockResolvedValue([{ publicId: "f", deckCount: 2 }]);
  listPickerPods.mockResolvedValue([{ id: "pod", name: "Thursday", size: 4 }]);
});

describe("the opponent picker's actions", () => {
  it("read as the signed-in reader", async () => {
    expect(await searchOpponentCommandersAction("yur")).toEqual([{ oracleId: "y" }]);
    // The hits' art is the reader's store's printing (store choice), resolved for this reader.
    expect(readerStoreForAction).toHaveBeenCalledWith("user_1");
    expect(searchOpponentCommanders).toHaveBeenCalledWith("yur", "tcgplayer");
    expect(await searchOpponentBackgroundsAction("ath")).toEqual([{ oracleId: "b" }]);
    expect(searchOpponentBackgrounds).toHaveBeenCalledWith("ath", "tcgplayer");
    expect(await listFriendDecksAction("f")).toEqual([{ deckId: "d" }]);
    expect(await listPodSeatsAction("p")).toEqual([{ publicId: "p" }]);
    expect(listFriendDecks).toHaveBeenCalledWith("user_1", "f");
    expect(listPodSeats).toHaveBeenCalledWith("user_1", "p");
    expect(await listPickerFriendsAction()).toEqual([{ publicId: "f", deckCount: 2 }]);
    expect(await listPickerPodsAction()).toEqual([{ id: "pod", name: "Thursday", size: 4 }]);
    expect(listPickerFriends).toHaveBeenCalledWith("user_1");
    expect(listPickerPods).toHaveBeenCalledWith("user_1");
  });

  it("read nothing without a signed-in reader", async () => {
    requireUserId.mockRejectedValue(new Error("unauthenticated"));
    await expect(searchOpponentCommandersAction("yur")).rejects.toThrow();
    await expect(listFriendDecksAction("f")).rejects.toThrow();
    await expect(listPodSeatsAction("p")).rejects.toThrow();
    await expect(listPickerFriendsAction()).rejects.toThrow();
    await expect(listPickerPodsAction()).rejects.toThrow();
    await expect(searchOpponentBackgroundsAction("ath")).rejects.toThrow();
    expect(searchOpponentCommanders).not.toHaveBeenCalled();
    expect(searchOpponentBackgrounds).not.toHaveBeenCalled();
    expect(readerStoreForAction).not.toHaveBeenCalled();
    expect(listFriendDecks).not.toHaveBeenCalled();
    expect(listPodSeats).not.toHaveBeenCalled();
    expect(listPickerFriends).not.toHaveBeenCalled();
    expect(listPickerPods).not.toHaveBeenCalled();
  });
});
