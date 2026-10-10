import { describe, expect, it } from "vitest";
import { card, job, land } from "./fixtures";
import { velocity } from "./velocity";

describe("velocity", () => {
  it("weighs ramp by mana value: full at 2 or less, half at 3, nothing above", () => {
    const v = velocity([
      card("Sol Ring", { manaValue: 1, jobs: [job({ kind: "ramp" })] }),
      card("Rampant Growth", { manaValue: 2, oracleText: "Search your library for a basic land card, put that card onto the battlefield tapped", jobs: [job({ kind: "ramp", rampKind: "fetchesLand" })] }),
      card("Cultivate", { manaValue: 3, jobs: [job({ kind: "ramp" })] }),
      card("Gilded Lotus", { manaValue: 5, jobs: [job({ kind: "ramp" })] }),
    ], 4);
    expect(v.points).toBe(2.5);
    expect(v.counted.map((l) => [l.card.name, l.points, l.why])).toEqual([
      ["Rampant Growth", 1, "land"], ["Sol Ring", 1, "ramp"], ["Cultivate", 0.5, "ramp"],
    ]);
    expect(v.notCounted.map((l) => [l.card.name, l.why])).toEqual([["Gilded Lotus", "tooLate"]]);
  });

  it("halves a one-time burst and scores a discount 0, still listing both", () => {
    const v = velocity([
      card("Dark Ritual", { manaValue: 1, jobs: [job({ kind: "ramp", rampKind: "burstMana" })] }),
      card("Herald's Horn", { manaValue: 3, oracleText: "Creature spells you cast cost {1} less to cast.", jobs: [job({ kind: "ramp", rampKind: "costReduction" })] }),
    ], 0);
    expect(v.counted.map((l) => [l.card.name, l.points, l.why])).toEqual([["Dark Ritual", 0.5, "burst"]]);
    expect(v.notCounted.map((l) => [l.card.name, l.why])).toEqual([["Herald's Horn", "costReduction"]]);
  });

  it("takes ramp membership from the strip's reader: a land fetched to hand is not ramp at all", () => {
    const v = velocity([
      card("Expedition Map", { manaValue: 1, oracleText: "Search your library for a land card, reveal it, put it into your hand", jobs: [job({ kind: "ramp", rampKind: "fetchesLand" })] }),
    ], 0);
    expect(v.counted).toEqual([]);
    expect(v.notCounted).toEqual([]);
  });

  it("indexes lands and points against the average nonland mana value; commanders are not in the 99", () => {
    const cmd = card("Gishath", { commander: true, manaValue: 8 });
    const v = velocity([cmd, land("Forest", { quantity: 33 }), card("Big", { manaValue: 6, quantity: 66 })], 10);
    expect(v.lands).toBe(33);
    expect(v.averageManaValue).toBe(6);
    expect(v.index).toBeCloseTo((33 * 7 / 99) / 6);
    expect(v.commanderTurn).toBe(7);
  });

  it("returns no turn without a commander, and a zero index for an empty list", () => {
    expect(velocity([], 0)).toMatchObject({ index: 0, commanderTurn: null });
  });
});
