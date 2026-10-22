// A friend's decks for the friend page's Decks tab (menu and Home PR 7, G4): the grant is the viewer's own friendship, a
// stranger reads nothing, and what comes back is a name, a commander, a status and a count: an id only with
// FRIEND_DECKS_ENABLED on for the owner, and never a list. And one friend's deck, read-only (friend decks G1).
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  resolveFriend: vi.fn(),
  listDecksWithStats: vi.fn(),
  resolveSwitchEnv: vi.fn(),
  loadDeckBuyRows: vi.fn(),
  getDeckDetail: vi.fn(),
  loadFriendDeckPrefs: vi.fn(),
  owned: vi.fn(),
}));
vi.mock("../../db", () => ({
  db: { selectDistinct: () => ({ from: () => ({ where: () => m.owned() }) }) },
}));
vi.mock("./deck-visibility", async (orig) => ({
  ...(await orig<typeof import("./deck-visibility")>()),
  loadFriendDeckPrefs: m.loadFriendDeckPrefs,
}));
vi.mock("../decks/availability-query", () => ({ loadDeckBuyRows: m.loadDeckBuyRows }));
vi.mock("./access", () => ({ resolveFriend: m.resolveFriend }));
vi.mock("../decks/read", () => ({ listDecksWithStats: m.listDecksWithStats, getDeckDetail: m.getDeckDetail }));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnv: m.resolveSwitchEnv }));

import { loadFriendDeck, loadFriendDecks } from "./decks";

const ON = { FRIEND: "env", SOCIAL_FRIENDS_ENABLED: "true", FRIEND_DECKS_ENABLED: "true" };
const DECK = "11111111-1111-4111-8111-111111111111";

const ROW = {
  id: "deck-secret-id", name: "Thopter Factory", commanderName: "Sai, Master Thopterist", partnerName: null,
  commanderColorIdentity: ["U"], commanderArtCropUri: "https://cards.example/sai.jpg", statusPill: "To buy",
  built: 99, ownedCount: 91, toBuyCount: 8, notes: "private note", folderName: "Shelf", lastPlayedAt: new Date(), bracket: { n: 3 },
};

beforeEach(() => {
  m.resolveFriend.mockReset().mockResolvedValue("user_friend");
  m.listDecksWithStats.mockReset().mockResolvedValue([ROW]);
  m.resolveSwitchEnv.mockReset().mockResolvedValue({ FRIEND: "env" });
  m.loadFriendDeckPrefs.mockReset();
  m.loadDeckBuyRows.mockReset().mockResolvedValue([
    { deckId: "deck-secret-id", oracleId: "a", quantity: 5 },
    { deckId: "deck-secret-id", oracleId: "b", quantity: 3 },
    { deckId: "another-deck", oracleId: "a", quantity: 4 },
  ]);
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
      id: null, name: "Thopter Factory", commanderName: "Sai, Master Thopterist", partnerName: null, colorIdentity: ["U"],
      artCropUri: "https://cards.example/sai.jpg", status: "To buy", built: 99, bodySize: 99, toBuy: 8,
    });
    expect(JSON.stringify(deck)).not.toMatch(/deck-secret-id|private note|Shelf/);
  });

  it("counts a pair against 98", async () => {
    m.listDecksWithStats.mockResolvedValue([{ ...ROW, partnerName: "Tymna" }]);
    const [deck] = (await loadFriendDecks("user_viewer", "x"))!;
    expect([deck.bodySize, deck.partnerName]).toEqual([98, "Tymna"]);
  });

  // A fully owned junior deck whose copies senior decks hold reads To buy with toBuyCount 0: the figure is what the
  // friend's Shopping buys for it, under the friend's switches, as their own tile draws it.
  it("counts To buy from the friend's Shopping rows, not toBuyCount (seniority, no basics)", async () => {
    m.listDecksWithStats.mockResolvedValue([{ ...ROW, toBuyCount: 0 }, { ...ROW, id: "owned-deck", statusPill: "Complete", toBuyCount: 0 }]);
    const decks = (await loadFriendDecks("user_viewer", "x"))!;
    expect(decks.map((d) => d.toBuy)).toEqual([8, 0]);
    expect(m.loadDeckBuyRows).toHaveBeenCalledWith("user_friend", undefined, undefined, { FRIEND: "env" });
  });

  it("returns nothing when the friendship ends while the decks are read", async () => {
    m.resolveFriend.mockResolvedValueOnce("user_friend").mockResolvedValueOnce(null);
    expect(await loadFriendDecks("user_viewer", "x")).toBeNull();
  });
});

describe("loadFriendDecks with FRIEND_DECKS_ENABLED on for the owner", () => {
  beforeEach(() => {
    m.resolveSwitchEnv.mockResolvedValue(ON);
    m.loadFriendDeckPrefs.mockResolvedValue({ seeDecks: true, seeUnfinished: false });
  });

  it("carries each deck's id, for the press to its page", async () => {
    const [deck] = (await loadFriendDecks("user_viewer", "x"))!;
    expect(deck.id).toBe("deck-secret-id");
    expect(m.loadFriendDeckPrefs).toHaveBeenCalledWith("user_friend");
  });

  it("keeps only the decks the owner's rules let friends see", async () => {
    m.listDecksWithStats.mockResolvedValue([
      { ...ROW, id: "shown", statusPill: "Complete" },
      { ...ROW, id: "hidden", statusPill: "Complete", hiddenFromFriends: true },
      { ...ROW, id: "draft", statusPill: "Draft" },
      { ...ROW, id: "new", statusPill: "New" },
      { ...ROW, id: "building", statusPill: "Building" },
      { ...ROW, id: "unresolved", statusPill: "Unresolved" },
    ]);
    expect((await loadFriendDecks("user_viewer", "x"))!.map((d) => d.id)).toEqual(["shown", "unresolved"]);
    m.loadFriendDeckPrefs.mockResolvedValue({ seeDecks: true, seeUnfinished: true });
    expect((await loadFriendDecks("user_viewer", "x"))!.map((d) => d.id)).toEqual(["shown", "draft", "new", "building", "unresolved"]);
    m.loadFriendDeckPrefs.mockResolvedValue({ seeDecks: false, seeUnfinished: true });
    expect(await loadFriendDecks("user_viewer", "x")).toEqual([]);
  });

  it("with the switch off for the owner keeps every deck and reads no rules, as the tab shipped", async () => {
    m.resolveSwitchEnv.mockResolvedValue({ FRIEND: "env", SOCIAL_FRIENDS_ENABLED: "true" });
    m.listDecksWithStats.mockResolvedValue([{ ...ROW, statusPill: "Draft", hiddenFromFriends: true }]);
    expect(await loadFriendDecks("user_viewer", "x")).toHaveLength(1);
    expect(m.loadFriendDeckPrefs).not.toHaveBeenCalled();
  });
});

const COMMANDER = {
  oracleId: "c0", name: "Sai, Master Thopterist", colorIdentity: ["U"], manaCost: "{2}{U}", typeLine: "Legendary Creature — Human Artificer",
  oracleText: "secret oracle", imageUri: "https://img/sai.jpg", artCropUri: "https://crop/sai.jpg", printedName: null, layout: "normal", proxied: true,
};
const CARD = {
  oracleId: "a", name: "Sol Ring", typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp", cmc: 1, quantity: 1,
  manaCost: "{1}", imageUri: "https://img/sol.jpg", printedName: null, printedSetCode: "cmm", printedCollectorNumber: "1",
  layout: "normal", owned: true, auto: true, proxied: true, locked: true, price: { cents: 199 }, availability: { kind: "free" },
  comboPartner: { oracleId: "z", name: "Z" }, facts: ["game-changer"],
};
const DETAIL = { id: DECK, name: "Thopter Factory", commander: COMMANDER, partner: null, cards: [CARD, { ...CARD, oracleId: "b", name: "Island", owned: true }], built: 99 };

describe("loadFriendDeck", () => {
  beforeEach(() => {
    m.resolveSwitchEnv.mockResolvedValue(ON);
    m.loadFriendDeckPrefs.mockResolvedValue({ seeDecks: true, seeUnfinished: false });
    m.listDecksWithStats.mockResolvedValue([{ ...ROW, id: DECK, statusPill: "Complete" }]);
    m.getDeckDetail.mockReset().mockResolvedValue(DETAIL);
    m.owned.mockReset().mockResolvedValue([{ oracleId: "b" }, { oracleId: "c0" }]);
  });

  it("reads nothing for a deck id that is not a uuid, or a public id that is not the viewer's friend", async () => {
    expect(await loadFriendDeck("user_viewer", "x", "not-a-uuid")).toBeNull();
    expect(m.resolveFriend).not.toHaveBeenCalled();
    m.resolveFriend.mockResolvedValue(null);
    expect(await loadFriendDeck("user_viewer", "x", DECK)).toBeNull();
    expect(m.listDecksWithStats).not.toHaveBeenCalled();
  });

  it("is null with the switch off for the owner, whatever the viewer's switches", async () => {
    m.resolveSwitchEnv.mockResolvedValue({ SOCIAL_FRIENDS_ENABLED: "true" });
    expect(await loadFriendDeck("user_viewer", "x", DECK)).toBeNull();
    expect(m.getDeckDetail).not.toHaveBeenCalled();
  });

  it("is null for a deck the tab would not show: hidden, unfinished, decks off, or not theirs", async () => {
    for (const row of [{ ...ROW, id: DECK, statusPill: "Complete", hiddenFromFriends: true }, { ...ROW, id: DECK, statusPill: "Draft" }, { ...ROW, statusPill: "Complete" }]) {
      m.listDecksWithStats.mockResolvedValue([row]);
      expect(await loadFriendDeck("user_viewer", "x", DECK)).toBeNull();
    }
    m.listDecksWithStats.mockResolvedValue([{ ...ROW, id: DECK, statusPill: "Complete" }]);
    m.loadFriendDeckPrefs.mockResolvedValue({ seeDecks: false, seeUnfinished: true });
    expect(await loadFriendDeck("user_viewer", "x", DECK)).toBeNull();
    expect(m.getDeckDetail).not.toHaveBeenCalled();
  });

  it("reads the deck as its owner with no availability read, under the owner's switches", async () => {
    await loadFriendDeck("user_viewer", "x", DECK);
    const [deckId, owner, shared, env] = m.getDeckDetail.mock.calls[0];
    expect([deckId, owner, env]).toEqual([DECK, "user_friend", ON]);
    expect(await shared).toBeNull();
  });

  it("marks the VIEWER's ownership and cuts every card to the catalog and the owner's printing", async () => {
    const page = (await loadFriendDeck("user_viewer", "x", DECK))!;
    expect(page.cards.map((c) => [c.oracleId, c.owned])).toEqual([["a", false], ["b", true]]);
    expect(page.commanders).toEqual([expect.objectContaining({ oracleId: "c0", name: "Sai, Master Thopterist", commander: true, owned: true })]);
    expect(page.cards[0]).toEqual(expect.objectContaining({ printedSetCode: "cmm", printedCollectorNumber: "1" }));
    expect(JSON.stringify(page)).not.toMatch(/"(price|availability|proxied|locked|auto|comboPartner|facts|oracleText)"|secret oracle/);
    expect([page.built, page.bodySize, page.artCropUri]).toEqual([99, 99, "https://cards.example/sai.jpg"]);
  });

  it("returns nothing when the friendship ends while the deck is read", async () => {
    m.resolveFriend.mockResolvedValueOnce("user_friend").mockResolvedValueOnce(null);
    expect(await loadFriendDeck("user_viewer", "x", DECK)).toBeNull();
  });
});
