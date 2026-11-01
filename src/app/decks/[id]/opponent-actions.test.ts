// Each picker action reads as the READER from the session, and refuses before reading without one.
// A component test mocks these away, so a read that skipped the session would pass everywhere else.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserId, searchOpponentCommanders, listFriendDecks, listPodSeats, listPickerFriends, listPickerPods } = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  searchOpponentCommanders: vi.fn(),
  listFriendDecks: vi.fn(),
  listPodSeats: vi.fn(),
  listPickerFriends: vi.fn(),
  listPickerPods: vi.fn(),
}));
vi.mock("../../../lib/auth", () => ({ requireUserId }));
vi.mock("../../../lib/decks/opponent-commanders", () => ({ searchOpponentCommanders }));
vi.mock("../../../lib/social/games", () => ({ listFriendDecks, listPodSeats, listPickerFriends, listPickerPods }));

import {
  listFriendDecksAction, listPickerFriendsAction, listPickerPodsAction, listPodSeatsAction, searchOpponentCommandersAction,
} from "./opponent-actions";

beforeEach(() => {
  vi.resetAllMocks();
  requireUserId.mockResolvedValue("user_1");
  searchOpponentCommanders.mockResolvedValue([{ oracleId: "y" }]);
  listFriendDecks.mockResolvedValue([{ deckId: "d" }]);
  listPodSeats.mockResolvedValue([{ publicId: "p" }]);
  listPickerFriends.mockResolvedValue([{ publicId: "f", deckCount: 2 }]);
  listPickerPods.mockResolvedValue([{ id: "pod", name: "Thursday", size: 4 }]);
});

describe("the opponent picker's actions", () => {
  it("read as the signed-in reader", async () => {
    expect(await searchOpponentCommandersAction("yur")).toEqual([{ oracleId: "y" }]);
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
    expect(searchOpponentCommanders).not.toHaveBeenCalled();
    expect(listFriendDecks).not.toHaveBeenCalled();
    expect(listPodSeats).not.toHaveBeenCalled();
    expect(listPickerFriends).not.toHaveBeenCalled();
    expect(listPickerPods).not.toHaveBeenCalled();
  });
});
