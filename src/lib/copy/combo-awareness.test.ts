import { describe, expect, it } from "vitest";
import { comboAwarenessCopy } from "./combo-awareness";

describe("the Upgrade result's swap combo lines (A3 call 10)", () => {
  const t = comboAwarenessCopy.swapTooltip;
  const lines = [t.add("Dramatic Reversal"), t.addMore("Dramatic Reversal", 1), t.addMore("Dramatic Reversal", 2), t.cut("Basalt Monolith"), t.cutMore("Basalt Monolith", 1), t.cutMore("Basalt Monolith", 3)];

  it("say where the partner is once the swaps are made, not that both are in the deck now", () => {
    expect(t.add("Dramatic Reversal")).toBe("Two-card combo with Dramatic Reversal. Both are in the deck after these swaps.");
    expect(t.addMore("Dramatic Reversal", 2)).toBe("Two-card combo with Dramatic Reversal, and 2 others in the deck after these swaps.");
    expect(t.addMore("Dramatic Reversal", 1)).toBe("Two-card combo with Dramatic Reversal, and 1 other in the deck after these swaps.");
    expect(t.cut("Basalt Monolith")).toBe("Two-card combo with Basalt Monolith. Cutting this breaks it.");
    expect(t.cutMore("Basalt Monolith", 3)).toBe("Two-card combo with Basalt Monolith, and 3 others. Cutting this breaks them.");
    for (const l of lines) expect(l).not.toContain("Both are in this deck");
  });

  it("lead with the shipped noun, carry no em dash and stop", () => {
    for (const l of lines) {
      expect(l.startsWith("Two-card combo with ")).toBe(true);
      expect(l).not.toMatch(/[—–]/);
      expect(l.endsWith(".")).toBe(true);
    }
  });

  it("leave the deck row's line as shipped", () => {
    expect(comboAwarenessCopy.deckTooltip.inDeck("Dramatic Reversal")).toBe("Two-card combo with Dramatic Reversal. Both are in this deck.");
  });
});
