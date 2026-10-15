// The wishlist's actions (Social R2 PR 3): each decides the switch for the READER and refuses as `off` without
// writing, and each maps its library result to an outcome the screen draws, so a refusal never reads as done.
// A component test mocks these away, so a write that skipped the gate or a mapping would pass everywhere else.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  revalidatePath: vi.fn(),
  after: vi.fn(),
  wantOneMore: vi.fn(),
  setWishlistQuantity: vi.fn(),
  clearWishlistLine: vi.fn(),
  dismissCollected: vi.fn(),
  searchCollectionCatalog: vi.fn(),
  loadWishlist: vi.fn(),
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("../../../lib/wishlist/wishlist", () => ({
  wantOneMore: m.wantOneMore, setWishlistQuantity: m.setWishlistQuantity, clearWishlistLine: m.clearWishlistLine,
  loadWishlist: m.loadWishlist,
}));
vi.mock("../../../lib/collection/catalog-read", () => ({ searchCollectionCatalog: m.searchCollectionCatalog }));
vi.mock("../../../lib/wishlist/collected", () => ({ dismissCollected: m.dismissCollected, MAX_COLLECTED_NOTICES: 200 }));

import * as actions from "./actions";

const ON = { SOCIAL_WISHLIST_ENABLED: "true" };
const CARD = "11111111-1111-4111-8111-111111111111";
const AT = "2026-10-15T12:34:56.789Z";

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_1");
  m.requestSwitchEnv.mockResolvedValue(ON);
  m.after.mockImplementation((fn: () => void) => fn());
});

describe("the switch", () => {
  // Every action, called with arguments that would write if the gate were missing.
  const calls: [string, () => Promise<unknown>][] = [
    ["addToWishlistAction", () => actions.addToWishlistAction(CARD)],
    ["setWishlistWantAction", () => actions.setWishlistWantAction(CARD, 3)],
    ["removeFromWishlistAction", () => actions.removeFromWishlistAction(CARD)],
    ["dismissCollectedAction", () => actions.dismissCollectedAction([{ oracleId: CARD, collectedAt: AT }])],
    ["searchWishlistCardsAction", () => actions.searchWishlistCardsAction("sol")],
  ];

  it("covers every exported action", () => {
    const exported = Object.entries(actions).filter(([, v]) => typeof v === "function").map(([k]) => k).sort();
    expect(calls.map(([name]) => name).sort()).toEqual(exported);
  });

  it.each(calls)("%s refuses as off and writes nothing while it is off for the reader", async (_n, call) => {
    m.requestSwitchEnv.mockResolvedValue({});
    expect(await call()).toEqual({ ok: false, reason: "off" });
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("user_1");
    for (const [key, fn] of Object.entries(m)) {
      if (["requireUserId", "requestSwitchEnv"].includes(key)) continue;
      expect(fn, key).not.toHaveBeenCalled();
    }
  });

  it("refuses a signed-out caller before anything else", async () => {
    m.requireUserId.mockRejectedValue(new Error("unauthenticated"));
    await expect(actions.addToWishlistAction(CARD)).rejects.toThrow("unauthenticated");
    expect(m.wantOneMore).not.toHaveBeenCalled();
  });
});

describe("wanting a card", () => {
  it("adds one more than held, by the session's id, and defers the tab's revalidation", async () => {
    m.wantOneMore.mockResolvedValue({ status: "wanted", quantity: 3, held: 2 });
    expect(await actions.addToWishlistAction(CARD)).toEqual({ ok: true, status: "wanted", want: 3, have: 2 });
    expect(m.wantOneMore).toHaveBeenCalledWith("user_1", CARD);
    expect(m.after).toHaveBeenCalledTimes(1);
    expect(m.revalidatePath).toHaveBeenCalledWith("/collection/wishlist");
  });

  it("passes held through, never as wanted", async () => {
    m.setWishlistQuantity.mockResolvedValue({ status: "held", quantity: 2, held: 4 });
    expect(await actions.setWishlistWantAction(CARD, 2)).toEqual({ ok: true, status: "held", want: 2, have: 4 });
    expect(m.setWishlistQuantity).toHaveBeenCalledWith("user_1", CARD, 2);
  });

  it("refuses what the library refuses, and revalidates nothing", async () => {
    m.wantOneMore.mockResolvedValue(null);
    m.setWishlistQuantity.mockResolvedValue(null);
    expect(await actions.addToWishlistAction("nope")).toEqual({ ok: false, reason: "invalid" });
    expect(await actions.setWishlistWantAction(CARD, 0)).toEqual({ ok: false, reason: "invalid" });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("hands the stepper's count on as sent, so a missing count is the library's to refuse, never a 1", async () => {
    m.setWishlistQuantity.mockResolvedValue(null);
    expect(await actions.setWishlistWantAction(CARD, undefined)).toEqual({ ok: false, reason: "invalid" });
    expect(m.setWishlistQuantity).toHaveBeenCalledWith("user_1", CARD, undefined);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("removing a card", () => {
  it("reads a card already gone as done, and revalidates only a real removal", async () => {
    m.clearWishlistLine.mockResolvedValue(false);
    expect(await actions.removeFromWishlistAction(CARD)).toEqual({ ok: true, removed: false });
    expect(m.revalidatePath).not.toHaveBeenCalled();
    m.clearWishlistLine.mockResolvedValue(true);
    expect(await actions.removeFromWishlistAction(CARD)).toEqual({ ok: true, removed: true });
    expect(m.revalidatePath).toHaveBeenCalledWith("/collection/wishlist");
  });

  it("refuses a malformed id before any write", async () => {
    expect(await actions.removeFromWishlistAction([CARD])).toEqual({ ok: false, reason: "invalid" });
    expect(m.clearWishlistLine).not.toHaveBeenCalled();
  });
});

describe("dismissing the collected strip", () => {
  it("forgets exactly the notices sent back, as dates", async () => {
    m.dismissCollected.mockResolvedValue(1);
    expect(await actions.dismissCollectedAction([{ oracleId: CARD, collectedAt: AT }])).toEqual({ ok: true, dismissed: 1 });
    expect(m.dismissCollected).toHaveBeenCalledWith("user_1", [{ oracleId: CARD, collectedAt: new Date(AT) }]);
  });

  it.each([
    ["not a list", CARD],
    ["an empty list", []],
    ["a malformed id", [{ oracleId: "x", collectedAt: AT }]],
    ["a date that is not a string", [{ oracleId: CARD, collectedAt: 0 }]],
    ["a date that does not parse", [{ oracleId: CARD, collectedAt: "never" }]],
    ["a null entry", [null]],
    ["more than one strip can name", Array.from({ length: 201 }, () => ({ oracleId: CARD, collectedAt: AT }))],
  ])("refuses %s, whole, before any write", async (_n, shown) => {
    expect(await actions.dismissCollectedAction(shown)).toEqual({ ok: false, reason: "invalid" });
    expect(m.dismissCollected).not.toHaveBeenCalled();
  });
});

describe("searching for a card to want", () => {
  const OTHER = "22222222-2222-4222-8222-222222222222";
  const hit = (oracleId: string, name: string, owned: number) => ({
    oracleId, name, typeLine: "Artifact", imageUri: `https://img/${name}`, manaCost: null, flavorName: null, owned,
  });

  it("maps each catalog hit to the row's shape, with the want of a card already on the list", async () => {
    m.searchCollectionCatalog.mockResolvedValue([hit(CARD, "Sol Ring", 2), hit(OTHER, "Sol Talisman", 0)]);
    m.loadWishlist.mockResolvedValue([{ oracleId: CARD, quantity: 4, owned: 2, addedAt: new Date(AT) }]);
    expect(await actions.searchWishlistCardsAction("sol")).toEqual({
      ok: true,
      results: [
        { oracleId: CARD, name: "Sol Ring", imageUri: "https://img/Sol Ring", owned: 2, want: 4 },
        { oracleId: OTHER, name: "Sol Talisman", imageUri: "https://img/Sol Talisman", owned: 0, want: null },
      ],
    });
    expect(m.searchCollectionCatalog).toHaveBeenCalledWith("user_1", "sol");
    expect(m.loadWishlist).toHaveBeenCalledWith("user_1");
    expect(m.after).not.toHaveBeenCalled();
  });

  it("refuses a query that is not a string, or is too long, before reading anything", async () => {
    for (const q of [42, null, "x".repeat(101)]) {
      expect(await actions.searchWishlistCardsAction(q)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(m.searchCollectionCatalog).not.toHaveBeenCalled();
  });
});
