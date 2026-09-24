import { describe, expect, it } from "vitest";

import type { DeckDetailCard } from "../decks/grouping";
import { deckCardComparator } from "../decks/sort-cards";
import type { SwapReceipt } from "./context";
import { placeReceipts } from "./place-receipts";

const card = (name: string) => ({ name, oracleId: `id-${name}`, cmc: 2, price: null }) as unknown as DeckDetailCard;
const receipt = (cut: string): SwapReceipt => ({
  swapId: `s-${cut}`, cutOracleId: `id-${cut}`, cut, add: "X", sections: [], groupLabel: "", free: false, cutLeft: 0,
});
const names = (placed: ReturnType<typeof placeReceipts>) =>
  placed.map((p) => ("card" in p ? p.card.name : `[${p.receipt.cut}]`));

describe("placeReceipts", () => {
  const rows = [card("Arcane Signet"), card("Mind Stone"), card("Sol Ring")];

  it("inserts a receipt at its cut's name slot under the name sort, either direction", () => {
    expect(names(placeReceipts(rows, [receipt("Fellwar Stone")], "name", deckCardComparator("name", "asc", null))))
      .toEqual(["Arcane Signet", "[Fellwar Stone]", "Mind Stone", "Sol Ring"]);
    const desc = [...rows].reverse();
    expect(names(placeReceipts(desc, [receipt("Fellwar Stone")], "name", deckCardComparator("name", "desc", null))))
      .toEqual(["Sol Ring", "Mind Stone", "[Fellwar Stone]", "Arcane Signet"]);
  });

  it("never reorders the rows it was given, receipt or none", () => {
    // Deliberately out of name order: the list's own comparator decides row order, not this.
    const given = [card("Sol Ring"), card("Arcane Signet")];
    expect(names(placeReceipts(given, [], "name", deckCardComparator("name", "asc", null)))).toEqual(["Sol Ring", "Arcane Signet"]);
  });

  it("takes the section's last slot under a price or mana sort", () => {
    for (const key of ["price", "mana"] as const) {
      expect(names(placeReceipts(rows, [receipt("Aaa")], key, deckCardComparator(key, "asc", null))).at(-1)).toBe("[Aaa]");
    }
  });
});
