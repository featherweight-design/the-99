// The synopsis actions' wire contract: the flag and a malformed id are answered BEFORE any read or
// write, and a deck the reader does not own reads as not found. `probe:synopsis` proves the
// functions these call against a real Postgres.

import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: vi.fn(async () => process.env) }));

const stub = vi.hoisted(() => ({ enabled: true, calls: [] as string[], state: null as unknown }));

vi.mock("../../lib/decks/analysis-flag", () => ({ analysisTabEnabled: () => stub.enabled }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user-1" }));
vi.mock("../../lib/synopsis/generate", () => ({
  writeSynopsisFor: async (deckId: string, userId: string) => { stub.calls.push(`write ${deckId} ${userId}`); return { kind: "reused" }; },
  retrySynopsisFor: async (deckId: string, userId: string, id: string) => { stub.calls.push(`retry ${deckId} ${id}`); return { kind: "nothing_to_retry" }; },
}));
vi.mock("../../lib/synopsis/read", () => ({
  readSynopsisState: async () => { stub.calls.push("state"); return stub.state; },
  readVersionSynopsis: async () => { stub.calls.push("version"); return null; },
}));

import { fetchSynopsis, fetchVersionSynopsis, retrySynopsisSections, writeSynopsis } from "./synopsis-actions";

const DECK = "11111111-1111-4111-8111-111111111111";
const RUN = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  stub.enabled = true;
  stub.calls = [];
  stub.state = null;
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
