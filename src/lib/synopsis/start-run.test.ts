// `startRun` under the deck row's lock (found/notices-synopsis-stale-list-window): the list the
// write read must still be the live one when the reservation is made, or the write refuses with
// nothing reserved. The lock itself is a fact about two connections, and `probe:synopsis`'s race
// proves it; this proves the refusal comes before the charge.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listFingerprint } from "../profile/fingerprint";
import type { ProfileHead } from "../profile/load";

/** Each awaited select, in order: the locked deck row, then the stored reading. */
const queue: unknown[][] = [];
function chain() {
  const q: Record<string, unknown> = {};
  for (const m of ["from", "where", "for", "limit", "orderBy", "innerJoin"]) q[m] = () => q;
  q.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(queue.shift() ?? []).then(ok, bad);
  return q;
}
const tx = { select: () => chain(), insert: vi.fn() };
vi.mock("../../db", () => ({ db: { transaction: async (fn: (t: unknown) => unknown) => fn(tx), select: () => chain() } }));
const reserveModelCall = vi.fn();
vi.mock("../model/allowance", () => ({
  reserveModelCall: (...a: unknown[]) => reserveModelCall(...a),
  AllowanceSpentError: class extends Error { constructor(public refused: string) { super(refused); } },
  recordModelUsage: vi.fn(),
  settleModelCall: vi.fn(),
}));
vi.mock("./reaper", () => ({ reapSynopses: async () => {} }));
let head: ProfileHead | null = null;
vi.mock("../profile/load", async (orig) => ({ ...(await orig<object>()), readProfileHead: async () => head }));

const { startRun } = await import("./generate");

const HEAD: ProfileHead = {
  deckId: "deck", userId: "user", commanderOracleId: "cmdr", partnerOracleId: null, declaredBracket: null,
  cards: [{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 1 }],
};
const LIST = listFingerprint(HEAD);
const start = () => startRun("deck", "user", LIST, "stub", new Date(), null, true);

describe("startRun: the list under the lock", () => {
  beforeEach(() => {
    queue.length = 0;
    reserveModelCall.mockReset();
    // Stops the run at the reservation, so reaching it is observable without the rest of the write.
    reserveModelCall.mockResolvedValue({ refused: "allowance" });
    head = HEAD;
  });

  it("reserves when the list is the one the write read", async () => {
    queue.push([{ commander: "cmdr", partner: null }], [{ fingerprint: LIST, profileVersion: 1, dirty: false }]);
    expect(await start()).toEqual({ kind: "allowance" });
    expect(reserveModelCall).toHaveBeenCalledOnce();
  });

  it("refuses, reserving nothing, when a card moved after the reading was read", async () => {
    head = { ...HEAD, cards: [...HEAD.cards, { oracleId: "c", quantity: 1 }] };
    queue.push([{ commander: "cmdr", partner: null }], [{ fingerprint: LIST, profileVersion: 1, dirty: false }]);
    expect(await start()).toEqual({ kind: "no_reading" });
    expect(reserveModelCall).not.toHaveBeenCalled();
  });

  it("refuses when the reading was marked dirty by an edit in between", async () => {
    queue.push([{ commander: "cmdr", partner: null }], [{ fingerprint: LIST, profileVersion: 1, dirty: true }]);
    expect(await start()).toEqual({ kind: "no_reading" });
    expect(reserveModelCall).not.toHaveBeenCalled();
  });

  // The case only the `list` clause catches: an edit AND its re-analysis both landed in between,
  // so the stored reading is clean and describes the live list, but not the list this write read.
  it("refuses when the deck was re-analyzed for the new list in between", async () => {
    head = { ...HEAD, cards: [...HEAD.cards, { oracleId: "c", quantity: 1 }] };
    queue.push([{ commander: "cmdr", partner: null }], [{ fingerprint: listFingerprint(head), profileVersion: 1, dirty: false }]);
    expect(await start()).toEqual({ kind: "no_reading" });
    expect(reserveModelCall).not.toHaveBeenCalled();
  });

  it("refuses when the deck is not the reader's", async () => {
    queue.push([], [{ fingerprint: LIST, profileVersion: 1, dirty: false }]);
    expect(await start()).toEqual({ kind: "no_reading" });
    expect(reserveModelCall).not.toHaveBeenCalled();
  });
});

// THE FREE METHOD-CHANGE REWRITE (plan 7.4, audit rules 1 and 11): reserved as a `system` call,
// capped at two per deck per contract, and decided under the deck's lock. A refused free press
// falls through to the PLAYER path, reuse check and allowance included.
describe("startRun: the free method-change rewrite", () => {
  const free = () => startRun("deck", "user", LIST, "stub", new Date(), null, true, 0, false, 8, "free");
  const run = (status: string, ok: boolean) => ({ status, content: ok ? { verdicts: [{ section: "overview", status: "ok" }] } : null });
  /** deck row, stored reading, then the free-run count (the queue is read in this order). */
  const lock = (runs: ReturnType<typeof run>[]) => {
    queue.push([{ commander: "cmdr", partner: null }], [{ fingerprint: LIST, profileVersion: 1, dirty: false }], runs);
  };

  beforeEach(() => {
    queue.length = 0;
    reserveModelCall.mockReset();
    tx.insert.mockReset();
    tx.insert.mockReturnValue({ values: () => ({ returning: async () => [{ id: "run-1" }] }) });
    reserveModelCall.mockResolvedValue({ id: "call-1" });
    head = HEAD;
  });

  it("reserves the first attempt as a system call, which skips the reuse check", async () => {
    lock([]);
    expect(await free()).toEqual({ kind: "started", runId: "run-1", callId: "call-1" });
    expect(reserveModelCall).toHaveBeenCalledWith(tx, "user", "synopsis", "stub", expect.any(Date), "system");
    // No fourth read: a reuse check would have taken the next queue entry and found none.
    expect(queue).toHaveLength(0);
  });

  it("reserves the second attempt after a failed first one", async () => {
    lock([run("done", false)]);
    await free();
    expect(reserveModelCall.mock.calls[0][5]).toBe("system");
  });

  // The cap: a third attempt is not free. It becomes the PAID rewrite, which reserves under the
  // player's allowance and bypasses reuse for any overview below the new contract.
  it("refuses a THIRD free attempt, whatever the two settled as: it falls to the player path", async () => {
    lock([run("done", false), run("pending", false)]);
    queue.push([]); // the paid rewrite's reuse check: no overview at the new contract yet
    const got = await free();
    expect(reserveModelCall.mock.calls[0][5]).toBe("player");
    expect(got).toEqual({ kind: "started", runId: "run-1", callId: "call-1" });
  });

  it("the paid fallback is still the player's: a spent allowance refuses it", async () => {
    lock([run("done", false), run("done", false)]);
    reserveModelCall.mockResolvedValue({ refused: "allowance" });
    expect(await free()).toEqual({ kind: "allowance" });
  });

  it("the paid fallback hands back an overview a concurrent rewrite already wrote at the new contract", async () => {
    lock([run("done", false), run("done", false)]);
    queue.push([{ id: "syn-new" }], [{ id: "syn-new", content: { verdicts: [] } }]);
    expect((await free()).kind).toBe("reused");
  });

  it("a rewrite that produced an overview since the press read it ends the need: a plain press, reuse included", async () => {
    lock([run("done", true)]);
    queue.push([{ id: "syn-new" }], [{ id: "syn-new", content: { verdicts: [] } }]);
    const got = await free();
    expect(reserveModelCall.mock.calls[0][5]).toBe("player");
    expect(got.kind).toBe("reused");
  });

  it("a press that never asked for a free run never reads the count", async () => {
    queue.push([{ commander: "cmdr", partner: null }], [{ fingerprint: LIST, profileVersion: 1, dirty: false }], []);
    await start();
    expect(reserveModelCall.mock.calls[0][5]).toBe("player");
    // Only the reuse check read after the reservation, not the free-run count.
    expect(queue).toHaveLength(0);
  });
});
