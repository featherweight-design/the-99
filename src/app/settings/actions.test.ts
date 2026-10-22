// Settings' Spares actions (menu and Home PR 3): each decides SOCIAL_FRIENDS_ENABLED for the READER and refuses as
// `off` without writing, maps a refused write to `invalid`, and revalidates `/settings` only after a write landed.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  revalidatePath: vi.fn(),
  setSpareMin: vi.fn(),
  keepCardBack: vi.fn(),
  releaseCard: vi.fn(),
  searchSpareCards: vi.fn(),
  writeFriendDeckPrefs: vi.fn(),
}));
vi.mock("../../lib/social/deck-visibility", () => ({ writeFriendDeckPrefs: m.writeFriendDeckPrefs }));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../../lib/social/spare-settings", () => ({
  setSpareMin: m.setSpareMin, keepCardBack: m.keepCardBack, releaseCard: m.releaseCard, searchSpareCards: m.searchSpareCards,
}));

import { keepCardAction, releaseCardAction, searchSpareCardsAction, setFriendDeckPrefsAction, setSpareMinAction } from "./actions";

const ON = { SOCIAL_FRIENDS_ENABLED: "true" };
const CARD = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_me");
  m.requestSwitchEnv.mockResolvedValue(ON);
});

describe("off for the reader", () => {
  beforeEach(() => m.requestSwitchEnv.mockResolvedValue({}));

  it("refuses every action and writes nothing", async () => {
    expect(await setSpareMinAction(3)).toEqual({ ok: false, reason: "off" });
    expect(await keepCardAction(CARD)).toEqual({ ok: false, reason: "off" });
    expect(await releaseCardAction(CARD)).toEqual({ ok: false, reason: "off" });
    expect(await searchSpareCardsAction("sol")).toEqual({ ok: false, reason: "off" });
    for (const f of [m.setSpareMin, m.keepCardBack, m.releaseCard, m.searchSpareCards, m.revalidatePath]) expect(f).not.toHaveBeenCalled();
  });

  it("decides the switch for the session's reader", async () => {
    await setSpareMinAction(3);
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("user_me");
  });
});

describe("on", () => {
  it("sets the threshold for the reader and revalidates Settings", async () => {
    m.setSpareMin.mockResolvedValue(true);
    expect(await setSpareMinAction(3)).toEqual({ ok: true });
    expect(m.setSpareMin).toHaveBeenCalledWith("user_me", 3);
    expect(m.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("answers a refused value as invalid, revalidating nothing", async () => {
    m.setSpareMin.mockResolvedValue(false);
    expect(await setSpareMinAction(10)).toEqual({ ok: false, reason: "invalid" });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("keeps and releases a card for the reader", async () => {
    m.keepCardBack.mockResolvedValue(true);
    m.releaseCard.mockResolvedValue(true);
    expect(await keepCardAction(CARD)).toEqual({ ok: true });
    expect(await releaseCardAction(CARD)).toEqual({ ok: true });
    expect(m.keepCardBack).toHaveBeenCalledWith("user_me", CARD);
    expect(m.releaseCard).toHaveBeenCalledWith("user_me", CARD);
    expect(m.revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("answers a card the catalog does not hold as invalid", async () => {
    m.keepCardBack.mockResolvedValue(false);
    expect(await keepCardAction("nope")).toEqual({ ok: false, reason: "invalid" });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("searches the reader's own spares under the reader's switches", async () => {
    m.searchSpareCards.mockResolvedValue([{ oracleId: CARD, name: "Sol Ring", spare: 2 }]);
    expect(await searchSpareCardsAction("sol")).toEqual({ ok: true, hits: [{ oracleId: CARD, name: "Sol Ring", spare: 2 }] });
    expect(m.searchSpareCards).toHaveBeenCalledWith("user_me", "sol", ON);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

// Your decks (friend decks G2): FRIEND_DECKS_ENABLED decided for the reader, two booleans or `invalid`, /settings redrawn.
describe("setFriendDeckPrefsAction", () => {
  const FRIEND_DECKS = { SOCIAL_FRIENDS_ENABLED: "true", FRIEND_DECKS_ENABLED: "true" };

  it("refuses as off with Friend decks off for the reader, Friends on or not, and writes nothing", async () => {
    for (const env of [ON, { FRIEND_DECKS_ENABLED: "true" }]) {
      m.requestSwitchEnv.mockResolvedValue(env);
      expect(await setFriendDeckPrefsAction(true, false)).toEqual({ ok: false, reason: "off" });
    }
    expect(m.writeFriendDeckPrefs).not.toHaveBeenCalled();
  });

  it("refuses anything but two booleans", async () => {
    m.requestSwitchEnv.mockResolvedValue(FRIEND_DECKS);
    for (const [a, b] of [["true", false], [true, null], [1, 0]] as const) {
      expect(await setFriendDeckPrefsAction(a, b)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(m.writeFriendDeckPrefs).not.toHaveBeenCalled();
  });

  it("writes the reader's own two rules and redraws /settings", async () => {
    m.requestSwitchEnv.mockResolvedValue(FRIEND_DECKS);
    expect(await setFriendDeckPrefsAction(false, true)).toEqual({ ok: true });
    expect(m.writeFriendDeckPrefs).toHaveBeenCalledWith("user_me", { seeDecks: false, seeUnfinished: true });
    expect(m.revalidatePath).toHaveBeenCalledWith("/settings");
  });
});
