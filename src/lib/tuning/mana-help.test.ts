import { describe, expect, it } from "vitest";
import type { ManaColor, ManaSupplyCardRow } from "../mana/supply";
import { helpAddColor, type BasicCatalog } from "./mana-help";
import type { StapleCandidate } from "./mana-staples";

const basics: BasicCatalog = {
  W: { id: "plains", name: "Plains" },
  U: { id: "island", name: "Island" },
  B: { id: "swamp", name: "Swamp" },
  R: { id: "mountain", name: "Mountain" },
  G: { id: "forest", name: "Forest" },
};
const basic = (id: string, name: string, quantity: number, color: ManaColor): ManaSupplyCardRow => ({ id, typeLine: `Basic Land — ${name}`, manaCost: null, quantity, produces: [color] });
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });
const staple = (name: string, produces: ManaColor[], over: Partial<StapleCandidate> = {}): StapleCandidate => ({
  oracleId: name,
  name,
  typeLine: "Artifact",
  manaCost: "{2}",
  produces,
  fact: { kind: "commander", inclusion: 40 },
  free: 1,
  priceCents: 15,
  ...over,
});
const help = (rows: ManaSupplyCardRow[], color: ManaColor, locked: string[] = [], candidates: StapleCandidate[] = []) =>
  helpAddColor(rows, (id) => id[0].toUpperCase() + id.slice(1), new Set(locked), basics, candidates, color as "G");

// A one-pip green and a one-pip blue spell are pattern C: Karsten asks 19 sources of each (99-card column).
// Ten Forests leave green under 19; twenty-five Islands put blue over it, with six to spare.
const deck = () => [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 25, "U")];

describe("helpAddColor: rebalance", () => {
  it("moves basics from a color with cover to the picked color, up to the point that color would drop under Karsten's figure", () => {
    const h = help(deck(), "G");
    expect(h.sourcesNow).toBe(10);
    expect(h.rebalance).toEqual([
      { kind: "rebalance", from: "U", basicOut: "Island", basicIn: "Forest", maxCopies: 6, changes: [{ color: "U", before: 25, after: 19 }, { color: "G", before: 10, after: 16 }] },
    ]);
  });

  it("never moves a locked basic", () => {
    expect(help(deck(), "G", ["island"]).rebalance).toEqual([]);
  });

  it("moves nothing from a color that is already under its figure, not even one", () => {
    const rows = [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 18, "U")];
    expect(help(rows, "G").rebalance).toEqual([]);
  });

  it("lets a color with no pips and no published figure give up all its basics", () => {
    const rows = [spell("g", "{G}"), basic("forest", "Forest", 10, "G"), basic("plains", "Plains", 3, "W")];
    expect(help(rows, "G").rebalance).toMatchObject([{ from: "W", maxCopies: 3 }]);
  });

  it("brings in the picked color's basic when the deck holds none", () => {
    const rows = [spell("g", "{G}"), basic("plains", "Plains", 4, "W")];
    expect(help(rows, "G").rebalance).toMatchObject([{ from: "W", basicIn: "Forest", maxCopies: 4, changes: [{ color: "W", before: 4, after: 0 }, { color: "G", before: 0, after: 4 }] }]);
  });

  it("offers a move from each color that can give, and none from the picked color itself", () => {
    const rows = [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 25, "U"), basic("plains", "Plains", 2, "W")];
    expect(help(rows, "G").rebalance.map((m) => m.from).sort()).toEqual(["U", "W"]);
  });
});

describe("helpAddColor: trades and staples", () => {
  it("trades a basic of the color with the most cover for a staple that adds the picked color", () => {
    const h = help(deck(), "G", [], [staple("Signet", ["G", "U"]), staple("Elfhat", ["G"])]);
    // Equal inclusion and both owned: alphabetical.
    expect(h.staples.map((s) => s.name)).toEqual(["Elfhat", "Signet"]);
    expect(h.trades.map((t) => [t.staple.name, t.basicOut, t.basicOutColor, t.changes])).toEqual([
      ["Elfhat", "Island", "U", [{ color: "U", before: 25, after: 24 }, { color: "G", before: 10, after: 11 }]],
      // The Signet makes blue too, so the Island it replaces costs blue nothing.
      ["Signet", "Island", "U", [{ color: "G", before: 10, after: 11 }]],
    ]);
  });

  it("offers a staple that adds nothing of the picked color no place", () => {
    const h = help(deck(), "G", [], [staple("Mox", ["W"])]);
    expect(h.staples).toEqual([]);
    expect(h.trades).toEqual([]);
  });

  it("offers no trade when the only basics that could go are the picked color's own or under their figure", () => {
    const rows = [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 10, "U")];
    const h = help(rows, "G", [], [staple("Elfhat", ["G"])]);
    expect(h.staples).toHaveLength(1);
    expect(h.trades).toEqual([]);
  });

  it("does not trade away a locked basic", () => {
    expect(help(deck(), "G", ["island"], [staple("Elfhat", ["G"])]).trades).toEqual([]);
  });

  it("counts a trade for a staple that also makes the color it replaces, so the replaced color keeps its count", () => {
    const rows = [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 19, "U")];
    // Island 19 sits exactly at its figure: an Island out is a blue source lost, a green-blue rock in gives it back.
    expect(help(rows, "G", [], [staple("Elfhat", ["G"])]).trades).toEqual([]);
    expect(help(rows, "G", [], [staple("Signet", ["G", "U"])]).trades).toMatchObject([{ basicOut: "Island", changes: [{ color: "G", before: 10, after: 11 }] }]);
  });

  it("puts an owned copy first", () => {
    const h = help(deck(), "G", [], [staple("Popular", ["G"], { free: 0, fact: { kind: "commander", inclusion: 90 } }), staple("Owned", ["G"], { free: 1, fact: { kind: "commander", inclusion: 10 } })]);
    expect(h.staples.map((s) => s.name)).toEqual(["Owned", "Popular"]);
  });
});

describe("helpAddColor: no verdict", () => {
  it("carries no field that calls any color short, fine or met", () => {
    const h = help(deck(), "G", [], [staple("Signet", ["G", "U"])]);
    expect(JSON.stringify(h)).not.toMatch(/short|"gap"|target|"met"|fine/i);
  });
});
