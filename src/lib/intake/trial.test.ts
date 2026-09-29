import { beforeEach, describe, expect, it, vi } from "vitest";

// Only the WIRING is under test: which census input `trialFill` hands the plan. The plan, the
// prices and the claims are stubbed flat.
const planOptions: unknown[] = [];
vi.mock("../../app/decks/actions", () => ({
  buildFillPlan: vi.fn(async (_u: unknown, _c: unknown, _x: unknown, options: unknown) => {
    planOptions.push(options);
    return { rows: [] };
  }),
}));
vi.mock("../decks/costs-of", () => ({
  costsOf: vi.fn(async (ids: readonly string[]) => ids.map(() => "{B}{B}")),
}));
vi.mock("../decks/availability-query", () => ({ loadAvailability: vi.fn(async () => new Map()) }));
vi.mock("../discovery/price", () => ({ loadPrices: vi.fn(async () => new Map()), slotFor: vi.fn(() => ({ kind: "absent" })) }));
vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: [] })) } }));

import { costsOf } from "../decks/costs-of";
import { trialFill } from "./trial";

const commander = { oracleId: "c", name: "C", colorIdentity: ["B"], manaCost: "{B}" };

beforeEach(() => {
  planOptions.length = 0;
  vi.mocked(costsOf).mockClear();
});

describe("trialFill", () => {
  it("puts the build-around card's cost in the census, as the create it predicts does", async () => {
    // The card is placed beside the plan and excluded from its pool, so its pips reach the basics
    // split only through `selectedCosts`. Left out, the trial predicts a mana base the create
    // would not build.
    await trialFill("u", commander, { budgetCents: null, bracket: null, cardOracleId: "card-1" });
    expect(vi.mocked(costsOf)).toHaveBeenCalledWith(["card-1"]);
    expect(planOptions[0]).toMatchObject({ selectedCosts: ["{B}{B}"] });
  });

  it("asks for no costs when no card was chosen", async () => {
    await trialFill("u", commander, { budgetCents: null, bracket: null, cardOracleId: null });
    expect(planOptions[0]).toMatchObject({ selectedCosts: [] });
  });
});
