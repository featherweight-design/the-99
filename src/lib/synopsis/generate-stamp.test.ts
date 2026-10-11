import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `run` stamps the contract it WROTE under on the pending row `startRun` inserts. This drives the
// real `writeSynopsisFor` up to that insert (which throws a sentinel to stop the run) and reads the
// `contractVersion` off the values, so a wiring slip between `factsWithSource` and `startRun` is
// seen. The unit tests beside it cover each half; nothing else covers the join.

const STOP = new Error("stop after the insert");
const state = vi.hoisted(() => ({
  topSelects: [] as unknown[][],
  txSelects: [] as unknown[][],
  inserted: [] as Record<string, unknown>[],
  labels: null as (() => Promise<Map<string, unknown>>) | null,
}));

// A drizzle-shaped chain: every builder method returns it, and awaiting it pops the next queued result.
function chain(queue: unknown[][]): unknown {
  const c: unknown = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === "then") return (res: (v: unknown) => void) => res(queue.shift() ?? []);
      return () => c;
    },
  });
  return c;
}
const tx = {
  select: () => chain(state.txSelects),
  insert: () => ({
    values: (v: Record<string, unknown>) => {
      state.inserted.push(v);
      return { returning: () => Promise.reject(STOP) };
    },
  }),
};
vi.mock("../../db", () => ({
  db: {
    select: () => chain(state.topSelects),
    transaction: (cb: (t: typeof tx) => unknown) => cb(tx),
  },
}));
vi.mock("./combo-facts", () => ({ loadComboFacts: async () => null }));
vi.mock("../staples/universal", () => ({ loadUniversalStaples: async () => new Set<string>() }));
vi.mock("../labels/read", () => ({ readLabels: () => state.labels!() }));
vi.mock("./reaper", () => ({ reapSynopses: async () => undefined }));
vi.mock("./method-notice", async (orig) => ({
  ...(await orig<typeof import("./method-notice")>()),
  freeRunsFor: async () => ({ attempts: 0, succeeded: false }),
}));
vi.mock("../model/allowance", async (orig) => ({
  ...(await orig<typeof import("../model/allowance")>()),
  reserveModelCall: async () => ({ id: "call-1" }),
}));
vi.mock("../profile/load", async (orig) => ({
  ...(await orig<typeof import("../profile/load")>()),
  readProfileHead: async () => ({ head: true }),
}));

const profile = {
  commanderOracleIds: ["id-Kratos"],
  cards: ["Kratos", "Heliod"].map((name) => ({
    oracleId: `id-${name}`, name, typeLine: "Card", cmc: 1, quantity: 1, layout: "normal",
  })),
  counts: { landCapable: 37 },
  roles: { counts: { ramp: 11 }, cards: { ramp: [], draw: [], removal: [], wipes: [], land: [] } },
  colours: { identity: ["R"], unproducible: [] },
  brackets: { comboReach: { tutors: [], reaches: [] }, twoCardCombos: [] },
} as never;
const analyzedAt = new Date("2026-10-11T10:00:00Z");
vi.mock("../profile/stored", async (orig) => ({
  ...(await orig<typeof import("../profile/stored")>()),
  readStoredReading: async () => ({ fresh: true, profile, analyzedAt }),
  sameList: () => true,
}));

import { synopsisCallSettings, writeSynopsisFor } from "./generate";
import { SYNOPSIS_MAX_TOKENS, SYNOPSIS_MAX_TOKENS_V8 } from "./limits";

const deps = {
  modelName: "model-v7",
  modelNameV2: "model-v2",
  model: async () => ({ ok: false as const, errorClass: "upstream_busy" as const }),
  now: () => new Date("2026-10-11T12:00:00Z"),
};

/** Runs one write and returns the contract the pending row was stamped with. */
async function stampedRow(opts: { v2: boolean; benchmarks: boolean; labelsFail?: boolean }) {
  vi.stubEnv("OVERVIEW_V2_ENABLED", opts.v2 ? "true" : "false");
  vi.stubEnv("DECK_BENCHMARKS_ENABLED", opts.benchmarks ? "true" : "false");
  state.labels = opts.labelsFail ? async () => { throw new Error("down"); } : async () => new Map();
  state.topSelects = [
    [{ list: "list-1", at: analyzedAt, dirty: false, seenSeq: 0 }], // freshReading's profile row
    [], // readShownSynopsis: no overview yet
    [], // the cards' texts
  ];
  state.txSelects = [
    [{ commander: "id-Kratos", partner: null }], // the deck row
    [{ fingerprint: "list-1", profileVersion: 1, dirty: false }], // the stored reading
    [], // no overview for this list yet
  ];
  state.inserted = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  await expect(writeSynopsisFor("deck-1", "user-1", deps)).rejects.toBe(STOP);
  expect(state.inserted).toHaveLength(1);
  return state.inserted[0];
}
const stampedContract = async (opts: Parameters<typeof stampedRow>[0]) => (await stampedRow(opts)).contractVersion;

describe("the contract a write stamps on its run", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    [false, false, 7],
    [true, false, 11],
    [false, true, 9],
    [true, true, 12],
  ])("v2=%s benchmarks=%s stamps %i", async (v2, benchmarks, contract) => {
    expect(await stampedContract({ v2, benchmarks })).toBe(contract);
  });

  it("stamps 7 or 11, never 9 or 12, when the label read fails and the figures fall back", async () => {
    expect(await stampedContract({ v2: false, benchmarks: true, labelsFail: true })).toBe(7);
    expect(await stampedContract({ v2: true, benchmarks: true, labelsFail: true })).toBe(11);
  });
});

// Decided 2026-10-11: the model is tied to the contract. Contract 7 is what production runs while
// the v2 switch is off, and was never measured on Sonnet 5.5, so merging the switch must not move it.
describe("the model each contract runs on", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it("keeps contract 7 on Sonnet 5 at low, its own ceiling, not streamed", () => {
    expect(synopsisCallSettings(false)).toEqual({ model: "claude-sonnet-5", effort: "low", maxTokens: SYNOPSIS_MAX_TOKENS, stream: false });
  });

  it("runs the v2 contracts on Sonnet 5.5 at medium, streamed under the larger ceiling", () => {
    expect(synopsisCallSettings(true)).toEqual({ model: "claude-sonnet-5-5", effort: "medium", maxTokens: SYNOPSIS_MAX_TOKENS_V8, stream: true });
    expect(SYNOPSIS_MAX_TOKENS_V8).toBe(16_000);
  });

  it("records the contract's own model on the run", async () => {
    expect((await stampedRow({ v2: false, benchmarks: false })).model).toBe("model-v7");
    expect((await stampedRow({ v2: true, benchmarks: false })).model).toBe("model-v2");
  });
});
