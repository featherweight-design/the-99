import { describe, expect, it } from "vitest";
import { buildDeckOracleSet, isInDeck, identityLabel } from "./indeck";

describe("buildDeckOracleSet", () => {
  it("builds a Set from deck cards", () => {
    const cards = [{ oracleId: "a" }, { oracleId: "b" }, { oracleId: "c" }];
    const set = buildDeckOracleSet(cards);
    expect(set.size).toBe(3);
    expect(set.has("a")).toBe(true);
    expect(set.has("b")).toBe(true);
    expect(set.has("d")).toBe(false);
  });

  it("handles an empty deck", () => {
    const set = buildDeckOracleSet([]);
    expect(set.size).toBe(0);
  });

  it("deduplicates if a card appears twice (basic land edge case)", () => {
    const cards = [{ oracleId: "forest" }, { oracleId: "forest" }];
    const set = buildDeckOracleSet(cards);
    expect(set.size).toBe(1);
  });
});

describe("isInDeck", () => {
  it("returns true for a card in the deck", () => {
    const set = new Set(["sol-ring", "arcane-signet"]);
    expect(isInDeck(set, "sol-ring")).toBe(true);
  });

  it("returns false for a card not in the deck", () => {
    const set = new Set(["sol-ring"]);
    expect(isInDeck(set, "demonic-tutor")).toBe(false);
  });

  it("returns false for an empty deck", () => {
    const set = new Set<string>();
    expect(isInDeck(set, "anything")).toBe(false);
  });
});

describe("identityLabel", () => {
  it("returns Colorless for an empty identity", () => {
    expect(identityLabel([])).toBe("Colorless");
  });

  it("returns W-legal for mono-white", () => {
    expect(identityLabel(["W"])).toBe("W-legal");
  });

  it("returns WUB-legal for three colors", () => {
    expect(identityLabel(["W", "U", "B"])).toBe("WUB-legal");
  });

  it("returns WUBRG-legal for five colors", () => {
    expect(identityLabel(["W", "U", "B", "R", "G"])).toBe("WUBRG-legal");
  });
});
