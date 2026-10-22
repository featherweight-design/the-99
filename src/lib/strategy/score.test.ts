import { describe, expect, it } from "vitest";
import type { LabelTheme } from "../labels/types";
import { BROAD_THEMES, MIN_NONLAND, TOP_AXES, catalogBaseline, deckStrategy, scoredAxes, themeCounts, type StrategyCard } from "./score";

const card = (typeLine: string, themes: LabelTheme[] = [], quantity = 1, manaValue = 3): StrategyCard => ({ typeLine, manaValue, keywords: [], themes, quantity });
const many = (n: number, c: StrategyCard) => Array.from({ length: n }, () => c);

// A catalog of 1,000 cards where every axis and theme is rare (1%), so a deck leaning on one lifts far above it.
const catalog = catalogBaseline([
  ...many(10, card("Artifact")),
  ...many(10, card("Enchantment")),
  ...many(10, card("Creature — Elf")),
  ...many(10, card("Instant", ["tokens"])),
  ...many(10, card("Instant", ["mill"])),
  ...many(10, card("Instant", ["tribal"])),
  ...many(10, card("Instant", ["evasion"])),
  ...many(930, card("Sorcery")),
]);
const filler = (n: number) => many(n, card("Sorcery"));

describe("themeCounts", () => {
  it("counts a card once per theme, by quantity", () => {
    const c = themeCounts([card("Instant", ["mill", "mill", "tokens"], 2)]);
    expect(c.get("mill")).toBe(2);
    expect(c.get("tokens")).toBe(2);
  });
});

describe("scoredAxes", () => {
  it("scores type-line axes and label themes together, best first", () => {
    const axes = scoredAxes([...many(20, card("Artifact")), ...many(8, card("Instant", ["mill"])), ...filler(32)], catalog);
    expect(axes.map((a) => [a.key, a.family, a.copies])).toEqual([["artifacts", "type", 20], ["mill", "theme", 8]]);
    expect(axes[0].score).toBeCloseTo(20 * Math.log(20 / 60 / 0.01));
  });

  it("drops an axis under the five-copy floor", () => {
    expect(scoredAxes([...many(4, card("Artifact")), ...filler(56)], catalog)).toEqual([]);
  });

  it("replaces the tribal theme with a creature type when one scores", () => {
    const elves = many(20, card("Creature — Elf", ["tribal"]));
    expect(scoredAxes([...elves, ...filler(40)], catalog).map((a) => a.key)).toEqual(["typal:Elf"]);
    // With no type over the floor, tribal stands.
    const mixed = [...many(4, card("Creature — Elf", ["tribal"])), ...many(4, card("Creature — Goblin", ["tribal"])), ...filler(52)];
    expect(scoredAxes(mixed, catalog).map((a) => a.key)).toEqual(["tribal"]);
  });

  it("draws a broad theme but does not offer lean-in on it", () => {
    const [axis] = scoredAxes([...many(10, card("Instant", ["evasion"])), ...filler(50)], catalog);
    expect(axis).toMatchObject({ key: "evasion", leanable: false });
    expect(BROAD_THEMES.has("evasion")).toBe(true);
    expect(scoredAxes([...many(10, card("Instant", ["mill"])), ...filler(50)], catalog)[0].leanable).toBe(true);
  });
});

describe("deckStrategy", () => {
  it("draws at most the top five and never pads", () => {
    const six = [
      ...many(12, card("Artifact")), ...many(11, card("Enchantment")), ...many(10, card("Instant", ["tokens"])),
      ...many(9, card("Instant", ["mill"])), ...many(8, card("Creature — Elf")), ...many(7, card("Instant", ["evasion"])), ...filler(3),
    ];
    const r = deckStrategy(six, catalog);
    expect(r.state === "ok" && r.axes.length).toBe(TOP_AXES);
    const two = deckStrategy([...many(12, card("Artifact")), ...many(9, card("Instant", ["mill"])), ...filler(39)], catalog);
    expect(two.state === "ok" && two.axes.map((a) => a.key)).toEqual(["artifacts", "mill"]);
  });

  it("reads none when nothing clears the floor, and carries no verdict", () => {
    expect(deckStrategy(filler(60), catalog)).toEqual({ state: "none" });
  });

  it("refuses a list under the nonland floor, counting copies", () => {
    expect(deckStrategy(many(MIN_NONLAND - 1, card("Artifact")), catalog)).toEqual({ state: "tooSmall", nonland: MIN_NONLAND - 1 });
    expect(deckStrategy([card("Artifact", [], MIN_NONLAND)], catalog).state).toBe("ok");
  });
});
