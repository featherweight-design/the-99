import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
const { buyIds, commanderRows, heldIds } = await import("./draft-rows");

const facts = ["tymna", "thrasios", "kraum"].map((id) => ({ oracleId: id, name: id, artCropUri: null }));

describe("the commander rows' buy rule", () => {
  it("never marks a half the pair keeps as one to buy, owned or not", () => {
    // Tymna stays; Thrasios leaves for Kraum. Neither Tymna nor Kraum is in the collection.
    expect(buyIds(["tymna", "thrasios"], ["tymna", "kraum"], new Set())).toEqual(["kraum"]);
    const now = commanderRows(["tymna", "thrasios"], ["tymna", "kraum"], new Set(), facts, null)
      .filter((r) => r.side === "to");
    expect(now.map((r) => [r.oracleId, r.buy])).toEqual([["tymna", false], ["kraum", true]]);
  });

  it("carries the owned copy's printed name beside the oracle name", () => {
    const named = facts.map((f) => (f.oracleId === "kraum" ? { ...f, printedName: "Kraum, Renamed" } : f));
    const rows = commanderRows(["tymna"], ["kraum"], new Set(["kraum"]), named, null);
    expect(rows.map((r) => [r.name, r.printedName])).toEqual([["tymna", null], ["kraum", "Kraum, Renamed"]]);
  });

  it("marks an arriving unowned half, and not an owned one", () => {
    expect(buyIds(["tymna"], ["kraum"], new Set(["kraum"]))).toEqual([]);
    expect(buyIds(["tymna"], ["kraum"], new Set())).toEqual(["kraum"]);
  });

  it("buys nothing for a trade: a new half out of the version's 99 keeps its own copy", () => {
    const held = heldIds([], ["kraum"], new Set(["kraum", "sol-ring"]));
    expect(buyIds(["tymna"], ["kraum"], held)).toEqual([]);
    expect(buyIds(["tymna"], ["kraum"], heldIds([], ["kraum"], new Set(["sol-ring"])))).toEqual(["kraum"]);
  });
});
