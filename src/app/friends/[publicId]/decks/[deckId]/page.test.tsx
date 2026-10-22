// The friend's deck route (friend decks G1): not found unless FRIEND_DECKS_ENABLED is on for the VIEWER and both the
// friend and the deck read (the deck's own rules are the OWNER's, in `loadFriendDeck`).
import { describe, expect, it, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ requireUserId: vi.fn(), requestSwitchEnv: vi.fn(), loadFriend: vi.fn(), loadFriendDeck: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("../../../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../../../../lib/social/access", () => ({ loadFriend: m.loadFriend }));
vi.mock("../../../../../lib/social/decks", () => ({ loadFriendDeck: m.loadFriendDeck }));
vi.mock("../../../../../components/social/friend-deck-view", () => ({ FriendDeckView: () => null }));

import FriendDeckPage from "./page";

const PARAMS = { params: Promise.resolve({ publicId: "p1", deckId: "d1" }) };
const ON = { SOCIAL_FRIENDS_ENABLED: "true", FRIEND_DECKS_ENABLED: "true" };

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_me");
  m.requestSwitchEnv.mockResolvedValue(ON);
  m.loadFriend.mockResolvedValue({ publicId: "p1", displayName: "Colin", commander: null, since: new Date() });
  m.loadFriendDeck.mockResolvedValue({ id: "d1" });
});

describe("FriendDeckPage", () => {
  it("is not found with the switch or its parent off for the viewer, reading nothing", async () => {
    for (const env of [{}, { FRIEND_DECKS_ENABLED: "true" }, { SOCIAL_FRIENDS_ENABLED: "true" }]) {
      m.requestSwitchEnv.mockResolvedValue(env);
      await expect(FriendDeckPage(PARAMS)).rejects.toThrow("NOT_FOUND");
    }
    expect(m.loadFriendDeck).not.toHaveBeenCalled();
  });

  it("is not found when the friend or the deck does not read", async () => {
    m.loadFriendDeck.mockResolvedValue(null);
    await expect(FriendDeckPage(PARAMS)).rejects.toThrow("NOT_FOUND");
    m.loadFriendDeck.mockResolvedValue({ id: "d1" });
    m.loadFriend.mockResolvedValue(null);
    await expect(FriendDeckPage(PARAMS)).rejects.toThrow("NOT_FOUND");
  });

  it("reads the deck for the viewer, by the friend's public id and the deck id", async () => {
    await FriendDeckPage(PARAMS);
    expect(m.loadFriendDeck).toHaveBeenCalledWith("user_me", "p1", "d1");
  });
});
