import { describe, expect, it } from "vitest";
import { deckBodySize, landTarget } from "./deck-size";

describe("deckBodySize", () => {
  it("is 99 for a single commander", () => {
    expect(deckBodySize(false)).toBe(99);
  });

  it("is 98 for a pair — the deck is still 100 cards", () => {
    expect(deckBodySize(true)).toBe(98);
  });
});

describe("landTarget", () => {
  it("is 37 for a single commander", () => {
    expect(landTarget(false)).toBe(37);
  });

  it("drops to 36 for a pair, so the missing slot comes out of the lands", () => {
    expect(landTarget(true)).toBe(36);
  });
});
