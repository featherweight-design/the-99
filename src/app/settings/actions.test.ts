// Settings' Spares actions (menu and Home PR 3): each writes for the session's READER, maps a refused write to
// `invalid`, and revalidates `/settings` only after a write landed.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  revalidatePath: vi.fn(),
  setSpareMin: vi.fn(),
  keepCardBack: vi.fn(),
  releaseCard: vi.fn(),
  searchSpareCards: vi.fn(),
  writeFriendDeckPrefs: vi.fn(),
}));
vi.mock("../../lib/social/deck-visibility", () => ({ writeFriendDeckPrefs: m.writeFriendDeckPrefs }));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../../lib/social/spare-settings", () => ({
  setSpareMin: m.setSpareMin, keepCardBack: m.keepCardBack, releaseCard: m.releaseCard, searchSpareCards: m.searchSpareCards,
}));

import { keepCardAction, releaseCardAction, searchSpareCardsAction, setFriendDeckPrefsAction, setSpareMinAction } from "./actions";

const CARD = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_me");
});

describe("spares", () => {
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

  it("searches the reader's own spares", async () => {
    m.searchSpareCards.mockResolvedValue([{ oracleId: CARD, name: "Sol Ring", spare: 2 }]);
    expect(await searchSpareCardsAction("sol")).toEqual({ ok: true, hits: [{ oracleId: CARD, name: "Sol Ring", spare: 2 }] });
    expect(m.searchSpareCards).toHaveBeenCalledWith("user_me", "sol");
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

// Your decks (friend decks G2): two booleans or `invalid`, /settings redrawn.
describe("setFriendDeckPrefsAction", () => {
  it("refuses anything but two booleans", async () => {
    for (const [a, b] of [["true", false], [true, null], [1, 0]] as const) {
      expect(await setFriendDeckPrefsAction(a, b)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(m.writeFriendDeckPrefs).not.toHaveBeenCalled();
  });

  it("writes the reader's own two rules and redraws /settings", async () => {
    expect(await setFriendDeckPrefsAction(false, true)).toEqual({ ok: true });
    expect(m.writeFriendDeckPrefs).toHaveBeenCalledWith("user_me", { seeDecks: false, seeUnfinished: true });
    expect(m.revalidatePath).toHaveBeenCalledWith("/settings");
  });
});
