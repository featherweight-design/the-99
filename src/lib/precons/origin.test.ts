import { describe, expect, it } from "vitest";
import { assembleOrigin, keptFromOrigin, type OriginRow } from "./origin";

const row = (over: Partial<OriginRow>): OriginRow => ({
  fileName: "EldraziUnbound_CMM", name: "Eldrazi Unbound", setCode: "CMM", releaseDate: "2023-08-04",
  oracleId: "x", quantity: 1, isCommander: false, cardName: "X", typeLine: "Artifact", cmc: 2,
  manaCost: "{2}", layout: "normal", imageUri: null,
  ...over,
});

describe("assembleOrigin", () => {
  const rows = [
    row({ oracleId: "ulalek", cardName: "Ulalek, Fused Atrocity", isCommander: true, typeLine: "Legendary Creature", cmc: 4 }),
    // The feed lists a commander under a second printing: one commander, kept once.
    row({ oracleId: "ulalek", cardName: "Ulalek, Fused Atrocity", isCommander: true, typeLine: "Legendary Creature", cmc: 4 }),
    row({ oracleId: "sol", cardName: "Sol Ring", cmc: 1 }),
    // A card listed under two printings is one card, its copies summed.
    row({ oracleId: "wastes", cardName: "Wastes", typeLine: "Basic Land", cmc: 0, quantity: 3 }),
    row({ oracleId: "wastes", cardName: "Wastes", typeLine: "Basic Land", cmc: 0, quantity: 2 }),
    row({ oracleId: "kozilek", cardName: "Kozilek", typeLine: "Legendary Creature", cmc: "10" }),
  ];
  const v0 = assembleOrigin(rows)!;

  it("counts every card the precon lists, commanders included, from its rows", () => {
    expect(v0.summary.cardCount).toBe(9);
  });

  it("holds the 99 as a version does: commanders apart, quantities summed", () => {
    expect(v0.cards.map((c) => [c.oracleId, c.quantity])).toEqual([["sol", 1], ["wastes", 5], ["kozilek", 1]]);
    expect(v0.summary.commanderName).toBe("Ulalek, Fused Atrocity");
    expect(v0.summary.partnerOracleId).toBeNull();
  });

  it("averages the mana value over the 99's spells", () => {
    expect(v0.summary.manaValue).toBe(5.5);
  });

  it("lists its distinct non-basic cards, commanders included", () => {
    expect(v0.nonBasic).toEqual(["ulalek", "sol", "kozilek"]);
  });

  it("is null for an unlinked deck, which joins no row", () => {
    expect(assembleOrigin([])).toBeNull();
  });
});

describe("keptFromOrigin", () => {
  it("counts v0's non-basic cards v1 still holds, its commanders included", () => {
    expect(keptFromOrigin(["ulalek", "sol", "kozilek"], ["sol", "ulalek", "island", "forest"])).toEqual({ kept: 2, of: 3 });
  });
});
