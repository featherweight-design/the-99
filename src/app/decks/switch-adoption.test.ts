// Admin PR 5 (actions and routes) and 6a (pages, layouts, the page cache): a server action decides its
// switch from the READER's resolved env (`requestSwitchEnv`),
// not from `process.env` alone. Proved on the synopsis reads, whose guard is `ANALYSIS_TAB_ENABLED`: the
// environment has it off and the reader's override turns it on, so an action reading the environment
// would refuse and one reading the resolved env goes through.
import { beforeEach, describe, expect, it, vi } from "vitest";

const DECK = "22222222-2222-4222-8222-222222222222";
const VERSION = "33333333-3333-4333-8333-333333333333";

const stub = vi.hoisted(() => ({
  override: {} as Record<string, string>,
  resolvedFor: [] as string[],
  reads: [] as string[],
}));

vi.mock("../../lib/switches/request", () => ({
  requestSwitchEnv: vi.fn(async (userId: string) => {
    stub.resolvedFor.push(userId);
    return { ...stub.override };
  }),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user-1" }));
vi.mock("../../lib/synopsis/generate", () => ({
  defaultDeps: () => ({}),
  writeSynopsisFor: async () => null,
  retrySynopsisFor: async () => null,
}));
vi.mock("../../lib/profile/stored", () => ({ requestProfileDeps: () => ({}) }));
vi.mock("../../lib/synopsis/read", () => ({
  readSynopsisState: async (deckId: string) => (stub.reads.push(deckId), { kind: "none" }),
  readVersionSynopsis: async (versionId: string) => (stub.reads.push(versionId), { body: "x" }),
}));

const { fetchSynopsis, fetchVersionSynopsis } = await import("./synopsis-actions");

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("ANALYSIS_TAB_ENABLED", "false");
  stub.override = {};
  stub.resolvedFor = [];
  stub.reads = [];
});

describe("an action reads the reader's resolved switches", () => {
  it("goes through when the reader's override turns on a switch the environment has off", async () => {
    stub.override = { ANALYSIS_TAB_ENABLED: "true" };
    expect(await fetchSynopsis(DECK)).toEqual({ kind: "none" });
    expect(await fetchVersionSynopsis(VERSION)).toEqual({ kind: "ok", body: "x" });
    expect(stub.reads).toEqual([DECK, VERSION]);
    // Resolved for the signed-in reader, once per action.
    expect(stub.resolvedFor).toEqual(["user-1", "user-1"]);
  });

  it("refuses when the resolved env leaves the switch off", async () => {
    expect(await fetchSynopsis(DECK)).toEqual({ kind: "disabled" });
    expect(await fetchVersionSynopsis(VERSION)).toEqual({ kind: "disabled" });
    expect(stub.reads).toEqual([]);
  });
});

/*
 * Every flag function and every reader that decides a switch takes a REQUIRED `env`, so a call that leaves it
 * out does not compile; earlier scans of bare calls and of the claim readers' defaulted env are gone with the
 * defaults. What still compiles is handing one `process.env`, which reads the environment past every override:
 * `pnpm check:switch-reads` (`scripts/lib/switch-reads.mjs`) holds that, across all of src.
 */
