import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: [] })) } }));
vi.mock("../discovery/price", () => ({ loadPrices: vi.fn(async () => new Map()) }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: vi.fn(async () => new Map()) }));
vi.mock("../bracket/flags-read", () => ({ loadBracketFlags: vi.fn(async () => new Map()) }));

import type { FillCandidate } from "../decks/fill";
import { loadFillGate } from "./fill-facts";
import { ENV_VIEW } from "@/test/env-view";

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
      answers: { budgetCents: 1000, bracket: null, cardOracleId: null }, env: ENV_VIEW,
    });
    expect(gate!.admits(card({ oracleId: "cat-mountain", name: "Mountain", typeLine: "Basic Land — Mountain" }))).toBe(true);
    // And an unpriced non-basic it was never told about is still refused, as before.
    expect(gate!.admits(card({ oracleId: "spell" }))).toBe(false);
  });
});

describe("loadFillGate's cap (Hit bracket N, G1)", () => {
  const priced = async () => {
    const { loadPrices } = await import("../discovery/price");
    vi.mocked(loadPrices).mockResolvedValue(new Map([
      ["rhystic", { liveCents: 3200 }], ["spell", { liveCents: 900 }], ["penny", { liveCents: 50 }],
    ]) as unknown as Awaited<ReturnType<typeof loadPrices>>);
  };

  it("caps the fill at the set alone, so the set charged first fits and nothing else is bought", async () => {
    await priced();
    const gate = await loadFillGate({
      userId: "u", commanderIds: ["cmd"], candidates: [card({ oracleId: "rhystic" }), card({ oracleId: "spell" })],
      answers: { budgetCents: 2000, bracket: null, cardOracleId: null }, env: ENV_VIEW, capCents: 3200,
    });
    // The budget alone ($20) would refuse the $32 set; the cap admits it.
    expect(gate!.admits(card({ oracleId: "rhystic" }))).toBe(true);
    gate!.place(card({ oracleId: "rhystic" }));
    // Charged first, it leaves nothing: the rest of the 99 buys nothing more.
    expect(gate!.admits(card({ oracleId: "spell" }))).toBe(false);
  });

  it("spends no whole-dollar remainder of a raised budget: a $33 budget capped at the $32 set buys no 50¢ card", async () => {
    await priced();
    const gate = await loadFillGate({
      userId: "u", commanderIds: ["cmd"], candidates: [card({ oracleId: "rhystic" }), card({ oracleId: "penny" })],
      answers: { budgetCents: 3300, bracket: null, cardOracleId: null }, env: ENV_VIEW, capCents: 3200,
    });
    gate!.place(card({ oracleId: "rhystic" }));
    expect(gate!.admits(card({ oracleId: "penny" }))).toBe(false);
  });

  it("with no cap, the budget less the set is spent as usual", async () => {
    await priced();
    const gate = await loadFillGate({
      userId: "u", commanderIds: ["cmd"], candidates: [card({ oracleId: "rhystic" }), card({ oracleId: "spell" })],
      answers: { budgetCents: 5000, bracket: null, cardOracleId: null }, env: ENV_VIEW,
    });
    gate!.place(card({ oracleId: "rhystic" }));
    // $50 less $32 leaves $18: the $9 card still fits.
    expect(gate!.admits(card({ oracleId: "spell" }))).toBe(true);
  });
});

describe("loadBudgetLeftCents (audit item 10)", () => {
  it("is the budget less the build-around card it has to buy, and null with no budget", async () => {
    const { loadPrices } = await import("../discovery/price");
    vi.mocked(loadPrices).mockResolvedValue(new Map([["around", { liveCents: 1500 }]]) as unknown as Awaited<ReturnType<typeof loadPrices>>);
    const { loadBudgetLeftCents } = await import("./fill-facts");
    // Unowned (no availability row), not a basic (the catalog read returns none): charged.
    expect(await loadBudgetLeftCents({
      userId: "u", commanderIds: ["cmd"], answers: { budgetCents: 5000, bracket: 3, cardOracleId: "around" }, env: ENV_VIEW,
    })).toBe(3500);
    expect(await loadBudgetLeftCents({
      userId: "u", commanderIds: ["cmd"], answers: { budgetCents: 5000, bracket: 3, cardOracleId: null }, env: ENV_VIEW,
    })).toBe(5000);
    expect(await loadBudgetLeftCents({
      userId: "u", commanderIds: ["cmd"], answers: { budgetCents: null, bracket: 3, cardOracleId: "around" }, env: ENV_VIEW,
    })).toBeNull();
  });
});
