import { describe, expect, it } from "vitest";
import { toDecklistText } from "./export";

describe("toDecklistText", () => {
  it("emits commander first, then cards with quantities, one per line", () => {
    expect(toDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      cards: [{ name: "Sol Ring", quantity: 1 }, { name: "Forest", quantity: 5 }],
    })).toBe("1 Muldrotha, the Gravetide\n1 Sol Ring\n5 Forest");
  });
});
