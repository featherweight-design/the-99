import { describe, expect, it } from "vitest";
import { FIXED_AXES } from "../strategy/axes";
import { CREATURE_TYPES } from "../strategy/creature-types.generated";
import { THEMES } from "../labels/types";
import { creatureTypePlural, strategyName } from "./strategy-focus";

describe("strategyName", () => {
  it("takes the names the handoff draws", () => {
    expect(strategyName("tokens")).toBe("Tokens");
    expect(strategyName("spellslinger")).toBe("Spells matter");
    expect(strategyName("counters")).toBe("+1/+1 counters");
    expect(strategyName("voltron")).toBe("Equipment and Auras");
    expect(strategyName("bigCreatures")).toBe("Creatures costing 6+");
    expect(strategyName("typal:Ally")).toBe("Allies");
    expect(strategyName("typal:Elf")).toBe("Elves");
    expect(strategyName("typal:Insect")).toBe("Insects");
  });

  it("names every strategy, with no em dash", () => {
    const keys = [...THEMES, ...FIXED_AXES, ...CREATURE_TYPES.map((t) => `typal:${t}` as const)];
    for (const k of keys) expect(strategyName(k)).toMatch(/^[^—]+$/);
  });
});

describe("creatureTypePlural", () => {
  it("follows the endings, with the irregulars and the unchanged", () => {
    expect(["Fox", "Sphinx", "Harpy", "Monkey", "Merfolk", "Eldrazi", "Wolf", "Human", "Time Lord", "Sheep", "Mouse"].map(creatureTypePlural))
      .toEqual(["Foxes", "Sphinxes", "Harpies", "Monkeys", "Merfolk", "Eldrazi", "Wolves", "Humans", "Time Lords", "Sheep", "Mice"]);
  });
});
