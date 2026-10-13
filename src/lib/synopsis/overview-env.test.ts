// Admin adoption 6d: the Overview's data check (`overviewDataMovedFor`) is asked under the READER's
// resolved switches on both sides of the synopsis, the write's replacement decision and the state
// read. The reader's env and the environment hold opposite NOTICES_ENABLED values, and the env is a
// SENTINEL asserted by identity, so no assertion ever prints the process environment.
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Each awaited select, in order. */
const queue: unknown[][] = [];
function chain() {
  const q: Record<string, unknown> = {};
  for (const m of ["from", "where", "for", "limit", "orderBy", "innerJoin"]) q[m] = () => q;
  q.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(queue.shift() ?? []).then(ok, bad);
  return q;
}
const tx = { select: () => chain() };
vi.mock("../../db", () => ({ db: { select: () => chain(), transaction: async (fn: (t: unknown) => unknown) => fn(tx) } }));
vi.mock("./reaper", () => ({ reapSynopses: async () => {} }));

const stub = vi.hoisted(() => ({
  movedEnvs: [] as unknown[],
  moved: false,
  illegalAsked: 0,
  offendingAsked: 0,
}));
vi.mock("../notices/overview", () => ({
  overviewDataMovedFor: async (_d: string, _u: string, _seen: number, env?: unknown) => (stub.movedEnvs.push(env), stub.moved),
}));
vi.mock("../notices/read", async (orig) => ({
  ...(await orig<object>()),
  holdsIllegalCard: async () => (stub.illegalAsked++, false),
  liveOffendingIds: async () => (stub.offendingAsked++, []),
}));

const AT = new Date("2026-10-01T00:00:00Z");
const HEAD = {
  deckId: "deck", userId: "user", commanderOracleId: "cmdr", partnerOracleId: null, declaredBracket: null,
  cards: [{ oracleId: "a", quantity: 1 }],
};
vi.mock("../profile/stored", async (orig) => ({
  ...(await orig<object>()),
  readStoredReading: async () => ({ fresh: true, profile: { cards: [], commanderOracleIds: ["cmdr"] }, analyzedAt: AT }),
}));
vi.mock("../profile/load", async (orig) => ({ ...(await orig<object>()), readProfileHead: async () => HEAD }));
vi.mock("../model/allowance", async (orig) => ({ ...(await orig<object>()), readAllowance: async () => ({ remaining: 5 }) }));

const { listFingerprint } = await import("../profile/fingerprint");
const { writeSynopsisFor } = await import("./generate");
const { readSynopsisState } = await import("./read");

const LIST = listFingerprint(HEAD as never);
const ON = { NOTICES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const SHOWN = {
  id: "syn-1", fingerprint: LIST, contractVersion: 7, createdAt: AT, seenSeq: 2,
  content: { verdicts: [{ status: "ok" }], cards: {} },
};

beforeEach(() => {
  queue.length = 0;
  stub.movedEnvs = [];
  stub.moved = false;
  stub.illegalAsked = 0;
  stub.offendingAsked = 0;
});

describe("the write's replacement decision", () => {
  it("asks whether the data moved under the reader's env, and reuses the overview when it did not", async () => {
    try {
      vi.stubEnv("NOTICES_ENABLED", "false");
      // freshReading's row, then the shown synopsis for that list.
      queue.push([{ list: LIST, at: AT, dirty: false, seenSeq: 5 }], [SHOWN]);
      const result = await writeSynopsisFor("deck", "user", { modelName: "stub", model: vi.fn(), now: () => AT }, ON);
      expect(result.kind).toBe("reused");
      // The reader's switch is on: the legality check ran, which the environment would have skipped.
      expect(stub.illegalAsked).toBe(1);
      expect(stub.movedEnvs).toHaveLength(1);
      expect(stub.movedEnvs[0] === ON).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("the state read", () => {
  it("asks whether the data moved under the reader's env", async () => {
    try {
      vi.stubEnv("NOTICES_ENABLED", "false");
      stub.moved = true;
      // The owned deck, the shown synopsis (inside the snapshot), the reading's row, the newest run.
      queue.push([{ id: "deck" }], [SHOWN], [{ list: LIST }], []);
      const state = await readSynopsisState("deck", "user", undefined, AT, ON);
      // The reader's switch is on: the illegal-card read ran, which the environment would have skipped.
      expect(stub.offendingAsked).toBe(1);
      expect(stub.movedEnvs).toHaveLength(1);
      expect(stub.movedEnvs[0] === ON).toBe(true);
      expect(state?.synopsis?.id).toBe("syn-1");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
