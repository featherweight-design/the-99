import { describe, expect, it } from "vitest";
import { landProduces, manaSupply, type ManaSupplyCardRow } from "./supply";

const JUND = ["B", "R", "G"];

describe("landProduces", () => {
  it("reads a basic from its type", () => {
    expect(landProduces("Basic Land — Forest", "({T}: Add {G}.)", JUND)).toEqual(["G"]);
  });
  it("reads a typed dual from its type line and a plain dual from its text", () => {
    expect(landProduces("Land — Forest Island", null, JUND)).toEqual(["U", "G"]);
    expect(landProduces("Land", "{T}: Add {B} or {R}.", JUND)).toEqual(["B", "R"]);
  });
  it("counts a white ability on a colorless land only where it ADDS white", () => {
    expect(landProduces("Land", "{T}: Add {C}.\n{W}, {T}: Create a 1/1 white Spirit.", JUND)).toEqual(["C"]);
  });
  it("gives an any-color land each of the deck's colors", () => {
    expect(landProduces("Land", "{T}: Add one mana of any color in your commander's color identity.", JUND)).toEqual(["B", "R", "G"]);
    expect(landProduces("Land", "{T}: Add one mana of any color in your commander's color identity.", [])).toEqual([]);
  });
  it("gives a fetch the basic types it names, and a basic-land search the deck's colors", () => {
    expect(landProduces("Land", "{T}, Pay 1 life, Sacrifice this land: Search your library for a Swamp or Forest card, put it onto the battlefield, then shuffle.", JUND)).toEqual(["B", "G"]);
    expect(landProduces("Land", "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.", JUND)).toEqual(["B", "R", "G"]);
  });
  it("ignores reminder text, so landcycling is not a fetch", () => {
    expect(landProduces("Land", "{T}: Add {C}.\nBasic landcycling {1} ({1}, Discard this card: Search your library for a basic land card, reveal it, put it into your hand, then shuffle.)", JUND)).toEqual(["C"]);
  });
});

const row = (o: Partial<ManaSupplyCardRow>): ManaSupplyCardRow => ({ typeLine: "Creature", manaCost: null, quantity: 1, ...o });

describe("manaSupply", () => {
  it("counts raw pips per copy, hybrid once per half, and drops generic and Phyrexian pips", () => {
    const s = manaSupply([
      row({ manaCost: "{2}{R}{R}", quantity: 2 }),
      row({ manaCost: "{W/U}{G}" }),
      row({ manaCost: "{1}{W/P}{2/B}{C}" }),
    ]);
    expect(s.demand).toEqual({ W: 1, U: 1, B: 0, R: 4, G: 1, C: 1 });
  });
  it("counts a land once for each color it adds, per copy, and a dual twice over the deck", () => {
    const s = manaSupply([
      row({ typeLine: "Basic Land — Forest", quantity: 5, produces: ["G"] }),
      row({ typeLine: "Land", produces: ["B", "G"] }),
      row({ typeLine: "Land", produces: [] }),
    ]);
    expect(s.supply.G.lands).toBe(6);
    expect(s.supply.B.lands).toBe(1);
    expect(s.lands).toBe(7);
  });
  it("puts non-land ramp in unattributedNonland and never into a color", () => {
    const s = manaSupply([row({ typeLine: "Artifact", ramp: true, quantity: 2, manaCost: "{1}" }), row({ ramp: true })]);
    expect(s.unattributedNonland).toBe(3);
    expect(Object.values(s.supply).every((x) => x.nonland === 0 && x.lands === 0)).toBe(true);
  });
  it("takes a land's cost and its ramp flag for nothing", () => {
    const s = manaSupply([row({ typeLine: "Land", manaCost: "{R}", ramp: true, produces: ["R"] })]);
    expect(s.demand.R).toBe(0);
    expect(s.unattributedNonland).toBe(0);
  });
  it("is all zeros for an empty frame", () => {
    const s = manaSupply([]);
    expect(s.lands).toBe(0);
    expect(Object.values(s.demand).every((n) => n === 0)).toBe(true);
  });
});
