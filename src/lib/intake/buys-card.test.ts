import { describe, expect, it } from "vitest";

import { buysCard, buysCopy } from "./buys-card";

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

describe("buysCopy: the rule the fill, its trial and the card row share", () => {
  it("buys what is not owned, and what is owned with every copy held", () => {
    expect(buysCopy(false, undefined)).toBe(true);
    expect(buysCopy(true, { free: 0 })).toBe(true);
    expect(buysCopy(true, { free: -1 })).toBe(true);
  });

  it("buys nothing owned with a copy free, or owned with nothing claiming it", () => {
    expect(buysCopy(true, { free: 1 })).toBe(false);
    expect(buysCopy(true, undefined)).toBe(false);
  });
});
