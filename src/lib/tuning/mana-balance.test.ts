import { describe, expect, it } from "vitest";
import type { ManaColor, ManaSupplyCardRow } from "../mana/supply";
import { readManaBalance, PATTERNS_SHOWN } from "./mana-balance";

const land = (id: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({ id, typeLine: "Land", manaCost: null, quantity, produces });
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });
const rock = (id: string, manaCost: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({ id, typeLine: "Artifact", manaCost, quantity, produces, ramp: true });
const commander = (i: number, manaCost: string): ManaSupplyCardRow => ({ id: `commander:${i}`, typeLine: "Legendary Creature", manaCost, quantity: 1 });
const tapped = { always: 0, unless: 0, lands: 0 };
const read = (rows: ManaSupplyCardRow[], t = tapped) => readManaBalance({ rows, nameOf: (id) => id, tapped: t });
const color = (b: ReturnType<typeof read>, c: ManaColor) => b.colors.find((x) => x.color === c)!;

describe("readManaBalance: pips", () => {
  it("counts the pips with the commander and without it", () => {
    const b = read([spell("a", "{G}{G}", 10), commander(0, "{3}{G}{U}"), land("forest", 10, ["G"])]);
    expect(color(b, "G").pips).toEqual({ withCommander: 21, withoutCommander: 20 });
    expect(color(b, "U").pips).toEqual({ withCommander: 1, withoutCommander: 0 });
    expect(color(b, "G").pipShare.withCommander).toBeCloseTo(21 / 22);
    expect(color(b, "G").pipShare.withoutCommander).toBe(1);
  });

  it("has no share where the frame holds no pip", () => {
    expect(color(read([commander(0, "{2}{R}")]), "R").pipShare.withoutCommander).toBe(0);
  });
});

describe("readManaBalance: sources", () => {
  it("counts a dual for each color it makes, split into lands and other sources", () => {
    const b = read([spell("a", "{G}{U}", 10), land("dual", 6, ["G", "U"]), land("forest", 4, ["G"]), rock("signet", "{1}", 2, ["G", "U"])]);
    expect(color(b, "G").sources).toEqual({ lands: 10, nonland: 2, total: 12 });
    expect(color(b, "U").sources).toEqual({ lands: 6, nonland: 2, total: 8 });
  });

  it("counts colorless sources apart and leaves an unreadable rock out", () => {
    const b = read([spell("a", "{G}", 5), land("forest", 5, ["G"]), rock("ring", "{1}", 1, ["C"]), rock("mystery", "{2}", 2, [])]);
    expect(b.colorless.supply).toBe(1);
    expect(b.unattributedNonland).toBe(2);
    expect(color(b, "G").sources.total).toBe(5);
  });
});

describe("readManaBalance: patterns", () => {
  const cards = [
    spell("Courser", "{2}{G}{G}", 1),
    spell("Archdruid", "{1}{G}{G}", 1),
    spell("Armasaur", "{1}{G}{G}", 1),
    spell("Bear", "{1}{G}", 3),
    commander(0, "{5}{R}{G}{W}"),
    land("forest", 10, ["G"]),
  ];

  it("groups cards by pattern, hardest first, with the cards behind each and Karsten's figure", () => {
    const g = color(read(cards), "G").patterns;
    expect(g.map((p) => p.pattern)).toEqual(["1CC", "2CC", "1C", "7C"]);
    expect(g[0]).toMatchObject({ copies: 2, karsten: { kind: "known", sources: 28 }, cards: [{ name: "Archdruid", copies: 1, commander: false }, { name: "Armasaur", copies: 1, commander: false }] });
    expect(g[1].karsten).toEqual({ kind: "known", sources: 26 });
    expect(g[2]).toMatchObject({ copies: 3, karsten: { kind: "known", sources: 19 } });
  });

  it("includes the commander as a card and marks it", () => {
    // Its red and white pips are generic mana for green: eight mana value, one green pip.
    const g = color(read(cards), "G").patterns.find((p) => p.pattern === "7C")!;
    expect(g.cards).toEqual([{ name: "commander:0", copies: 1, commander: true }]);
    expect(g.karsten).toEqual({ kind: "atMost", sources: 14 });
  });

  it("never lists a land, and marks a pattern past the table as a ceiling", () => {
    const b = read([{ id: "mdfc", typeLine: "Land", manaCost: "{G}{G}", quantity: 1, produces: ["G"] }, spell("big", "{6}{G}", 1)]);
    expect(color(b, "G").patterns).toEqual([expect.objectContaining({ pattern: "6C", karsten: { kind: "atMost", sources: 14 } })]);
  });

  it("shows only the hardest PATTERNS_SHOWN", () => {
    const many = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => spell(`c${n}`, `{${n}}{G}`));
    expect(color(read(many), "G").patterns).toHaveLength(PATTERNS_SHOWN);
  });
});

describe("readManaBalance: lands", () => {
  it("reports the land count, the tapped counts, the average mana value and Karsten's figure", () => {
    const t = { always: 3, unless: 2, lands: 10 };
    const b = read([spell("a", "{3}{G}", 4), commander(0, "{4}{G}"), rock("sig", "{2}", 2, ["G"]), land("forest", 10, ["G"])], t);
    // (4 + 4 + 4 + 4 + 5 + ...) nonland: 4 x 4 + 5 (commander) + 2 x 2 = 25 over 7 cards.
    expect(b.lands.count).toBe(10);
    expect(b.lands.tapped).toEqual(t);
    expect(b.lands.averageManaValue).toBeCloseTo(25 / 7);
    expect(b.lands.cheapRamp).toBe(2);
    expect(b.lands.karstenLands).toBeCloseTo(31.42 + 3.13 * (25 / 7) - 0.28 * 2);
  });

  it("counts only mana sources of mana value three or less as cheap ramp", () => {
    const b = read([rock("cheap", "{2}", 1, ["G"]), rock("edge", "{3}", 2, ["G"]), rock("dear", "{4}", 1, ["G"]), spell("a", "{G}"), land("forest", 1, ["G"])]);
    expect(b.lands.cheapRamp).toBe(3);
  });
});

describe("readManaBalance: state", () => {
  it("reads a deck with no colored pip as colorless, and pips with no colored source as noSources", () => {
    expect(read([spell("a", "{4}", 5), land("wastes", 5, ["C"])]).state).toBe("colorless");
    expect(read([spell("a", "{G}", 5), land("wastes", 5, ["C"])]).state).toBe("noSources");
    expect(read([spell("a", "{G}", 5), land("forest", 5, ["G"])]).state).toBe("ok");
  });

  it("carries no verdict field anywhere", () => {
    const b = read([spell("a", "{G}", 5), land("forest", 5, ["G"])]);
    expect(JSON.stringify(b)).not.toMatch(/short|"gap"|target|"met"/);
  });
});
