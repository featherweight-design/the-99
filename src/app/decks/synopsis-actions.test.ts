// The synopsis actions' wire contract: the flag and a malformed id are answered BEFORE any read or
// write, and a deck the reader does not own reads as not found. `probe:synopsis` proves the
// functions these call against a real Postgres.

import { beforeEach, describe, expect, it, vi } from "vitest";

// The reader's resolved switches: a sentinel holding no variable (the flag is mocked below), so the profile
// read is seen to receive exactly the env the action resolved, and a failing diff prints nothing real.
const ENV = vi.hoisted(() => ({ SENTINEL: "resolved" }) as unknown as NodeJS.ProcessEnv);
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: vi.fn(async () => ENV) }));

const stub = vi.hoisted(() => ({ enabled: true, calls: [] as string[], state: null as unknown, profileEnvs: [] as unknown[] }));

// Each action's profile reader, reduced to the env it was built under.
vi.mock("../../lib/profile/stored", () => ({ requestProfileDeps: (env: unknown) => ({ env }) }));

vi.mock("../../lib/decks/analysis-flag", () => ({ analysisTabEnabled: () => stub.enabled }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user-1" }));
vi.mock("../../lib/synopsis/generate", () => ({
  defaultDeps: () => ({ modelName: "stub" }),
  writeSynopsisFor: async (deckId: string, userId: string, deps: { profile?: { env?: unknown } }) => {
    stub.calls.push(`write ${deckId} ${userId}`);
    stub.profileEnvs.push(deps.profile?.env);
    return { kind: "reused" };
  },
  retrySynopsisFor: async (deckId: string, userId: string, id: string, deps: { profile?: { env?: unknown } }) => {
    stub.calls.push(`retry ${deckId} ${id}`);
    stub.profileEnvs.push(deps.profile?.env);
    return { kind: "nothing_to_retry" };
  },
}));
vi.mock("../../lib/synopsis/read", () => ({
  readSynopsisState: async (_deckId: string, _userId: string, deps?: { env?: unknown }) => {
    stub.calls.push("state");
    stub.profileEnvs.push(deps?.env);
    return stub.state;
  },
  readVersionSynopsis: async () => { stub.calls.push("version"); return null; },
}));

import { fetchSynopsis, fetchVersionSynopsis, retrySynopsisSections, writeSynopsis } from "./synopsis-actions";

const DECK = "11111111-1111-4111-8111-111111111111";
const RUN = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  stub.enabled = true;
  stub.calls = [];
  stub.state = null;
  stub.profileEnvs = [];
});

describe("synopsis actions", () => {
  it("answer disabled before any read or write while the tab is off", async () => {
    stub.enabled = false;
    expect(await writeSynopsis(DECK)).toEqual({ kind: "disabled" });
    expect(await retrySynopsisSections(DECK, RUN)).toEqual({ kind: "disabled" });
    expect(await fetchSynopsis(DECK)).toEqual({ kind: "disabled" });
    expect(await fetchVersionSynopsis(RUN)).toEqual({ kind: "disabled" });
    expect(stub.calls).toEqual([]);
  });

  it("never pass a malformed id to a uuid column", async () => {
    expect(await writeSynopsis("nope")).toEqual({ kind: "not_found" });
    expect(await retrySynopsisSections(DECK, "nope")).toEqual({ kind: "not_found" });
    expect(await fetchSynopsis("nope")).toEqual({ kind: "not_found" });
    expect(await fetchVersionSynopsis("nope")).toEqual({ kind: "not_found" });
    expect(stub.calls).toEqual([]);
  });

  it("write and retry as the signed-in reader", async () => {
    await writeSynopsis(DECK);
    await retrySynopsisSections(DECK, RUN);
    expect(stub.calls).toEqual([`write ${DECK} user-1`, `retry ${DECK} ${RUN}`]);
  });

  it("read a deck the reader does not own, or a version with no copy, as not found", async () => {
    expect(await fetchSynopsis(DECK)).toEqual({ kind: "not_found" });
    expect(await fetchVersionSynopsis(RUN)).toEqual({ kind: "not_found" });
  });
});

describe("the profile a synopsis reads", () => {
  // Admin adoption 6c: built under the reader's resolved switches, so its cache key is the one the
  // analysis tab filed it under.
  it("is read under the env each action resolved for the reader", async () => {
    await writeSynopsis(DECK);
    await retrySynopsisSections(DECK, RUN);
    await fetchSynopsis(DECK);
    expect(stub.profileEnvs).toHaveLength(3);
    for (const env of stub.profileEnvs) expect(env).toBe(ENV);
  });
});
