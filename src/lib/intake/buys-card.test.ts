import { describe, expect, it } from "vitest";

import { buysCard } from "./buys-card";

describe("buysCard: the fill's own charge rule", () => {
  it("buys a card the player does not own, and one whose every copy is held", () => {
    expect(buysCard({ owned: false, held: null })).toBe(true);
    expect(buysCard({ owned: true, held: { deck: "Atraxa" } })).toBe(true);
    expect(buysCard({ owned: true, held: { deck: null } })).toBe(true);
  });

  it("buys nothing for a card with a copy free", () => {
    expect(buysCard({ owned: true, held: null })).toBe(false);
  });
});
