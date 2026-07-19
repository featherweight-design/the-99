import { describe, expect, it } from "vitest";
import { toDecklistText, toShoppingListText } from "./export";

describe("toDecklistText", () => {
  it("emits commander first, then cards with quantities, one per line", () => {
    expect(toDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      cards: [{ name: "Sol Ring", quantity: 1 }, { name: "Forest", quantity: 5 }],
    })).toBe("1 Muldrotha, the Gravetide\n1 Sol Ring\n5 Forest");
  });
});

describe("toShoppingListText", () => {
  it("returns names only, one per line, in input order", () => {
    expect(toShoppingListText([{ name: "Rhystic Study" }, { name: "Sol Ring" }]))
      .toBe("Rhystic Study\nSol Ring");
  });
  it("returns empty string for empty input", () => {
    expect(toShoppingListText([])).toBe("");
  });
  it("never includes prices, counts, or commander line", () => {
    const out = toShoppingListText([{ name: "Bolas's Citadel" }]);
    expect(out).not.toMatch(/\$|\d+ /);
  });
});
