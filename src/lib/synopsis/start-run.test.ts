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
  for (const m of ["from", "where", "for", "limit", "orderBy"]) q[m] = () => q;
  q.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(queue.shift() ?? []).then(ok, bad);
  return q;
}
const tx = { select: () => chain(), insert: vi.fn() };
vi.mock("../../db", () => ({ db: { transaction: async (fn: (t: unknown) => unknown) => fn(tx) } }));
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
