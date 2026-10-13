// The new-deck search's claim read takes the reader's env (admin PR 6f-2): `searchCommanders` →
// `loadSearchFacts` → `loadCardRow` → the claim model, which decides NEVER_CUT_ENABLED's `locked` key and
// CHANGE_COMMANDER_ENABLED's pending clause from it. The environment has both the other way here, so a
// dropped argument at any step would read it; the env is checked by identity, never compared.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const CARD = "0000aaaa-0000-4000-8000-000000000001";
const stub = vi.hoisted(() => ({
  execute: vi.fn(),
  loadAvailability: vi.fn(async () => new Map()),
}));
vi.mock("../../db", () => ({ db: { execute: stub.execute } }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: stub.loadAvailability }));

const { loadCardRow, searchCommanders } = await import("./search");

const ENV = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
const OWNED = { rows: [{ name: "Sol Ring", game_changer: false, type_line: "Artifact", image_uri: null, owned: true }] };

beforeEach(() => {
  vi.stubEnv("NEVER_CUT_ENABLED", "false");
  vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
  // The card's own row, then nothing: the search past the card's read is not under test.
  stub.execute.mockReset().mockResolvedValueOnce(OWNED).mockRejectedValue(new Error("not under test"));
  stub.loadAvailability.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("the search's claim read", () => {
  it("is handed loadCardRow's env", async () => {
    await loadCardRow("u", CARD, ENV);
    const [, opts] = stub.loadAvailability.mock.calls[0] as unknown as [string, { oracleIds: string[]; env?: unknown }];
    expect(opts.oracleIds).toEqual([CARD]);
    expect(opts.env === ENV).toBe(true);
  });

  it("is handed searchCommanders' env, through loadSearchFacts and loadCardRow", async () => {
    const asked = { words: "", colors: [], match: "contains", themes: [], themeJoin: "all", sets: [], pool: "any", card: CARD, budgetDollars: null, bracket: null };
    await searchCommanders("u", asked as never, ENV).catch(() => null);
    expect(stub.loadAvailability).toHaveBeenCalledTimes(1);
    const [, opts] = stub.loadAvailability.mock.calls[0] as unknown as [string, { env?: unknown }];
    expect(opts.env === ENV).toBe(true);
  });
});
