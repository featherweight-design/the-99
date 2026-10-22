import { describe, expect, it } from "vitest";
import type { LabelTheme } from "../labels/types";
import {
  MIN_NONLAND, TOP_AXES, catalogBaseline, deckStrategy, onStrategy, pendingChanges, scoredAxes, strategyAxis, themeCounts,
  type KeyedStrategyCard, type StrategyCard,
} from "./score";

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

  it("scores a broad theme like any other: it can be the focus", () => {
    const [axis] = scoredAxes([...many(10, card("Instant", ["evasion"])), ...filler(50)], catalog);
    expect(axis).toEqual({ key: "evasion", family: "theme", copies: 10, score: expect.any(Number) });
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

describe("onStrategy", () => {
  it("reads a theme off the labels and an axis off the type line, a changeling on every type", () => {
    expect(onStrategy(card("Instant", ["mill"]), "mill")).toBe(true);
    expect(onStrategy(card("Instant", ["mill"]), "tokens")).toBe(false);
    expect(onStrategy(card("Artifact Creature — Elf"), "artifacts")).toBe(true);
    expect(onStrategy(card("Artifact Creature — Elf"), "typal:Elf")).toBe(true);
    expect(onStrategy(card("Artifact Creature — Elf"), "typal:Goblin")).toBe(false);
    expect(onStrategy({ ...card("Creature — Shapeshifter"), keywords: ["Changeling"] }, "typal:Goblin")).toBe(true);
    // A creature type on a card that cannot carry one (an Equipment's subtype) is not a creature type.
    expect(onStrategy(card("Artifact — Equipment"), "typal:Elf")).toBe(false);
  });
});

describe("strategyAxis", () => {
  it("returns the scored axis when the deck scores it", () => {
    const cards = [...many(20, card("Artifact")), ...filler(40)];
    expect(strategyAxis(cards, catalog, "artifacts")).toEqual(scoredAxes(cards, catalog)[0]);
  });

  it("still counts a focus the deck no longer scores, and scores it 0", () => {
    const cards = [...many(3, card("Instant", ["mill"])), ...filler(57)];
    expect(strategyAxis(cards, catalog, "mill")).toEqual({ key: "mill", family: "theme", copies: 3, score: 0 });
    // A creature type the deck does not rank among its types still counts its own cards.
    const elves = [...many(4, card("Creature — Elf")), ...filler(56)];
    expect(strategyAxis(elves, catalog, "typal:Elf")).toMatchObject({ family: "type", copies: 4, score: 0 });
  });
});

describe("pendingChanges", () => {
  const keyed = (oracleId: string, c: StrategyCard): KeyedStrategyCard => ({ ...c, oracleId });
  const mill = (id: string, q = 1) => keyed(id, card("Instant", ["mill"], q));
  const art = (id: string) => keyed(id, card("Artifact"));

  it("counts adds and cuts per strategy by the card's quantity change", () => {
    const committed = [mill("a"), mill("b"), art("c")];
    const live = [mill("a", 3), art("c"), art("d")];
    expect(pendingChanges(committed, live, ["mill", "artifacts", "tokens"])).toEqual({
      mill: { added: 2, removed: 1 },
      artifacts: { added: 1, removed: 0 },
    });
  });

  it("reports nothing for an unchanged list", () => {
    const list = [mill("a"), art("c")];
    expect(pendingChanges(list, list, ["mill", "artifacts"])).toEqual({});
  });

  it("judges a kept card by its labels now", () => {
    const committed = [keyed("a", card("Instant", [], 1))];
    const live = [keyed("a", card("Instant", ["mill"], 2))];
    expect(pendingChanges(committed, live, ["mill"])).toEqual({ mill: { added: 1, removed: 0 } });
  });
});
