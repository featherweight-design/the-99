// Admin PR 6f-2 (the pre-open pass's finding): Proposed cuts draws each cut's art down the chain card details
// uses, and the deck's printing picks in that chain follow the READER's DECK_PRINTINGS_ENABLED, so the env
// `readCutsState` is handed must reach `chainArt`. The environment has the switch the other way; the env is
// checked by identity, never compared.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const stub = vi.hoisted(() => ({ artArgs: [] as unknown[][] }));

vi.mock("../../db", () => {
  // Every query reads nothing: no run, so no cuts, and the art chain is asked about an empty list.
  const chain = (): unknown => new Proxy(() => {}, {
    get: (_t, prop) => (prop === "then" ? (resolve: (v: unknown) => void) => resolve([]) : () => chain()),
  });
  return { db: { transaction: async (fn: (tx: unknown) => unknown) => fn(chain()) } };
});
vi.mock("../model/allowance", () => ({
  readAllowance: async () => ({ used: 0, limit: 3, nextAt: null, reopensAt: null }),
  settleModelCall: async () => undefined,
}));
vi.mock("../cards/chain-art", () => ({
  chainArt: async (...args: unknown[]) => (stub.artArgs.push(args), new Map()),
}));

const { readCutsState } = await import("./cuts-read");

beforeEach(() => {
  stub.artArgs = [];
  vi.stubEnv("DECK_PRINTINGS_ENABLED", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("readCutsState", () => {
  it("hands the reader's resolved env to the cuts' art chain", async () => {
    const env = envViewWith({ DECK_PRINTINGS_ENABLED: "true" });
    await readCutsState("d1", "u1", new Date(0), null, env);
    expect(stub.artArgs).toHaveLength(1);
    expect(stub.artArgs[0].slice(0, 2)).toEqual(["u1", "d1"]);
    expect(stub.artArgs[0][3] === env).toBe(true);
  });
});
