import { describe, it, expect } from "vitest";
import { deckCounts, type DeckDetailCard } from "./grouping";


describe("covered is not owned", () => {
  const card = (over: Partial<DeckDetailCard>): DeckDetailCard => ({
    oracleId: "a", name: "A", typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as DeckDetailCard["cardTypeGroup"],
    role: "other", cmc: 2, owned: false, quantity: 1, auto: false,
    printedName: null, printedSetCode: null, printedCollectorNumber: null, ...over,
  });

  it("counts a printed card as covered but never as owned", () => {
    const counts = deckCounts([
      card({ oracleId: "a", owned: true }),
      card({ oracleId: "b", owned: false, proxied: true }),
      card({ oracleId: "c", owned: false }),
    ]);
    expect(counts.built).toBe(3);
    // The collection holds one of these three, and that figure must not move.
    expect(counts.ownedCount).toBe(1);
    expect(counts.coveredCount).toBe(2);
    // What is left to acquire is the one card that is neither owned nor printed.
    expect(counts.toBuyCount).toBe(1);
  });

  it("counts every copy of a printed row, not the row", () => {
    const counts = deckCounts([card({ owned: false, proxied: true, quantity: 4 })]);
    expect(counts.coveredCount).toBe(4);
    expect(counts.ownedCount).toBe(0);
  });
});
