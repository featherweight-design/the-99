import { beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

// buildFillPlan's WIRING of *Hit bracket N* (bracket reach PR 3b): which cards reach `planFill` as
// bought raisers, what the gate is told to charge first, the raised budget, and the own-only reach
// that weighs unowned top cards without adding them to the pool. The reach itself is
// `bracket-reach.test.ts`'s; here it is stubbed to a fixed answer.
const m = vi.hoisted(() => ({
  planFill: vi.fn(),
  loadFillGate: vi.fn(),
  bracketReach: vi.fn(),
  budgetLeft: vi.fn(),
  topCards: vi.fn(),
}));

vi.mock("../../db", () => ({ db: {} }));
vi.mock("./suggestions-read", () => ({
  ownedColorLegalPool: vi.fn(async () => [
    { oracleId: "owned-1", name: "Rock", typeLine: "Artifact", oracleText: "{T}: Add {C}.", keywords: [], manaCost: null, layout: "normal", ownedQuantity: 1 },
  ]),
  unownedTopCards: m.topCards,
}));
vi.mock("../edhrec/client", () => ({ getEdhrecData: vi.fn(async () => ({ data: { inclusionByName: {}, topCards: ["Rhystic Study"] } })) }));
vi.mock("../staples/fill-staples", () => ({ gatherFillStaples: vi.fn(async () => []) }));
vi.mock("./catalog-basics", () => ({ loadCatalogBasics: vi.fn(async () => []) }));
vi.mock("../../app/commanders/[slug]/synergy-read", () => ({ readSynergyCards: vi.fn(async () => []) }));
vi.mock("../profile/load", () => ({ loadSkeletonForCommanders: vi.fn(async () => ({ skeleton: null })) }));
vi.mock("./availability-query", () => ({ loadAvailability: vi.fn(async () => new Map()) }));
vi.mock("../discovery/price", () => ({ loadPrices: vi.fn(async () => new Map([["rhystic", { liveCents: 3200 }]])) }));
vi.mock("../intake/fill-facts", () => ({
  loadFillGate: m.loadFillGate,
  loadBudgetLeftCents: m.budgetLeft,
  loadBracketGateFacts: vi.fn(async () => ({
    flagsOf: (id: string) => ({ gameChanger: id === "rhystic", massLandDenial: false, extraTurn: false }),
    combosOf: () => [], searches: () => false, reaches: () => false,
  })),
}));
vi.mock("../intake/bracket-reach", async (importActual) => ({
  ...(await importActual<typeof import("../intake/bracket-reach")>()),
  bracketReach: m.bracketReach,
}));
vi.mock("./fill", async (importActual) => ({
  ...(await importActual<typeof import("./fill")>()),
  planFill: m.planFill,
}));

import { buildFillPlan } from "./fill-plan";

const commanders = [{ oracleId: "cmd", name: "C", colorIdentity: ["U"], manaCost: "{U}" }];
const ON = envViewWith({ BRACKET_REACH_ENABLED: "true", HELP_ME_CHOOSE_ENABLED: "true" });
const RHYSTIC = { oracleId: "rhystic", name: "Rhystic Study", typeLine: "Enchantment", oracleText: "Whenever an opponent casts a spell", keywords: [], manaCost: "{2}{U}", layout: "normal" };
const short = (buyCents: number) => ({
  target: 3, kind: "short", collectionPermits: [1, 2], collectionRaisers: [],
  buy: { raisers: ["rhystic"], buyCents, overBudget: false },
});
const call = (over: { bracketBuys?: boolean; budgetCents?: number | null; own?: boolean } = {}) =>
  buildFillPlan("u", commanders, new Set(), {
    selected: [], env: ON,
    answers: { budgetCents: over.budgetCents ?? 5000, bracket: 3, cardOracleId: null, bracketBuys: over.bracketBuys ?? false },
    ...(over.own ? { pool: "sleeveable" as const, failClosed: true } : {}),
  });
const planArgs = () => m.planFill.mock.calls[0][1];
const gateArgs = () => m.loadFillGate.mock.calls[0][0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  m.planFill.mockReturnValue({ rows: [] });
  m.loadFillGate.mockResolvedValue(undefined);
  m.budgetLeft.mockResolvedValue(5000);
  m.topCards.mockResolvedValue([RHYSTIC]);
  m.bracketReach.mockReturnValue(short(3200));
});

describe("buildFillPlan's Hit bracket N", () => {
  it("places nothing to buy without the pick: the reach rides the plan for the choice", async () => {
    const plan = await call();
    expect(planArgs().boughtRaisers).toEqual([]);
    expect(gateArgs().floorCents).toBeUndefined();
    expect(plan.bracketBought).toBeUndefined();
    expect(plan.bracketReach).toMatchObject({ kind: "short" });
  });

  it("with the pick, hands the set to planFill as full candidates and floors the gate at its cost", async () => {
    const plan = await call({ bracketBuys: true });
    expect(planArgs().boughtRaisers).toEqual([expect.objectContaining({ oracleId: "rhystic", owned: false, manaCost: "{2}{U}" })]);
    // The gate prices it like any candidate, and caps at no less than what it costs.
    expect(gateArgs().candidates.some((c: { oracleId: string }) => c.oracleId === "rhystic")).toBe(true);
    expect(gateArgs().floorCents).toBe(3200);
    expect(plan.bracketBought).toBe(true);
    expect(plan.raisedBudgetCents).toBeUndefined();
  });

  it("judges over budget against what the build-around card leaves, and raises to whole dollars (G1)", async () => {
    m.budgetLeft.mockResolvedValue(2050);
    m.bracketReach.mockReturnValue(short(3290));
    const plan = await call({ bracketBuys: true, budgetCents: 5000 });
    // The reach is told the budget LEFT (audit item 10), not the whole budget.
    expect(m.bracketReach.mock.calls[0][0].budgetCents).toBe(2050);
    // $50 + ($32.90 - $20.50) = $62.40, up to $63.
    expect(plan.raisedBudgetCents).toBe(6300);
    // The floor is what the raised budget leaves after the placed card, so a retry caps the same.
    expect(gateArgs().floorCents).toBe(6300 - (5000 - 2050));
  });

  it("ignores the pick when the reach is no longer short", async () => {
    m.bracketReach.mockReturnValue({ target: 3, kind: "collection", raisers: [] });
    const plan = await call({ bracketBuys: true });
    expect(planArgs().boughtRaisers).toEqual([]);
    expect(plan.bracketBought).toBeUndefined();
  });

  it("under own-only weighs the unowned top cards for the reach, never as pool candidates", async () => {
    await call({ own: true });
    expect(m.topCards).toHaveBeenCalled();
    expect(m.bracketReach.mock.calls[0][0].cards).toContain("rhystic");
    // Not in the plan's candidates, and nothing bought without the pick.
    expect(m.planFill.mock.calls[0][0].some((c: { oracleId: string }) => c.oracleId === "rhystic")).toBe(false);
    expect(planArgs().boughtRaisers).toEqual([]);
  });

  it("under own-only with the pick, the bought set reaches planFill beside the sleeveable pool", async () => {
    await call({ own: true, bracketBuys: true });
    expect(m.planFill.mock.calls[0][0].some((c: { oracleId: string }) => c.oracleId === "rhystic")).toBe(false);
    expect(planArgs().boughtRaisers.map((c: { oracleId: string }) => c.oracleId)).toEqual(["rhystic"]);
    expect(planArgs().pool).toBe("sleeveable");
  });

  it("reads no top cards under own-only with the switch off", async () => {
    await buildFillPlan("u", commanders, new Set(), {
      selected: [], env: envViewWith({ BRACKET_REACH_ENABLED: "" }), pool: "sleeveable", failClosed: true,
      answers: { budgetCents: null, bracket: 3, cardOracleId: null },
    });
    expect(m.topCards).not.toHaveBeenCalled();
    expect(m.bracketReach).not.toHaveBeenCalled();
  });
});
