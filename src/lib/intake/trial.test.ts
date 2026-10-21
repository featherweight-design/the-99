import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

// Only the WIRING is under test: which placed cards `trialFill` hands the plan. The plan, the
// prices and the claims are stubbed flat.
const planOptions: unknown[] = [];
vi.mock("../decks/fill-plan", () => ({
  buildFillPlan: vi.fn(async (_u: unknown, _c: unknown, _x: unknown, options: unknown) => {
    planOptions.push(options);
    return { rows: [] };
  }),
}));
const { PLACED } = vi.hoisted(() => ({
  PLACED: { typeLine: "Sorcery", oracleText: null, keywords: [], layout: "normal", manaCost: "{B}{B}" },
}));
vi.mock("../decks/costs-of", () => ({
  placedCardsOf: vi.fn(async (ids: readonly string[]) => ids.map(() => PLACED)),
}));
vi.mock("../decks/availability-query", () => ({ loadAvailability: vi.fn(async () => new Map()) }));
vi.mock("../discovery/price", () => ({ loadPrices: vi.fn(async () => new Map()), slotFor: vi.fn(() => ({ kind: "absent" })) }));
vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: [] })) } }));

import { placedCardsOf } from "../decks/costs-of";
import { buildFillPlan } from "../decks/fill-plan";
import { handOffTrial, trialFill } from "./trial";

const commander = { oracleId: "c", name: "C", colorIdentity: ["B"], manaCost: "{B}" };

beforeEach(() => {
  planOptions.length = 0;
  vi.mocked(placedCardsOf).mockClear();
});

describe("trialFill", () => {
  it("places the build-around card beside the plan, as the create it predicts does", async () => {
    // The card is placed beside the plan and excluded from its pool, so the plan sees it only
    // through `selected`. Left out, the trial predicts a mana base the create would not build.
    await trialFill("u", commander, { budgetCents: null, bracket: null, cardOracleId: "card-1" }, ENV_VIEW);
    expect(vi.mocked(placedCardsOf)).toHaveBeenCalledWith(["card-1"]);
    expect(planOptions[0]).toMatchObject({ selected: [PLACED] });
  });

  it("places nothing when no card was chosen", async () => {
    await trialFill("u", commander, { budgetCents: null, bracket: null, cardOracleId: null }, ENV_VIEW);
    expect(planOptions[0]).toMatchObject({ selected: [] });
  });
});

describe("trialFill's bracket figure (bracket reach R1b)", () => {
  const answers = { budgetCents: null, bracket: 3 as const, cardOracleId: null };
  const short = { target: 3, kind: "short", collectionPermits: [1, 2], collectionRaisers: [], buy: null };
  beforeEach(() => vi.mocked(buildFillPlan).mockReset());
  const plan = (bracketReach: unknown, bracketAfter?: unknown) =>
    vi.mocked(buildFillPlan).mockResolvedValueOnce({ rows: [], bracketReach, bracketAfter } as never);

  it("reads the plan's own finished-deck figure: what it lands in and what is left to buy", async () => {
    plan(short, { permits: [1, 2], buyCents: 3_190 });
    expect((await trialFill("u", commander, answers, ENV_VIEW)).bracket).toEqual({ target: 3, permits: [1, 2], buyCents: 3_190 });
  });

  it("under own-only reads the sleeveable fill the create builds, under the create's own options", async () => {
    // The ordinary fill (the ownership figures) reads short; the sleeveable fill, the deck the create
    // builds, reaches 3 with an owned replacement.
    plan(short, { permits: [1, 2], buyCents: 3_190 });
    plan({ target: 3, kind: "collection", raisers: ["g0"] }, { permits: [3], buyCents: null });
    const f = await trialFill("u", commander, answers, ENV_VIEW, true);
    expect(vi.mocked(buildFillPlan).mock.calls[1][3]).toMatchObject({ pool: "sleeveable", failClosed: true });
    expect(f.bracket).toEqual({ target: 3, permits: [3], buyCents: null });
  });

  it("draws no figure under bracket 3, or with no reach on the plan (the switch off)", async () => {
    plan({ target: 2, kind: "fixed" }, { permits: [1, 2], buyCents: null });
    expect((await trialFill("u", commander, { ...answers, bracket: 2 }, ENV_VIEW)).bracket).toBeNull();
    plan(undefined);
    expect((await trialFill("u", commander, answers, ENV_VIEW)).bracket).toBeNull();
    expect(vi.mocked(buildFillPlan)).toHaveBeenCalledTimes(2);
  });
});

describe("handOffTrial (bracket reach PR 3b)", () => {
  const commanderC = { oracleId: "c", name: "C", colorIdentity: ["B"], manaCost: "{B}" };
  const answers = { budgetCents: 5000, bracket: 3 as const, cardOracleId: null };

  it("fills as the create does, and reads the plan's own reach, finished bracket and placed raisers", async () => {
    vi.mocked(buildFillPlan).mockResolvedValueOnce({
      rows: [{ oracleId: "gc", quantity: 1, role: "other", source: "bracket" }, { oracleId: "x", quantity: 1, role: "other" }],
      bracketReach: { target: 3, kind: "collection", raisers: ["gc"] },
      bracketAfter: { permits: [3], buyCents: null }, budgetLeftCents: 5000,
    } as never);
    const t = await handOffTrial("u", commanderC, answers, ENV_VIEW, true);
    // Own-only: the create's own options, so the choice is drawn over the create's deck.
    expect(vi.mocked(buildFillPlan).mock.calls.at(-1)![3]).toMatchObject({ pool: "sleeveable", failClosed: true });
    expect(t).toEqual({ permits: [3], placedRaisers: ["gc"], reach: { target: 3, kind: "collection", raisers: ["gc"] }, budgetLeftCents: 5000 });
  });

  it("places the ?select= picks beside the plan with the build-around card, as the create does (round 3)", async () => {
    vi.mocked(buildFillPlan).mockResolvedValueOnce({ rows: [], bracketReach: { target: 3, kind: "fixed" }, bracketAfter: { permits: [3], buyCents: null } } as never);
    vi.mocked(placedCardsOf).mockClear();
    await handOffTrial("u", commanderC, { ...answers, cardOracleId: "card-1" }, ENV_VIEW, false, ["card-1", "pick-gc"]);
    const call = vi.mocked(buildFillPlan).mock.calls.at(-1)!;
    // Excluded from the pool (so fixed in the reach and charged to the budget) and held (so slots count them).
    expect([...(call[2] ?? [])]).toEqual(["card-1", "pick-gc"]);
    expect(vi.mocked(placedCardsOf)).toHaveBeenCalledWith(["card-1", "pick-gc"]);
  });

  it("fills from any cards when not own-only, and reads no reach under bracket 3", async () => {
    vi.mocked(buildFillPlan).mockResolvedValueOnce({ rows: [], bracketReach: { target: 2, kind: "fixed" }, bracketAfter: { permits: [1, 2], buyCents: null } } as never);
    const t = await handOffTrial("u", commanderC, { ...answers, bracket: 2 }, ENV_VIEW, false);
    expect(vi.mocked(buildFillPlan).mock.calls.at(-1)![3].pool).toBeUndefined();
    expect(t.permits).toBeNull();
  });
});
