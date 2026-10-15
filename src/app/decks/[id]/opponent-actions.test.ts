// Each picker action decides the switch for the READER, and answers empty rather than reading when it is off.
// A component test mocks these away, so a read that skipped the check would pass everywhere else.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserId, searchOpponentCommanders, listFriendDecks, listPodSeats, requestSwitchEnv } = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  searchOpponentCommanders: vi.fn(),
  listFriendDecks: vi.fn(),
  listPodSeats: vi.fn(),
  requestSwitchEnv: vi.fn(),
}));
vi.mock("../../../lib/auth", () => ({ requireUserId }));
vi.mock("../../../lib/decks/opponent-commanders", () => ({ searchOpponentCommanders }));
vi.mock("../../../lib/social/games", () => ({ listFriendDecks, listPodSeats }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv }));

import { listFriendDecksAction, listPodSeatsAction, searchOpponentCommandersAction } from "./opponent-actions";

const ON = { SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_GAMES_ENABLED: "true" };

beforeEach(() => {
  vi.resetAllMocks();
  requireUserId.mockResolvedValue("user_1");
  searchOpponentCommanders.mockResolvedValue([{ oracleId: "y" }]);
  listFriendDecks.mockResolvedValue([{ deckId: "d" }]);
  listPodSeats.mockResolvedValue([{ publicId: "p" }]);
});

describe("the opponent picker's actions", () => {
  it("read for a reader whose switch is on, as that reader", async () => {
    requestSwitchEnv.mockResolvedValue(ON);
    expect(await searchOpponentCommandersAction("yur")).toEqual([{ oracleId: "y" }]);
    expect(await listFriendDecksAction("f")).toEqual([{ deckId: "d" }]);
    expect(await listPodSeatsAction("p")).toEqual([{ publicId: "p" }]);
    expect(requestSwitchEnv).toHaveBeenCalledWith("user_1");
    expect(listFriendDecks).toHaveBeenCalledWith("user_1", "f");
    expect(listPodSeats).toHaveBeenCalledWith("user_1", "p");
  });

  it("answer empty and read nothing while the switch is off", async () => {
    requestSwitchEnv.mockResolvedValue({});
    expect(await searchOpponentCommandersAction("yur")).toEqual([]);
    expect(await listFriendDecksAction("f")).toEqual([]);
    expect(await listPodSeatsAction("p")).toEqual([]);
    expect(searchOpponentCommanders).not.toHaveBeenCalled();
    expect(listFriendDecks).not.toHaveBeenCalled();
    expect(listPodSeats).not.toHaveBeenCalled();
  });

  it("do not raise a child switch past its parent", async () => {
    requestSwitchEnv.mockResolvedValue({ SOCIAL_GAMES_ENABLED: "true" });
    expect(await listFriendDecksAction("f")).toEqual([]);
    expect(listFriendDecks).not.toHaveBeenCalled();
  });
});
