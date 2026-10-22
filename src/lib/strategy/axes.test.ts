import { describe, expect, it } from "vitest";
import { AXIS_FLOOR, BASELINE_FLOOR, axisCounts, axisScore, baselineShare, creatureTypesIn, deckAxes, fixedAxesOf, type AxisCard } from "./axes";

const card = (typeLine: string, manaValue = 3, quantity = 1, keywords: string[] = []): AxisCard => ({ typeLine, manaValue, keywords, quantity });
const many = (n: number, c: AxisCard) => Array.from({ length: n }, () => c);

describe("fixedAxesOf", () => {
  it("counts an artifact creature as an artifact", () => {
    expect(fixedAxesOf(card("Artifact Creature — Construct"))).toEqual(["artifacts"]);
  });

  it("files Equipment and Auras under voltron, Vehicles under vehicles, both beside their card type", () => {
    expect(fixedAxesOf(card("Artifact — Equipment"))).toEqual(["artifacts", "voltron"]);
    expect(fixedAxesOf(card("Enchantment — Aura"))).toEqual(["enchantments", "voltron"]);
    expect(fixedAxesOf(card("Artifact — Vehicle"))).toEqual(["artifacts", "vehicles"]);
  });

  it("reads a big creature off mana value, and only a creature", () => {
    expect(fixedAxesOf(card("Creature — Dinosaur", 6))).toEqual(["bigCreatures"]);
    expect(fixedAxesOf(card("Creature — Dinosaur", 5))).toEqual([]);
    expect(fixedAxesOf(card("Sorcery", 7))).toEqual([]);
  });

  it("reads the front face only", () => {
    expect(fixedAxesOf(card("Creature — Human Wizard // Artifact — Equipment"))).toEqual([]);
  });
});

describe("axisCounts and deckAxes", () => {
  it("multiplies by quantity and counts every creature type a card carries", () => {
    const c = axisCounts([card("Creature — Elf Druid", 2, 3), card("Instant")]);
    expect(c.total).toBe(4);
    expect(c.types.get("Elf")).toBe(3);
    expect(c.types.get("Druid")).toBe(3);
  });

  it("counts a Kindred card's creature types", () => {
    expect(axisCounts([card("Kindred Instant — Goblin")]).types.get("Goblin")).toBe(1);
    expect(axisCounts([card("Tribal Enchantment — Faerie Aura")]).types.get("Faerie")).toBe(1);
  });

  it("reads only creature types as typal, and a two-word type as one", () => {
    const aura = axisCounts([card("Tribal Enchantment — Faerie Aura")]);
    expect([...aura.types.keys()]).toEqual(["Faerie"]);
    const equipCat = axisCounts([card("Artifact Creature — Equipment Cat")]);
    expect([...equipCat.types.keys()]).toEqual(["Cat"]);
    const doctor = axisCounts([card("Legendary Creature — Time Lord Doctor")]);
    expect([...doctor.types.keys()].sort()).toEqual(["Doctor", "Time Lord"]);
    expect(deckAxes(axisCounts(many(5, card("Legendary Creature — Time Lord Doctor")))).has("typal:Time Lord")).toBe(true);
  });

  it("does not read a noncreature's subtypes as creature types", () => {
    expect(axisCounts([card("Artifact — Equipment")]).types.size).toBe(0);
  });

  it("picks only types held by the floor, at most three, ranked by copies", () => {
    const axes = deckAxes(axisCounts([
      ...many(9, card("Creature — Elf")), ...many(7, card("Creature — Druid")), ...many(6, card("Creature — Warrior")),
      ...many(5, card("Creature — Shaman")), ...many(AXIS_FLOOR - 1, card("Creature — Goblin")),
    ]));
    expect([...axes.keys()].filter((k) => k.startsWith("typal:"))).toEqual(["typal:Elf", "typal:Druid", "typal:Warrior"]);
  });

  it("adds changelings to the picked types only, after the pick", () => {
    const counts = axisCounts([...many(5, card("Creature — Elf")), ...many(4, card("Creature — Goblin")), card("Creature — Shapeshifter", 2, 2, ["Changeling"])]);
    const axes = deckAxes(counts);
    expect(axes.get("typal:Elf")).toBe(7);
    expect(axes.has("typal:Goblin")).toBe(false);
    expect(counts.types.has("Shapeshifter")).toBe(false);
  });
});

describe("baselineShare and axisScore", () => {
  it("looks a typal axis up in the baseline with its changelings, and floors a share the baseline never holds", () => {
    const base = axisCounts([...many(10, card("Creature — Elf")), card("Creature — Shapeshifter", 2, 10, ["Changeling"]), ...many(80, card("Instant"))]);
    expect(baselineShare(base, "typal:Elf")).toBeCloseTo(0.2);
    expect(baselineShare(base, "typal:Goblin")).toBeCloseTo(0.1);
    expect(baselineShare(axisCounts([card("Instant")]), "vehicles")).toBe(BASELINE_FLOOR);
  });

  it("scores copies × ln(lift), and 0 under the floor or at no lean", () => {
    expect(axisScore(10, 100, 0.05)).toBeCloseTo(10 * Math.log(2));
    expect(axisScore(AXIS_FLOOR - 1, 10, 0.01)).toBe(0);
    expect(axisScore(10, 100, 0.1)).toBe(0);
    expect(axisScore(10, 100, 0)).toBeCloseTo(10 * Math.log(0.1 / BASELINE_FLOOR));
  });
});

describe("creatureTypesIn", () => {
  it("matches the longest type first and skips non-creature subtypes", () => {
    expect(creatureTypesIn(["Time", "Lord", "Doctor"])).toEqual(["Time Lord", "Doctor"]);
    expect(creatureTypesIn(["Equipment", "Cat"])).toEqual(["Cat"]);
    expect(creatureTypesIn(["Lord"])).toEqual([]);
  });
});
