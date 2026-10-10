import { describe, expect, it } from "vitest";
import type { ManaColor, ManaSupplyCardRow } from "../mana/supply";
import { readManaBalance, SHORT_BY } from "./mana-balance";

const land = (id: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({
  id,
  typeLine: "Land",
  manaCost: null,
  quantity,
  produces,
});
const spell = (id: string, manaCost: string, quantity: number): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });
const rock = (id: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({
  id,
  typeLine: "Artifact",
  manaCost: "{2}",
  quantity,
  produces,
  ramp: true,
});
const by = (rows: ManaSupplyCardRow[]) => Object.fromEntries(readManaBalance(rows).colors.map((c) => [c.color, c]));

describe("readManaBalance", () => {
  it("names the color whose share of the sources is under its share of the pips", () => {
    // 30 G pips and 10 U pips ask for 75% / 25% of the 20 sources; 10 / 10 gives G 5 too few.
    const b = by([spell("g", "{G}", 30), spell("u", "{U}", 10), land("forest", 10, ["G"]), land("island", 10, ["U"])]);
    expect(b.G).toMatchObject({ demand: 30, target: 15, gap: 5, state: "short" });
    expect(b.G.pipShare).toBeCloseTo(0.75);
    expect(b.U).toMatchObject({ demand: 10, target: 5, gap: -5, state: "met" });
  });

  it("counts a dual for both colors and once in the source total", () => {
    const b = readManaBalance([spell("g", "{G}", 10), spell("u", "{U}", 10), land("dual", 20, ["G", "U"])]);
    expect(b.sourceCards).toBe(20);
    expect(b.colors.find((c) => c.color === "G")).toMatchObject({ target: 10, gap: -10, state: "met" });
    expect(b.colors.find((c) => c.color === "U")).toMatchObject({ target: 10, gap: -10, state: "met" });
  });

  it("counts a colorless source in no color's share", () => {
    const b = readManaBalance([spell("r", "{R}", 20), land("mountain", 18, ["R"]), rock("ring", 1, ["C"]), land("wastes", 4, ["C"])]);
    expect(b.sourceCards).toBe(18);
    expect(b.colorless).toEqual({ demand: 0, supply: 5 });
    expect(b.colors.find((c) => c.color === "R")).toMatchObject({ target: 18, gap: 0, state: "met" });
  });

  it("is short at exactly SHORT_BY sources under, and met one pip of rounding short of it", () => {
    expect(SHORT_BY).toBe(1);
    // 6 W of 10 pips on 11 sources: target round(6.6) = 7 against 6 held.
    const short = by([spell("w", "{W}", 6), spell("u", "{U}", 4), land("plains", 6, ["W"]), land("island", 5, ["U"])]);
    expect(short.W).toMatchObject({ target: 7, gap: 1, state: "short" });
    // 6 W of 10 pips on 10 sources: target 6 against 6 held.
    const met = by([spell("w", "{W}", 6), spell("u", "{U}", 4), land("plains", 6, ["W"]), land("island", 4, ["U"])]);
    expect(met.W).toMatchObject({ target: 6, gap: 0, state: "met" });
  });

  it("counts a commander's pips as demand and never its text as a source", () => {
    const b = readManaBalance([
      { id: "commander:0", typeLine: "Legendary Creature", manaCost: "{3}{G}{G}", quantity: 1 },
      land("forest", 10, ["G"]),
    ]);
    expect(b.colors.find((c) => c.color === "G")).toMatchObject({ demand: 2, supply: { total: 10 } });
  });

  it("reads a non-land source with no readable color as unattributed, in no share", () => {
    const b = readManaBalance([spell("g", "{G}", 10), land("forest", 10, ["G"]), rock("mystery", 2, [])]);
    expect(b.unattributedNonland).toBe(2);
    expect(b.sourceCards).toBe(10);
  });

  it("splits lands from non-land sources and counts a rock for each color it adds", () => {
    const b = by([spell("g", "{G}{U}", 10), land("forest", 8, ["G"]), land("island", 8, ["U"]), rock("signet", 3, ["G", "U"])]);
    expect(b.G.supply).toEqual({ lands: 8, nonland: 3, total: 11 });
    expect(b.U.supply).toEqual({ lands: 8, nonland: 3, total: 11 });
  });

  it("reports a deck with no colored pip as colorless and a deck with pips and no source as noSources", () => {
    expect(readManaBalance([spell("x", "{4}", 20), land("wastes", 10, ["C"])]).state).toBe("colorless");
    const none = readManaBalance([spell("g", "{G}", 10), land("wastes", 10, ["C"])]);
    expect(none.state).toBe("noSources");
    expect(none.colors.find((c) => c.color === "G")).toMatchObject({ demand: 10, target: 0, state: "met" });
  });

  it("agrees with manaSupply on every figure it restates", () => {
    const rows = [spell("g", "{G}{G}", 12), spell("h", "{G/U}", 4), land("forest", 9, ["G"]), land("dual", 5, ["G", "U"]), rock("lore", 2, ["G"])];
    const b = readManaBalance(rows);
    for (const c of b.colors) {
      expect(c.demand).toBe(b.supply.demand[c.color]);
      expect(c.supply).toMatchObject({ lands: b.supply.supply[c.color].lands, nonland: b.supply.supply[c.color].nonland });
    }
    // The hybrid pip asks for either half: once under G and once under U.
    expect(b.colors.find((c) => c.color === "U")?.demand).toBe(4);
  });
});
