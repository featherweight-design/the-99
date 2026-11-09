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

  it("lists every card the strip counts as ramp: a land to hand and a typed discount are read, not counted, and move no figure", () => {
    const weighed = [
      land("Forest", { quantity: 36 }),
      card("Sol Ring", { manaValue: 1, jobs: [job({ kind: "ramp" })] }),
      card("Rampant Growth", { manaValue: 2, oracleText: "Search your library for a basic land card, put that card onto the battlefield tapped", jobs: [job({ kind: "ramp", rampKind: "fetchesLand" })] }),
      card("Cultivate", { manaValue: 3, jobs: [job({ kind: "ramp" })] }),
    ];
    const read = [
      card("Sylvan Scrying", { manaValue: 2, oracleText: "Search your library for a land card, reveal it, put it into your hand, then shuffle.", jobs: [job({ kind: "ramp", rampKind: "fetchesLand" })] }),
      card("Herald of Kozilek", { manaValue: 2, typeLine: "Creature", oracleText: "Devoid\nColorless spells you cast cost {1} less to cast.", jobs: [job({ kind: "ramp", rampKind: "costReduction", restrictedTo: "colorless" })] }),
    ];
    const before = velocity(weighed, 4);
    const after = velocity([...weighed, ...read], 4);
    expect(after.notCounted.map((l) => [l.card.name, l.points, l.why])).toEqual([
      ["Herald of Kozilek", 0, "costReduction"], ["Sylvan Scrying", 0, "landToHand"],
    ]);
    // The counted cards and their points are untouched; only the average moves, as it always did
    // for any nonland card.
    expect(after.counted).toEqual(before.counted);
    expect(after.points).toBe(before.points);
    expect(after.points).toBe(2.5);
    expect(after.lands).toBe(before.lands);
  });

  it("leaves a card off the ledger that the strip does not count as ramp", () => {
    const v = velocity([card("Divination", { jobs: [job({ kind: "draw" })] })], 0);
    expect(v.counted).toEqual([]);
    expect(v.notCounted).toEqual([]);
  });

  it("indexes lands and points against the average mana value, commanders included", () => {
    const cmd = card("Gishath", { commander: true, manaValue: 8 });
    const v = velocity([cmd, land("Forest", { quantity: 33 }), card("Big", { manaValue: 6, quantity: 65 })], 10);
    expect(v.lands).toBe(33);
    expect(v.averageManaValue).toBeCloseTo((8 + 6 * 65) / 66);
    expect(v.index).toBeCloseTo((33 * 7 / 99) / ((8 + 6 * 65) / 66));
    expect(v.commanderTurn).toBe(7);
  });

  it("never reads a turn-1 cast for a two-drop commander, whatever the ramp: a turn-1 ramp piece makes no mana until turn 2", () => {
    const body = [land("Forest", { quantity: 36 }), card("Dork", { manaValue: 1, quantity: 30 })];
    expect(velocity([card("Thorin", { commander: true, manaValue: 2 }), ...body], 30).commanderTurn).toBe(2);
    expect(velocity([card("Dockside", { commander: true, manaValue: 1 }), ...body], 30).commanderTurn).toBe(1);
  });

  it("counts a ramp commander's own ramp: it is in the command zone every game", () => {
    const v = velocity([card("Selvala", { commander: true, manaValue: 3, jobs: [job({ kind: "ramp" })] })], 0);
    expect(v.counted.map((l) => [l.card.name, l.points])).toEqual([["Selvala", 0.5]]);
  });

  it("returns no turn without a commander, and a zero index for an empty list", () => {
    expect(velocity([], 0)).toMatchObject({ index: 0, commanderTurn: null });
  });
});
