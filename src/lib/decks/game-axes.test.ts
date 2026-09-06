import { describe, expect, it } from "vitest";
import { GAME_AXIS_KEYS, isGameAxisKey } from "./game-axes";

describe("game axis vocabulary", () => {
  // The order is load-bearing: it is the order marks are drawn in on a history
  // row, and the tie-break when two axes have the same net.
  it("is the eight axes in the specified order", () => {
    expect(GAME_AXIS_KEYS).toEqual([
      "speed",
      "card_flow",
      "mana",
      "interaction",
      "board",
      "resilience",
      "engine",
      "closing",
    ]);
  });

  it("accepts a known key and rejects anything else", () => {
    expect(isGameAxisKey("mana")).toBe(true);
    expect(isGameAxisKey("Mana")).toBe(false);
    expect(isGameAxisKey("tempo")).toBe(false);
    expect(isGameAxisKey("")).toBe(false);
  });
});
