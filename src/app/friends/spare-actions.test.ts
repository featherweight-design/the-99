// Spare requests' actions (PR 3a): each takes the reader from the session and their OWN resolved switches, hands the
// raw client input to the library (which re-validates it), and revalidates `/friends` only for a ✕ or an answer that
// landed. A component test mocks these away, so a write that skipped the reader or the revalidation would pass
// everywhere else.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  revalidatePath: vi.fn(),
  after: vi.fn(),
  askForSpare: vi.fn(),
  askInsteadForSpare: vi.fn(),
  closeSpareRequest: vi.fn(),
  answerSpareRequest: vi.fn(),
  markAnswerSeen: vi.fn(),
  loadAnsweredRequest: vi.fn(),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
// `after` runs its callback after the response; here at once, but recorded, so a test can tell deferred from inline.
vi.mock("next/server", () => ({ after: (fn: () => void) => { m.after(); fn(); } }));
vi.mock("../../lib/social/spare-requests", () => ({
  askForSpare: m.askForSpare, askInsteadForSpare: m.askInsteadForSpare,
  closeSpareRequest: m.closeSpareRequest, answerSpareRequest: m.answerSpareRequest, markAnswerSeen: m.markAnswerSeen,
}));
vi.mock("../../lib/social/your-requests", () => ({ loadAnsweredRequest: m.loadAnsweredRequest }));

import { answerSpareAction, askInsteadAction, askSpareAction, closeSpareAction, openAnswerAction } from "./spare-actions";

// The reader's resolved switches, a sentinel compared by identity: the actions hand it on, and read no switch of their own.
const ENV = { SENTINEL: "reader" };
const FRIEND = "22222222-2222-4222-8222-222222222222";
const CARD = "33333333-3333-4333-8333-333333333333";
const REQ = "44444444-4444-4444-8444-444444444444";
const DECK = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_1");
  m.requestSwitchEnv.mockResolvedValue(ENV);
});

describe("askSpareAction", () => {
  it("asks as the session's reader, under that reader's switches, passing the copies and deck on for the library to check", async () => {
    m.askForSpare.mockResolvedValue({ ok: true, id: REQ });
    expect(await askSpareAction({ friendPublicId: FRIEND, oracleId: CARD, copies: 2, deckId: DECK })).toEqual({ ok: true, id: REQ });
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("user_1");
    expect(m.askForSpare).toHaveBeenCalledWith("user_1", FRIEND, CARD, ENV, expect.any(Date), { copies: 2, deckId: DECK });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("passes a Spares tab ask's standalone mark on", async () => {
    m.askForSpare.mockResolvedValue({ ok: true, id: REQ });
    await askSpareAction({ friendPublicId: FRIEND, oracleId: CARD, deckId: null, standalone: true });
    expect(m.askForSpare).toHaveBeenCalledWith("user_1", FRIEND, CARD, ENV, expect.any(Date), expect.objectContaining({ standalone: true }));
  });

  it("hands a malformed input on as missing fields, so the library refuses it", async () => {
    m.askForSpare.mockResolvedValue({ ok: false, reason: "not-spare" });
    expect(await askSpareAction(null as never)).toEqual({ ok: false, reason: "not-spare" });
    expect(m.askForSpare).toHaveBeenCalledWith("user_1", undefined, undefined, ENV, expect.any(Date), { copies: undefined, deckId: undefined });
  });

  it("passes a refusal through, never as done", async () => {
    m.askForSpare.mockResolvedValue({ ok: false, reason: "not-friend" });
    expect(await askSpareAction({ friendPublicId: FRIEND, oracleId: CARD })).toEqual({ ok: false, reason: "not-friend" });
  });
});

describe("askInsteadAction", () => {
  it("withdraws and asks as the session's reader in one library call", async () => {
    m.askInsteadForSpare.mockResolvedValue({ ok: false, reason: "gone" });
    expect(await askInsteadAction({ fromRequestId: REQ, friendPublicId: FRIEND, oracleId: CARD, copies: 1 })).toEqual({ ok: false, reason: "gone" });
    expect(m.askInsteadForSpare).toHaveBeenCalledWith("user_1", REQ, FRIEND, CARD, ENV, expect.any(Date), { copies: 1, deckId: undefined });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("closeSpareAction and answerSpareAction", () => {
  it("revalidate /friends, and only /friends, when they land", async () => {
    m.closeSpareRequest.mockResolvedValue({ ok: true, closed: "withdrawn" });
    expect(await closeSpareAction(REQ)).toEqual({ ok: true, closed: "withdrawn" });
    expect(m.closeSpareRequest).toHaveBeenCalledWith("user_1", REQ, ENV);
    m.answerSpareRequest.mockResolvedValue({ ok: true });
    expect(await answerSpareAction(REQ, "yes")).toEqual({ ok: true });
    expect(m.answerSpareRequest).toHaveBeenCalledWith("user_1", REQ, "yes", ENV);
    expect(m.revalidatePath.mock.calls).toEqual([["/friends"], ["/friends"]]);
  });

  it("revalidate nothing when refused", async () => {
    m.closeSpareRequest.mockResolvedValue({ ok: false, reason: "gone" });
    m.answerSpareRequest.mockResolvedValue({ ok: false, reason: "gone" });
    expect(await closeSpareAction(REQ)).toEqual({ ok: false, reason: "gone" });
    expect(await answerSpareAction(REQ, "no")).toEqual({ ok: false, reason: "gone" });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("openAnswerAction (small items item 3)", () => {
  const KEY = "item:66666666-6666-4666-8666-666666666666";
  it("opens the reader's own answer by its Home key, marks it seen, and revalidates /friends alone", async () => {
    m.loadAnsweredRequest.mockResolvedValue({ id: REQ, unseen: true, state: "yes" });
    m.markAnswerSeen.mockResolvedValue(true);
    const out = await openAnswerAction(KEY);
    expect(m.loadAnsweredRequest).toHaveBeenCalledWith("user_1", KEY, ENV, expect.any(Date));
    expect(m.markAnswerSeen).toHaveBeenCalledWith("user_1", REQ, ENV, expect.any(Date));
    expect(m.revalidatePath.mock.calls).toEqual([["/friends"]]);
    // After the response, so Home (where it was pressed) is not redrawn with the visit's moved cursor.
    expect(m.after).toHaveBeenCalledTimes(1);
    // The Friends badge counted it (unseen by its cursor too), so the shell drops it by one.
    expect(out).toEqual({ ok: true, request: { id: REQ, unseen: false, state: "yes" }, counted: true });
  });

  it("marks an answer the Friends cursor already covers (Home reads its own), revalidating only on a write", async () => {
    m.loadAnsweredRequest.mockResolvedValueOnce({ id: REQ, unseen: false, state: "no" });
    m.markAnswerSeen.mockResolvedValueOnce(false);
    expect(await openAnswerAction(KEY)).toEqual({ ok: true, request: { id: REQ, unseen: false, state: "no" }, counted: false });
    expect(m.markAnswerSeen).toHaveBeenCalledWith("user_1", REQ, ENV, expect.any(Date));
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a key that names none of the reader's, writing nothing", async () => {
    m.loadAnsweredRequest.mockResolvedValueOnce(null);
    expect(await openAnswerAction(KEY)).toEqual({ ok: false });
    expect(m.markAnswerSeen).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
