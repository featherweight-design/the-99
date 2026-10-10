import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("../synopsis/combo-facts", () => ({ loadComboFacts: async () => null }));

import { costColours } from "./cuts-plan-read";

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
