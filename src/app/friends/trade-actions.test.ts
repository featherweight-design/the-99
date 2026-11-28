// Friend trades' actions (PR 4): each takes the reader from the session, refuses malformed input before any read,
// rate-limits only what tells the friend (propose, counter), and revalidates `/friends` after the response only for a
// press that landed. A component test mocks these away, so a press that skipped any of that would pass everywhere else.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestFlags: vi.fn(),
  readerStoreForPage: vi.fn(),
  enforceHit: vi.fn(),
  revalidatePath: vi.fn(),
  after: vi.fn(),
  proposeTrade: vi.fn(),
  counterTrade: vi.fn(),
  reviseTrade: vi.fn(),
  answerTrade: vi.fn(),
  withdrawTrade: vi.fn(),
  rescindTrade: vi.fn(),
  markTraded: vi.fn(),
  clearTrade: vi.fn(),
  loadTrade: vi.fn(),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/flags/request", () => ({ requestFlags: m.requestFlags }));
vi.mock("../../lib/stores/preference", () => ({ readerStoreForPage: m.readerStoreForPage }));
vi.mock("../../lib/rate/observe", () => ({ enforceHit: async (...a: unknown[]) => (await m.enforceHit(...a)) ?? null }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
// `after` runs its callback after the response; here at once, but recorded, so a test can tell deferred from inline.
vi.mock("next/server", () => ({ after: (fn: () => void) => { m.after(); fn(); } }));
vi.mock("../../lib/social/trades", () => ({
  proposeTrade: m.proposeTrade, counterTrade: m.counterTrade, reviseTrade: m.reviseTrade, answerTrade: m.answerTrade,
  withdrawTrade: m.withdrawTrade, rescindTrade: m.rescindTrade, markTraded: m.markTraded, clearTrade: m.clearTrade,
}));
vi.mock("../../lib/social/trade-reads", () => ({ loadTrade: m.loadTrade }));

import {
  answerTradeAction, clearTradeAction, counterTradeAction, markTradedAction, openTradeAction, proposeTradeAction,
  rescindTradeAction, reviseTradeAction, withdrawTradeAction,
} from "./trade-actions";

const FRIEND = "22222222-2222-4222-8222-222222222222";
const A = "33333333-3333-4333-8333-333333333333";
const B = "44444444-4444-4444-8444-444444444444";
const T = "55555555-5555-4555-8555-555555555555";
const SEEN = "2026-11-26T09:30:00.123Z";
const SIDES = { theirs: [A], yours: [B] };

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_1");
  m.enforceHit.mockResolvedValue(null);
});

describe("proposeTradeAction", () => {
  it("proposes as the session's reader under the rate bucket, and revalidates after a landed offer", async () => {
    m.proposeTrade.mockResolvedValue({ ok: true, id: T });
    expect(await proposeTradeAction(FRIEND, SIDES)).toEqual({ ok: true, id: T });
    expect(m.enforceHit).toHaveBeenCalledWith("user_1", "trade-offer");
    expect(m.proposeTrade).toHaveBeenCalledWith("user_1", FRIEND, SIDES, null);
    expect(m.after).toHaveBeenCalledTimes(1);
    expect(m.revalidatePath).toHaveBeenCalledWith("/friends");
  });

  it("refuses malformed input before the bucket or any read", async () => {
    expect(await proposeTradeAction("nope", SIDES)).toEqual({ ok: false, reason: "not-friend" });
    expect(await proposeTradeAction(FRIEND, { theirs: [A], yours: [] })).toEqual({ ok: false, reason: "gone" });
    expect(await proposeTradeAction(FRIEND, SIDES, "bad")).toEqual({ ok: false, reason: "gone" });
    expect(m.enforceHit).not.toHaveBeenCalled();
    expect(m.proposeTrade).not.toHaveBeenCalled();
  });

  it("stops at the bucket, and never revalidates a refusal", async () => {
    m.enforceHit.mockResolvedValue(30);
    expect(await proposeTradeAction(FRIEND, SIDES)).toEqual({ ok: false, reason: "limited" });
    expect(m.proposeTrade).not.toHaveBeenCalled();
    m.enforceHit.mockResolvedValue(null);
    m.proposeTrade.mockResolvedValue({ ok: false, reason: "held" });
    expect(await proposeTradeAction(FRIEND, SIDES, T)).toEqual({ ok: false, reason: "held" });
    expect(m.proposeTrade).toHaveBeenCalledWith("user_1", FRIEND, SIDES, T);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("counterTradeAction", () => {
  it("passes the round and offered_at the reader saw, under the rate bucket", async () => {
    m.counterTrade.mockResolvedValue({ ok: true, round: 3 });
    expect(await counterTradeAction(T, 2, SEEN, SIDES)).toEqual({ ok: true, round: 3 });
    expect(m.counterTrade).toHaveBeenCalledWith("user_1", T, 2, SEEN, SIDES);
    expect(m.enforceHit).toHaveBeenCalledWith("user_1", "trade-offer");
    expect(m.revalidatePath).toHaveBeenCalledWith("/friends");
  });

  it("refuses a bad id or sides first, and stops at the bucket", async () => {
    expect(await counterTradeAction("x", 2, SEEN, SIDES)).toEqual({ ok: false, reason: "gone" });
    expect(await counterTradeAction(T, 2, SEEN, null)).toEqual({ ok: false, reason: "gone" });
    expect(await counterTradeAction(T, 0, SEEN, SIDES)).toEqual({ ok: false, reason: "gone" });
    expect(await counterTradeAction(T, 2, "not a time", SIDES)).toEqual({ ok: false, reason: "gone" });
    expect(m.enforceHit).not.toHaveBeenCalled();
    m.enforceHit.mockResolvedValue(10);
    expect(await counterTradeAction(T, 2, SEEN, SIDES)).toEqual({ ok: false, reason: "limited" });
    expect(m.counterTrade).not.toHaveBeenCalled();
  });
});

describe("the other presses", () => {
  it("take no rate bucket, hand the raw input to the library, and revalidate only a landed press", async () => {
    m.reviseTrade.mockResolvedValue({ ok: true });
    m.answerTrade.mockResolvedValue({ ok: true });
    m.withdrawTrade.mockResolvedValue({ ok: false, reason: "gone" });
    m.rescindTrade.mockResolvedValue({ ok: true });
    m.markTraded.mockResolvedValue({ ok: true });
    m.clearTrade.mockResolvedValue({ ok: true });
    await reviseTradeAction(T, 1, SEEN, SIDES);
    expect(m.reviseTrade).toHaveBeenCalledWith("user_1", T, 1, SEEN, SIDES);
    await answerTradeAction(T, 1, SEEN, "yes");
    expect(m.answerTrade).toHaveBeenCalledWith("user_1", T, 1, SEEN, "yes");
    expect(await withdrawTradeAction(T, 1)).toEqual({ ok: false, reason: "gone" });
    expect(m.withdrawTrade).toHaveBeenCalledWith("user_1", T, 1);
    await rescindTradeAction(T);
    await markTradedAction(T);
    await clearTradeAction(T);
    expect(m.rescindTrade).toHaveBeenCalledWith("user_1", T);
    expect(m.markTraded).toHaveBeenCalledWith("user_1", T);
    expect(m.clearTrade).toHaveBeenCalledWith("user_1", T);
    expect(m.enforceHit).not.toHaveBeenCalled();
    // Five landed, the withdraw did not.
    expect(m.revalidatePath).toHaveBeenCalledTimes(5);
  });

  it("refuse a malformed trade id before any read", async () => {
    for (const press of [() => reviseTradeAction("x", 1, SEEN, SIDES), () => answerTradeAction("x", 1, SEEN, "yes"), () => withdrawTradeAction("x", 1),
      () => rescindTradeAction("x"), () => markTradedAction("x"), () => clearTradeAction("x")]) {
      expect(await press()).toEqual({ ok: false, reason: "gone" });
    }
    expect(m.reviseTrade).not.toHaveBeenCalled();
    expect(m.answerTrade).not.toHaveBeenCalled();
    expect(m.clearTrade).not.toHaveBeenCalled();
  });
});

describe("openTradeAction", () => {
  it("loads the sheet as the reader, priced at the reader's own store", async () => {
    const ENV = { SENTINEL: "reader" };
    m.requestFlags.mockResolvedValue(ENV);
    m.readerStoreForPage.mockResolvedValue("tcgplayer");
    m.loadTrade.mockResolvedValue({ id: T });
    expect(await openTradeAction(T)).toEqual({ id: T });
    expect(m.readerStoreForPage).toHaveBeenCalledWith("user_1", ENV);
    expect(m.loadTrade).toHaveBeenCalledWith("user_1", T, "tcgplayer");
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("is null for a malformed id, with no read", async () => {
    expect(await openTradeAction("x")).toBeNull();
    expect(m.loadTrade).not.toHaveBeenCalled();
  });
});
