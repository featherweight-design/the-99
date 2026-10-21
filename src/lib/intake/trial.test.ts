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

vi.mock("./fill-facts", () => ({ loadBracketGateFacts: vi.fn() }));

import { placedCardsOf } from "../decks/costs-of";
import { buildFillPlan } from "../decks/fill-plan";
import { db } from "../../db";
import { trialFill } from "./trial";

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
  const gcs = new Set(["gc", "g0", "g1", "g2", "g3"]);
  const facts = {
    flagsOf: (id: string) => ({ gameChanger: gcs.has(id), massLandDenial: false, extraTurn: false }),
    combosOf: () => [], searches: () => false, reaches: () => false,
  };
  const answers = { budgetCents: null, bracket: 3 as const, cardOracleId: null };
  const shortReach = { target: 3, kind: "short", collectionPermits: [1, 2], collectionRaisers: [], buy: { raisers: ["gc"], buyCents: 3_190, overBudget: false } };
  const PRICES: Record<string, number> = { gc: 3_190, g1: 1_000, g2: 1_000, g3: 10_000 };

  beforeEach(async () => {
    const { loadBracketGateFacts } = await import("./fill-facts");
    vi.mocked(loadBracketGateFacts).mockResolvedValue(facts);
    const { loadPrices } = await import("../discovery/price");
    vi.mocked(loadPrices).mockImplementation((async (ids: string[]) =>
      new Map(ids.filter((id) => id in PRICES).map((id) => [id, { liveCents: PRICES[id] }]))) as never);
    vi.mocked(buildFillPlan).mockReset();
  });
  const plan = (rows: string[], bracketReach: unknown) =>
    vi.mocked(buildFillPlan).mockResolvedValueOnce({ rows: rows.map((oracleId) => ({ oracleId, quantity: 1 })), bracketReach } as never);
  /** The player owns every card but `unowned`, with no claims. */
  const owns = (unowned: string[] = []) => vi.mocked(db.execute).mockImplementation((async (q: unknown) => {
    const all = ["gc", "x", "g0", "g1", "g2", "g3"];
    // The bracket figure's own ownership read answers with owned ids only.
    if (JSON.stringify(q).includes("select ci.oracle_id")) {
      return { rows: all.filter((id) => !unowned.includes(id)).map((id) => ({ oracle_id: id })) };
    }
    return { rows: all.map((id) => ({ oracle_id: id, type_line: "Creature", owned: !unowned.includes(id) })) };
  }) as never);

  it("reads the deck's own rows: a fill that placed a Game Changer reaches 3, with nothing to buy", async () => {
    owns();
    plan(["gc", "x"], { target: 3, kind: "collection", raisers: ["gc"] });
    const f = await trialFill("u", commander, answers, ENV_VIEW);
    expect(f.bracket).toEqual({ target: 3, permits: [3], buyCents: null });
  });

  it("falls short with what is left to buy toward the target", async () => {
    owns(["gc"]);
    plan(["x"], shortReach);
    const f = await trialFill("u", commander, answers, ENV_VIEW);
    expect(f.bracket).toEqual({ target: 3, permits: [1, 2], buyCents: 3_190 });
  });

  it("reads reached when an any-cards fill bought a Game Changer the reach did not place (review 5)", async () => {
    owns(["gc"]);
    plan(["gc", "x"], shortReach);
    const f = await trialFill("u", commander, answers, ENV_VIEW);
    expect(f.bracket).toEqual({ target: 3, permits: [3], buyCents: null });
  });

  it("never counts a card the fill already bought: a $120 set with $20 of it in the deck leaves $100", async () => {
    owns(["g1", "g2", "g3"]);
    // One free Game Changer and the two $10 ones the budget bought already: three of four.
    plan(["g0", "g1", "g2", "x"], {
      target: 4, kind: "short", collectionPermits: [3], collectionRaisers: ["g0"],
      buy: { raisers: ["g0", "g1", "g2", "g3"], buyCents: 12_000, overBudget: true },
    });
    const f = await trialFill("u", commander, { ...answers, bracket: 4 }, ENV_VIEW);
    expect(f.bracket).toEqual({ target: 4, permits: [3], buyCents: 10_000 });
  });

  it("under own-only reads the sleeveable fill the create builds, not the ordinary fill filtered", async () => {
    owns(["gc"]);
    // The ordinary fill (the ownership figures) buys gc; the sleeveable fill replaces it and, from the
    // player's own cards, places g0, which reaches 3.
    plan(["gc", "x"], shortReach);
    plan(["g0", "x"], { target: 3, kind: "collection", raisers: ["g0"] });
    const f = await trialFill("u", commander, answers, ENV_VIEW, true);
    expect(vi.mocked(buildFillPlan).mock.calls[1][3]).toMatchObject({ pool: "sleeveable", failClosed: true });
    expect(f.bracket).toEqual({ target: 3, permits: [3], buyCents: null });
    // The ownership figures stay the ordinary fill's.
    expect(f.owned).toBe(1);
  });

  it("draws no figure under bracket 3, or with no reach on the plan (the switch off)", async () => {
    owns();
    plan(["x"], { target: 2, kind: "fixed" });
    expect((await trialFill("u", commander, { ...answers, bracket: 2 }, ENV_VIEW)).bracket).toBeNull();
    plan(["x"], undefined);
    expect((await trialFill("u", commander, answers, ENV_VIEW)).bracket).toBeNull();
  });
});
