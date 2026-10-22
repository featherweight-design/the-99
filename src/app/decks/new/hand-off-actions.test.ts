import { beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

// The hand-off read's INPUT (round 3): the `?select=` picks the create places are checked the way
// `createDeck` checks them and reach the trial beside the build-around card. The trial is stubbed.
const m = vi.hoisted(() => ({
  trial: vi.fn(), rows: [] as Record<string, unknown>[], owned: [] as { oracleId: string }[], availability: vi.fn(),
}));
const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const GC = "0000aaaa-0000-4000-8000-0000000000aa";
const OFF_COLOR = "0000aaaa-0000-4000-8000-0000000000bb";
const commander = { oracleId: COMMANDER, name: "Sai", colorIdentity: ["U"], manaCost: "{2}{U}", commanderLegal: true,
  typeLine: "Legendary Creature — Human Artificer", oracleText: "", layout: "normal" };

vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../lib/switches/request", () => ({
  requestSwitchEnv: async () => envViewWith({ HELP_ME_CHOOSE_ENABLED: "true", BRACKET_REACH_ENABLED: "true" }),
}));
vi.mock("../../../lib/intake/trial", () => ({ handOffTrial: m.trial }));
vi.mock("../../../lib/intake/rows", () => ({ loadCardChip: vi.fn(async () => null) }));
vi.mock("../../../lib/decks/availability-query", () => ({ loadAvailability: m.availability }));
vi.mock("../../../db", () => {
  let call = 0;
  const nameOf = (t: unknown) => (t as Record<symbol, string>)[Symbol.for("drizzle:Name")];
  return {
    db: {
      select: () => ({
        from: (t: unknown) => ({
          where: async () => (nameOf(t) === "collection_items" ? m.owned : call++ === 0 ? [commander] : m.rows),
        }),
      }),
      reset: () => { call = 0; },
    },
  };
});

const { handOffBracketReach } = await import("./hand-off-actions");
const { db } = await import("../../../db");
const asked = { themes: [], cardOracleId: null, budgetDollars: 50, bracket: 3, bracketBuys: false };

beforeEach(() => {
  (db as unknown as { reset: () => void }).reset();
  m.owned = [];
  m.availability.mockReset().mockResolvedValue(new Map());
  m.trial.mockReset().mockResolvedValue({ permits: null, placedRaisers: [], reach: null, budgetLeftCents: null });
  m.rows = [
    { oracleId: GC, name: "Rhystic Study", commanderLegal: true, colorIdentity: ["U"], typeLine: "Enchantment" },
    { oracleId: OFF_COLOR, name: "Lightning Bolt", commanderLegal: true, colorIdentity: ["R"], typeLine: "Instant" },
  ];
});

describe("handOffBracketReach's picks", () => {
  it("hands the trial the legal picks the create would place, dropping the rest", async () => {
    await handOffBracketReach(COMMANDER, asked, [GC, OFF_COLOR, "not-a-uuid"]);
    expect(m.trial.mock.calls[0][5]).toEqual([GC]);
  });

  it("returns the picks the create buys on the Hit set, for the budget line (round 5)", async () => {
    m.trial.mockResolvedValue({
      permits: [1, 2], placedRaisers: [], budgetLeftCents: 2500,
      reach: { target: 3, kind: "short", collectionPermits: [1, 2], collectionRaisers: [], buy: { raisers: ["0000aaaa-0000-4000-8000-0000000000cc"], buyCents: 3200, overBudget: true } },
    });
    const { loadCardChip } = await import("../../../lib/intake/rows");
    vi.mocked(loadCardChip).mockImplementation(async (_u, id) => ({ oracleId: id, name: id, imageUri: null, owned: false, held: null, price: { kind: "priced", cents: 2500 } }));
    const r = await handOffBracketReach(COMMANDER, asked, [GC]);
    expect(r!.buy!.selectedBuys.map((c) => c.oracleId)).toEqual([GC]);
  });

  it("reads no chip and no ownership when the reach is fixed or above (round 6)", async () => {
    const { loadCardChip } = await import("../../../lib/intake/rows");
    for (const reach of [{ target: 3, kind: "fixed" }, { target: 3, kind: "above", permits: [4] }]) {
      vi.mocked(loadCardChip).mockClear();
      (db as unknown as { reset: () => void }).reset();
      // A raiser row the fill placed would otherwise be chipped: nothing is, since nothing is drawn.
      m.trial.mockResolvedValue({ permits: [3], placedRaisers: ["0000aaaa-0000-4000-8000-0000000000ee"], budgetLeftCents: 5000, reach });
      expect(await handOffBracketReach(COMMANDER, asked, [GC])).toBeNull();
      expect(loadCardChip).not.toHaveBeenCalled();
      expect(m.availability).not.toHaveBeenCalled();
    }
  });

  it("chips only the picks the create buys, decided by one ownership and availability read (round 6)", async () => {
    const OWNED = "0000aaaa-0000-4000-8000-0000000000dd";
    const RAISER = "0000aaaa-0000-4000-8000-0000000000cc";
    m.rows = [
      { oracleId: GC, name: "Rhystic Study", commanderLegal: true, colorIdentity: ["U"], typeLine: "Enchantment" },
      { oracleId: OWNED, name: "Sol Ring", commanderLegal: true, colorIdentity: [], typeLine: "Artifact" },
    ];
    m.owned = [{ oracleId: OWNED }];
    m.trial.mockResolvedValue({
      permits: [1, 2], placedRaisers: [], budgetLeftCents: 2500,
      reach: { target: 3, kind: "short", collectionPermits: [1, 2], collectionRaisers: [], buy: { raisers: [RAISER], buyCents: 3200, overBudget: true } },
    });
    const { loadCardChip } = await import("../../../lib/intake/rows");
    vi.mocked(loadCardChip).mockReset().mockImplementation(async (_u, id) => ({ oracleId: id, name: id, imageUri: null, owned: false, held: null, price: { kind: "priced", cents: 2500 } }));
    await handOffBracketReach(COMMANDER, asked, [GC, OWNED]);
    expect(m.availability).toHaveBeenCalledTimes(1);
    expect(m.availability.mock.calls[0][1].oracleIds).toEqual([GC, OWNED]);
    // The owned pick with a free copy is never chipped; the one to buy and the raiser are.
    expect(vi.mocked(loadCardChip).mock.calls.map((c) => c[1]).sort()).toEqual([GC, RAISER].sort());
  });

  it("refuses a selection that is not a list of strings", async () => {
    await expect(handOffBracketReach(COMMANDER, asked, [1 as unknown as string])).rejects.toThrow("bad selection");
  });
});
