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
  skeleton: vi.fn(),
  readLabels: vi.fn(),
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
vi.mock("../profile/load", () => ({ loadSkeletonForCommanders: m.skeleton }));
vi.mock("../labels/read", () => ({ readLabelRoleSets: m.readLabels }));
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
const call = (over: { bracketBuys?: boolean; budgetCents?: number | null; own?: boolean; budgetRaised?: boolean } = {}) =>
  buildFillPlan("u", commanders, new Set(), {
    selected: [], env: ON,
    answers: {
      budgetCents: over.budgetCents ?? 5000, bracket: 3, cardOracleId: null, bracketBuys: over.bracketBuys ?? false,
      ...(over.budgetRaised ? { budgetRaised: true } : {}),
    },
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
  m.skeleton.mockResolvedValue({ skeleton: null });
  m.readLabels.mockResolvedValue(new Map());
});

describe("buildFillPlan's Hit bracket N", () => {
  it("places nothing to buy without the pick: the reach rides the plan for the choice", async () => {
    const plan = await call();
    expect(planArgs().boughtRaisers).toEqual([]);
    expect(gateArgs().capCents).toBeUndefined();
    expect(plan.bracketBought).toBeUndefined();
    expect(plan.bracketReach).toMatchObject({ kind: "short" });
  });

  it("with the pick, hands the set to planFill as full candidates, the gate pricing it as usual", async () => {
    const plan = await call({ bracketBuys: true });
    expect(planArgs().boughtRaisers).toEqual([expect.objectContaining({ oracleId: "rhystic", owned: false, manaCost: "{2}{U}" })]);
    // The gate prices it like any candidate. Within budget with dollars to spare, the budget caps as usual.
    expect(gateArgs().candidates.some((c: { oracleId: string }) => c.oracleId === "rhystic")).toBe(true);
    expect(gateArgs().capCents).toBeUndefined();
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
    // The cap is the set alone: the raised budget's rounding remainder is never spent.
    expect(gateArgs().capCents).toBe(3290);
  });

  it("buys nothing but the set when Hit raised the budget, on the create and on its retry (G1)", async () => {
    // Create: $20 budget, a $32.01 set. Stored budget $33, but the cap is $32.01, not $33.
    m.budgetLeft.mockResolvedValue(2000);
    m.bracketReach.mockReturnValue(short(3201));
    const created = await call({ bracketBuys: true, budgetCents: 2000 });
    expect(created.raisedBudgetCents).toBe(3300);
    expect(created.budgetRaised).toBe(true);
    expect(gateArgs().capCents).toBe(3201);
    // Retry: reads the stored $33. The 99¢ left after the set is the remainder, not budget to spend.
    m.loadFillGate.mockClear();
    m.budgetLeft.mockResolvedValue(3300);
    // The retry knows it was raised from the stored column (`answer_budget_raised`), not the remainder.
    const retried = await call({ bracketBuys: true, budgetCents: 3300, budgetRaised: true });
    expect(retried.raisedBudgetCents).toBeUndefined();
    expect(retried.budgetRaised).toBe(true);
    expect(gateArgs().capCents).toBe(3201);
  });

  it("a within-budget Hit leaving under a dollar is not capped: the 50¢ left can still buy (review round 2)", async () => {
    // $50 budget, a $49.50 set: never raised, so no exact-cost cap and the remainder stays spendable.
    m.budgetLeft.mockResolvedValue(5000);
    m.bracketReach.mockReturnValue(short(4950));
    const plan = await call({ bracketBuys: true, budgetCents: 5000 });
    expect(plan.raisedBudgetCents).toBeUndefined();
    expect(plan.budgetRaised).toBeUndefined();
    expect(gateArgs().capCents).toBeUndefined();
  });

  it("reads the label of a bought raiser no pool carries (own-only), so it is counted by label", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    m.skeleton.mockResolvedValue({ skeleton: { roleTargets: { of: "labels", targets: {} }, composition: null, staples: [] } });
    await buildFillPlan("u", commanders, new Set(), {
      selected: [], env: envViewWith({ BRACKET_REACH_ENABLED: "true", HELP_ME_CHOOSE_ENABLED: "true", LABEL_ROLE_COUNTS_ENABLED: "true" }),
      pool: "sleeveable", failClosed: true,
      answers: { budgetCents: 5000, bracket: 3, cardOracleId: null, bracketBuys: true },
    });
    expect(m.readLabels).toHaveBeenCalledWith(expect.arrayContaining(["rhystic"]));
    vi.unstubAllEnvs();
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
