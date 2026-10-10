import { describe, expect, it } from "vitest";
import { BENCHMARK_CUTS } from "./cuts";

describe("BENCHMARK_CUTS", () => {
  it("rises step by step, so every grade is reachable", () => {
    for (const cuts of Object.values(BENCHMARK_CUTS.grades)) {
      expect([...cuts]).toEqual([...cuts].sort((a, b) => a - b));
      expect(new Set(cuts).size).toBe(4);
    }
  });
  it("puts every heavy cut above its light one", () => {
    const d = BENCHMARK_CUTS.dependencies;
    for (const cut of [d.graveyard, d.artifacts.cards, d.artifacts.payoffs, d.enchantments.cards, d.enchantments.payoffs, d.creatures, d.activated]) {
      expect(cut.heavy).toBeGreaterThan(cut.light);
      expect(cut.light).toBeGreaterThanOrEqual(1);
    }
  });
});
