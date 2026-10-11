import { describe, expect, it, vi } from "vitest";

const { rowsRef, loadComboFacts, select } = vi.hoisted(() => {
  const rowsRef = { rows: [] as unknown[] };
  return { rowsRef, loadComboFacts: vi.fn(), select: vi.fn(() => ({ from: () => ({ where: async () => rowsRef.rows }) })) };
});
vi.mock("../../db", () => ({ db: { select } }));
vi.mock("../synopsis/combo-facts", () => ({ loadComboFacts }));

import { costColours, readCutsPlan } from "./cuts-plan-read";

describe("costColours", () => {
  it("reads the WUBRG letters of a cost, in WUBRG order, once each", () => {
    expect(costColours("{2}{B}{B}{R}")).toEqual(["B", "R"]);
    expect(costColours("{G}{W}{U}")).toEqual(["W", "U", "G"]);
  });
  it("counts no hybrid or Phyrexian pip, since each can be paid another way", () => {
    expect(costColours("{W/U}{2/B}{G}")).toEqual(["G"]);
    expect(costColours("{X}{3}{B/P}")).toEqual([]);
  });
  it("is empty for a cost-free or missing cost", () => {
    expect(costColours(null)).toEqual([]);
    expect(costColours("")).toEqual([]);
    expect(costColours("{4}")).toEqual([]);
  });
});

describe("readCutsPlan", () => {
  const catalog = [
    { id: "cmd", name: "Gishath", cost: "{3}{G}{W}", text: "Vigilance\nTrample", layout: "normal" },
    { id: "bear", name: "Bear", cost: "{1}{G}{G}", text: "", layout: "normal" },
    { id: "bolt", name: "Bolt", cost: "{R}", text: "", layout: "normal" },
    { id: "hybrid", name: "Hybrid", cost: "{W/U}{2}", text: "", layout: "normal" },
  ];
  const card = (oracleId: string, name: string, typeLine: string, quantity = 1) => ({ oracleId, name, typeLine, quantity });
  const prof = {
    cards: [
      card("cmd", "Gishath", "Legendary Creature"), card("bear", "Bear", "Creature", 2), card("bolt", "Bolt", "Instant"),
      card("hybrid", "Hybrid", "Creature"), card("f", "Forest", "Basic Land - Forest", 30), card("sf", "Snow-Covered Island", "Basic Snow Land - Island", 4),
      card("t", "Temple", "Land"),
    ],
    commanderOracleIds: ["cmd"], colours: ["G", "W"],
  } as never;

  it("reads colour needs, basics, commander text and the combo facts from the catalog and the Overview's read", async () => {
    rowsRef.rows = catalog;
    loadComboFacts.mockResolvedValueOnce({ combos: [{ pieces: ["A", "B"], produces: ["Infinite mana"] }, { pieces: ["Marauding Raptor", "Polyraptor"], produces: ["Draw the game", "Infinite creature tokens"] }], nearCombos: [] });
    const plan = await readCutsPlan(prof);
    expect(plan.colourNeeds).toEqual([{ colour: "G", cards: 2 }, { colour: "R", cards: 1 }]);
    expect(plan.basics).toEqual([{ type: "Island", count: 4 }, { type: "Forest", count: 30 }]);
    expect(plan.commanderText).toEqual(["Gishath: Vigilance / Trample"]);
    expect([...plan.needs.keys()].sort()).toEqual(["bear", "bolt"]);
    expect(plan.combos).toHaveLength(1);
    expect(plan.nearCombos).toEqual([]);
  });

  it("leaves both combo lists null when the combo read gave nothing, and the rest stands", async () => {
    rowsRef.rows = catalog;
    loadComboFacts.mockResolvedValueOnce(null);
    const plan = await readCutsPlan(prof);
    expect(plan.combos).toBeNull();
    expect(plan.nearCombos).toBeNull();
    expect(plan.colourNeeds.length).toBe(2);
  });

  it("counts no commander in the colour needs", async () => {
    rowsRef.rows = catalog;
    loadComboFacts.mockResolvedValueOnce(null);
    const plan = await readCutsPlan(prof);
    expect(plan.needs.has("cmd")).toBe(false);
  });

  it("reads an empty deck without touching the catalog", async () => {
    rowsRef.rows = [];
    select.mockClear();
    loadComboFacts.mockResolvedValueOnce(null);
    const plan = await readCutsPlan({ cards: [], commanderOracleIds: [], colours: [] } as never);
    expect(plan).toMatchObject({ colourNeeds: [], basics: [], commanderText: [] });
    expect(select).not.toHaveBeenCalled();
  });
});
