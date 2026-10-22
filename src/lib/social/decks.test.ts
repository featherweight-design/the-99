// A friend's decks for the friend page's Decks tab (menu and Home PR 7, G4): the grant is the viewer's own friendship, a
// stranger reads nothing, and what comes back is a name, a commander, a status and a count: never an id and never a list.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  resolveFriend: vi.fn(),
  listDecksWithStats: vi.fn(),
  resolveSwitchEnv: vi.fn(),
}));
vi.mock("./access", () => ({ resolveFriend: m.resolveFriend }));
vi.mock("../decks/read", () => ({ listDecksWithStats: m.listDecksWithStats }));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnv: m.resolveSwitchEnv }));

import { loadFriendDecks } from "./decks";

const ROW = {
  id: "deck-secret-id", name: "Thopter Factory", commanderName: "Sai, Master Thopterist", partnerName: null,
  commanderColorIdentity: ["U"], commanderArtCropUri: "https://cards.example/sai.jpg", statusPill: "To buy",
  built: 99, ownedCount: 91, toBuyCount: 8, notes: "private note", folderName: "Shelf", lastPlayedAt: new Date(), bracket: { n: 3 },
};

beforeEach(() => {
  m.resolveFriend.mockReset().mockResolvedValue("user_friend");
  m.listDecksWithStats.mockReset().mockResolvedValue([ROW]);
  m.resolveSwitchEnv.mockReset().mockResolvedValue({ FRIEND: "env" });
});

describe("loadFriendDecks", () => {
  it("reads nothing for a public id that is not the viewer's current friend", async () => {
    m.resolveFriend.mockResolvedValue(null);
    expect(await loadFriendDecks("user_viewer", "00000000-0000-4000-8000-000000000002")).toBeNull();
    expect(m.listDecksWithStats).not.toHaveBeenCalled();
  });

  it("reads the FRIEND's decks under the friend's own switches, newest first", async () => {
    await loadFriendDecks("user_viewer", "00000000-0000-4000-8000-000000000002");
    expect(m.resolveFriend).toHaveBeenCalledWith("user_viewer", "00000000-0000-4000-8000-000000000002");
    expect(m.listDecksWithStats).toHaveBeenCalledWith("user_friend", "newest", expect.objectContaining({ env: { FRIEND: "env" }, includeProxyStats: true }));
  });

  it("returns name, commander, status and count, and nothing else of a deck", async () => {
    const [deck] = (await loadFriendDecks("user_viewer", "x"))!;
    expect(deck).toEqual({
      name: "Thopter Factory", commanderName: "Sai, Master Thopterist", partnerName: null, colorIdentity: ["U"],
      artCropUri: "https://cards.example/sai.jpg", status: "To buy", built: 99, bodySize: 99, toBuy: 8,
    });
    expect(JSON.stringify(deck)).not.toMatch(/deck-secret-id|private note|Shelf/);
  });

  it("counts a pair against 98, and never reads a negative to-buy", async () => {
    m.listDecksWithStats.mockResolvedValue([{ ...ROW, partnerName: "Tymna", toBuyCount: -2 }]);
    const [deck] = (await loadFriendDecks("user_viewer", "x"))!;
    expect([deck.bodySize, deck.partnerName, deck.toBuy]).toEqual([98, "Tymna", 0]);
  });
});
