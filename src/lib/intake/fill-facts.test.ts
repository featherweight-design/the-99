import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: [] })) } }));
vi.mock("../discovery/price", () => ({ loadPrices: vi.fn(async () => new Map()) }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: vi.fn(async () => new Map()) }));
vi.mock("../bracket/flags-read", () => ({ loadBracketFlags: vi.fn(async () => new Map()) }));

import type { FillCandidate } from "../decks/fill";
import { loadFillGate } from "./fill-facts";

const card = (over: Partial<FillCandidate>): FillCandidate => ({
  oracleId: "x", name: "x", typeLine: "Creature", oracleText: null, keywords: [], manaCost: null,
  layout: "normal", owned: false, ownedQuantity: 0, inclusionPct: null, ...over,
});

describe("loadFillGate's budget", () => {
  it("admits a catalog basic it was never given as a candidate", async () => {
    // `planFill`'s `basics` reach the fill without being candidates, so the gate knows nothing of
    // them: no price, no ownership. A basic is never a buy, so the budget must not refuse one.
    const gate = await loadFillGate({
      userId: "u", commanderIds: ["cmd"], candidates: [],
      answers: { budgetCents: 1000, bracket: null, cardOracleId: null },
    });
    expect(gate!.admits(card({ oracleId: "cat-mountain", name: "Mountain", typeLine: "Basic Land — Mountain" }))).toBe(true);
    // And an unpriced non-basic it was never told about is still refused, as before.
    expect(gate!.admits(card({ oracleId: "spell" }))).toBe(false);
  });
});
