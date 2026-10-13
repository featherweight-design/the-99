// Admin PR 6f-1: "Help me add <color>" offers the staples the claim model says the player has a free copy
// of, and that model reads NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED from the env it is handed. The
// staples read defaults its env to the environment, so a dropped argument compiles: the reader's env and
// the environment hold opposite values here, and the handed env is checked by identity, as a boolean.
import { afterEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ staplesEnv: [] as unknown[] }));

vi.mock("../../db", () => {
  const BASICS = ["Plains", "Island", "Swamp", "Mountain", "Forest"].map((name, i) => ({ id: `b${i}`, name }));
  const chain = (): unknown => new Proxy(() => {}, {
    get: (_t, prop) => (prop === "then" ? (resolve: (v: unknown) => void) => resolve(BASICS) : () => chain()),
  });
  return { db: { select: () => chain() } };
});
vi.mock("./mana-balance-load", () => ({ loadManaInputs: async () => ({ rows: [], nameOf: new Map(), landText: new Map() }) }));
vi.mock("../decks/locks", () => ({ liveLockedIds: async () => new Set() }));
vi.mock("../decks/cuts-read", () => ({ readCutSupport: async () => null }));
vi.mock("../decks/deck-mix", () => ({ loadDeckMix: async () => ({ cells: { land: { target: 36 } } }) }));
vi.mock("./mana-help", () => ({ helpAddColor: () => ({ moves: [] }) }));
vi.mock("./mana-staples", () => ({
  loadManaStaples: async (_deck: unknown, _userId: string, env?: unknown) => (stub.staplesEnv.push(env), []),
}));

const { loadManaHelp } = await import("./mana-help-load");

const READER = { NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const DECK = { id: "d1", commander: { oracleId: "c1", colorIdentity: ["W"] }, partner: null, cards: [] } as never;

describe("loadManaHelp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("hands the staples' claim read the reader's resolved switches, not the environment", async () => {
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    expect(await loadManaHelp(DECK, "u1", "W", READER)).not.toBeNull();
    expect(stub.staplesEnv.length).toBe(1);
    expect(stub.staplesEnv[0] === READER).toBe(true);
  });
});
