import { describe, expect, it } from "vitest";

import { fitsIdentity, comboFacts, deckStatsFact, expectedCastTurn, interactionCounts } from "./facts-extra";
import { overviewV2Enabled } from "./overview-v2";

const card = (over: Partial<Parameters<typeof interactionCounts>[0][number]>) => ({
  typeLine: "Instant", oracleText: null, quantity: 1, categories: ["removal" as const], manaValue: 1, ...over,
});

describe("expectedCastTurn", () => {
  it("is the mana value's own turn when no ramp helps", () => {
    expect(expectedCastTurn(4, 0)).toBe(4);
    expect(expectedCastTurn(6, 0)).toBe(6);
  });
  it("comes sooner with ramp, and never later than without it", () => {
    for (const mv of [3, 5, 6, 8]) {
      expect(expectedCastTurn(mv, 12)).toBeLessThanOrEqual(expectedCastTurn(mv, 0));
    }
    expect(expectedCastTurn(6, 14)).toBeLessThan(6);
  });
  it("a heavy ramp count pulls a six-drop to turn four or five, not a flat six", () => {
    expect(expectedCastTurn(6, 18)).toBe(5);
    expect(expectedCastTurn(2, 10)).toBe(2);
  });
  it("is capped and tolerates a missing mana value", () => {
    expect(expectedCastTurn(40, 0)).toBe(10);
    expect(expectedCastTurn(0, 5)).toBe(1);
    expect(expectedCastTurn(Number.NaN, 5)).toBe(1);
  });
});

describe("interactionCounts", () => {
  it("counts speed and cost separately and together", () => {
    const c = interactionCounts([
      card({}), // cheap instant
      card({ manaValue: 4 }), // instant, dear
      card({ typeLine: "Sorcery", manaValue: 1 }), // cheap sorcery
      card({ typeLine: "Creature", oracleText: "Flash. When this enters, destroy target artifact.", manaValue: 2 }),
      card({ categories: ["ramp" as never], manaValue: 1 }), // not interaction
      card({ typeLine: "Sorcery", categories: ["wipes" as const], manaValue: 4, quantity: 1 }),
    ]);
    expect(c).toEqual({ total: 5, instantSpeed: 3, cheap: 3, cheapInstant: 2, wipes: 1 });
  });
  it("honours quantity and a missing mana value", () => {
    const c = interactionCounts([card({ quantity: 3, manaValue: undefined })]);
    expect(c).toMatchObject({ total: 3, instantSpeed: 3, cheap: 0, cheapInstant: 0 });
  });
  it("the word flash inside another word is not flash", () => {
    expect(interactionCounts([card({ typeLine: "Sorcery", oracleText: "Flashback {3}{R}" })]).instantSpeed).toBe(0);
  });
});

describe("comboFacts", () => {
  const ref = (variantId: string, names: string[], mv: number | null) => ({
    variantId, cards: names.map((name) => ({ name })), produces: ["Infinite mana"], bracketTag: "R", usesCommander: false, manaValueNeeded: mv,
  });
  it("lists free combos first, caps at six, and carries what each produces", () => {
    const profile = { brackets: { twoCardCombos: [
      ref("b", ["A", "B"], 3), ref("a", ["C", "D"], 0), ref("c", ["E", "F"], null),
      ...Array.from({ length: 6 }, (_, i) => ref(`z${i}`, ["G", "H"], 5)),
    ] } } as never;
    const out = comboFacts(profile);
    expect(out).toHaveLength(6);
    expect(out[0]).toMatchObject({ pieces: ["C", "D"], produces: ["Infinite mana"], manaNeeded: 0 });
    expect(out[1].pieces).toEqual(["A", "B"]);
  });
  it("is empty for a deck with no assembled combo, which the prompt then leaves unmentioned", () => {
    expect(comboFacts({ brackets: { twoCardCombos: [] } } as never)).toEqual([]);
  });
});

describe("deckStatsFact", () => {
  it("uses the slowest commander of a pair", () => {
    expect(deckStatsFact(10, [3, 5], []).commanderCastTurn).toBe(expectedCastTurn(5, 10));
    expect(deckStatsFact(10, [], []).commanderCastTurn).toBeNull();
  });
});

describe("fitsIdentity", () => {
  it("accepts a subset and refuses an off-colour card", () => {
    expect(fitsIdentity(["U", "R"], ["U"])).toBe(true);
    expect(fitsIdentity(["U", "R"], [])).toBe(true);
    expect(fitsIdentity(["U", "R"], ["U", "G"])).toBe(false);
  });
});

describe("deckStatsFact cast ramp", () => {
  it("estimates from the ramp the 99 can draw, not the displayed whole-deck count", () => {
    const whole = deckStatsFact(10, [5], []);
    const castable = deckStatsFact(10, [5], [], 9);
    expect(castable.ramp).toBe(10);
    expect(castable.commanderCastTurn).toBe(expectedCastTurn(5, 9));
    expect(whole.commanderCastTurn).toBe(expectedCastTurn(5, 10));
  });
});

describe("overviewV2Enabled", () => {
  it("is on only for exactly 'true'", () => {
    expect(overviewV2Enabled({ OVERVIEW_V2_ENABLED: "true" } as never)).toBe(true);
    for (const v of [undefined, "", "1", "TRUE", "false"]) expect(overviewV2Enabled({ OVERVIEW_V2_ENABLED: v } as never)).toBe(false);
  });
});
