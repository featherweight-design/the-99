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
  const facts = {
    flagsOf: (id: string) => ({ gameChanger: id === "gc", massLandDenial: false, extraTurn: false }),
    combosOf: () => [], searches: () => false, reaches: () => false,
  };
  const answers = { budgetCents: null, bracket: 3 as const, cardOracleId: null };
  const shortReach = { target: 3, kind: "short", collectionPermits: [1, 2], collectionRaisers: [], buy: { raisers: ["gc"], buyCents: 3_190, overBudget: false } };

  beforeEach(async () => {
    const { loadBracketGateFacts } = await import("./fill-facts");
    vi.mocked(loadBracketGateFacts).mockResolvedValue(facts);
  });
  const plan = (rows: string[], bracketReach: unknown) =>
    vi.mocked(buildFillPlan).mockResolvedValueOnce({ rows: rows.map((oracleId) => ({ oracleId, quantity: 1 })), bracketReach } as never);
  /** Every row is a card the player owns with no claims, except `unowned`. */
  const owns = (unowned: string[] = []) => vi.mocked(db.execute).mockImplementation((async () => ({
    rows: ["gc", "x"].map((id) => ({ oracle_id: id, type_line: "Creature", owned: !unowned.includes(id) })),
  })) as never);

  it("reads the deck's own rows: a fill that placed a Game Changer reaches 3, with nothing to buy", async () => {
    owns();
    plan(["gc", "x"], { target: 3, kind: "collection", raisers: ["gc"] });
    const f = await trialFill("u", commander, answers, ENV_VIEW);
    expect(f.bracket).toEqual({ target: 3, permits: [3], buyCents: null });
  });

  it("falls short with the cheapest buy toward the target", async () => {
    owns();
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

  it("under own-only counts only the rows the player can sleeve", async () => {
    owns(["gc"]);
    plan(["gc", "x"], shortReach);
    const f = await trialFill("u", commander, answers, ENV_VIEW, true);
    expect(f.bracket).toEqual({ target: 3, permits: [1, 2], buyCents: 3_190 });
  });

  it("draws no figure under bracket 3, or with no reach on the plan (the switch off)", async () => {
    owns();
    plan(["x"], { target: 2, kind: "fixed" });
    expect((await trialFill("u", commander, { ...answers, bracket: 2 }, ENV_VIEW)).bracket).toBeNull();
    plan(["x"], undefined);
    expect((await trialFill("u", commander, answers, ENV_VIEW)).bracket).toBeNull();
  });
});
