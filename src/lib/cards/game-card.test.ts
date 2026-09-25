import { describe, expect, it } from "vitest";
import { isGameCard } from "./game-card";

describe("isGameCard", () => {
  it("accepts a card of any real layout, banned or not", () => {
    for (const layout of ["normal", "transform", "modal_dfc", "split", "meld", "reversible_card"]) {
      expect(isGameCard({ layout, typeLine: "Creature — Elf" })).toBe(true);
    }
  });

  it("refuses the theme fronts, planes, schemes, avatars, hosts and augments", () => {
    for (const layout of ["front_card", "planar", "scheme", "vanguard", "host", "augment", "token"]) {
      expect(isGameCard({ layout, typeLine: "Legendary Creature" })).toBe(false);
    }
  });

  // `normal` in layout, and nothing in the type line: Experience, Poison Counter, Red Mana.
  it("refuses an object whose whole type line is Card", () => {
    expect(isGameCard({ layout: "normal", typeLine: "Card" })).toBe(false);
    expect(isGameCard({ layout: "normal", typeLine: "Card // Card" })).toBe(false);
    expect(isGameCard({ layout: "normal", typeLine: "Artifact Creature — Card" })).toBe(true);
  });
});
