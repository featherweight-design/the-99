import { beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

// The hand-off read's INPUT (round 3): the `?select=` picks the create places are checked the way
// `createDeck` checks them and reach the trial beside the build-around card. The trial is stubbed.
const m = vi.hoisted(() => ({ trial: vi.fn(), rows: [] as Record<string, unknown>[] }));
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
vi.mock("../../../db", () => {
  let call = 0;
  return {
    db: {
      select: () => ({ from: () => ({ where: async () => (call++ === 0 ? [commander] : m.rows) }) }),
      reset: () => { call = 0; },
    },
  };
});

const { handOffBracketReach } = await import("./hand-off-actions");
const { db } = await import("../../../db");
const asked = { themes: [], cardOracleId: null, budgetDollars: 50, bracket: 3, bracketBuys: false };

beforeEach(() => {
  (db as unknown as { reset: () => void }).reset();
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

  it("refuses a selection that is not a list of strings", async () => {
    await expect(handOffBracketReach(COMMANDER, asked, [1 as unknown as string])).rejects.toThrow("bad selection");
  });
});
