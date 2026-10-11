import { describe, expect, it } from "vitest";

import { deckBenchmarksCopy as copy } from "./deck-benchmarks";

// A row can stand on one card (the commander alone makes the graveyard row Heavy and the activated
// row Light), so every count a figure or a reading prints is read at 1.
const ONE_PLURAL = /\b1 (?:cards|creatures|answers|artifacts|enchantments|one-time draws|lands|points)\b/;
const text = (parts: string | readonly string[]) => (typeof parts === "string" ? parts : parts.join(""));

describe("deck benchmarks copy", () => {
  it("never puts a plural noun after a count of 1", () => {
    const f = copy.figure;
    const d = copy.deps.figure;
    const r = copy.ledger.readings;
    const lines = [
      f.flow(1, 1), f.interaction(1, 1),
      d.graveyard(1, true), d.artifacts(1, 1, 1), d.enchantments(1, 1), d.creatures(1), d.activated(1, true),
      r.velocity(1, "1", "3"), r.flow(1, 1), r.flow(2, 1), r.interaction(1, 0), r.interaction(1, 1),
      r.graveyard(1, true), r.artifacts(1, 1, 1), r.enchantments(1, 1), r.creatures(1), r.activated(1),
    ].map(text);
    for (const line of lines) expect(line).not.toMatch(ONE_PLURAL);
    expect(text(d.graveyard(2, false))).toContain("2 cards use the graveyard");
  });
});
