import { beforeEach, describe, expect, it, vi } from "vitest";

// Only the WIRING is under test: which placed cards `trialFill` hands the plan. The plan, the
// prices and the claims are stubbed flat.
const planOptions: unknown[] = [];
vi.mock("../../app/decks/actions", () => ({
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
    await trialFill("u", commander, { budgetCents: null, bracket: null, cardOracleId: "card-1" });
    expect(vi.mocked(placedCardsOf)).toHaveBeenCalledWith(["card-1"]);
    expect(planOptions[0]).toMatchObject({ selected: [PLACED] });
  });

  it("places nothing when no card was chosen", async () => {
    await trialFill("u", commander, { budgetCents: null, bracket: null, cardOracleId: null });
    expect(planOptions[0]).toMatchObject({ selected: [] });
  });
});
