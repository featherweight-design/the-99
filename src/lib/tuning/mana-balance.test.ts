import { describe, expect, it } from "vitest";
import { NO_TAPPED_LANDS } from "../mana/lands-tapped";
import type { ManaColor, ManaSupplyCardRow } from "../mana/supply";
import { readManaBalance, PATTERNS_SHOWN } from "./mana-balance";

const land = (id: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({ id, typeLine: "Land", manaCost: null, quantity, produces });
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });
const rock = (id: string, manaCost: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({ id, typeLine: "Artifact", manaCost, quantity, produces, ramp: true });
const commander = (i: number, manaCost: string): ManaSupplyCardRow => ({ id: `commander:${i}`, typeLine: "Legendary Creature", manaCost, quantity: 1 });
const tapped = NO_TAPPED_LANDS;
const read = (rows: ManaSupplyCardRow[], t = tapped, identity: readonly string[] = ["W", "U", "B", "R", "G"]) => readManaBalance({ rows, nameOf: (id) => id, tapped: t, identity });
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

  it("lists each face of a joined cost as its own way to cast the card, never one summed pattern", () => {
    // An adventure stores both faces: {2}{R} // {1}{R}. It is 2C and 1C, and 3CC does not exist.
    const b = read([{ id: "Adventure", typeLine: "Creature", manaCost: "{2}{R} // {1}{R}", cmc: 3, quantity: 1 }, land("mountain", 5, ["R"])]);
    expect(color(b, "R").patterns.map((p) => [p.pattern, p.copies, p.cards.map((c) => c.name)])).toEqual([["1C", 1, ["Adventure"]], ["2C", 1, ["Adventure"]]]);
  });

  it("counts a card once for a pattern both its faces share", () => {
    const b = read([{ id: "Split", typeLine: "Instant // Instant", manaCost: "{1}{R} // {1}{R}", cmc: 4, quantity: 2 }]);
    expect(color(b, "R").patterns).toHaveLength(1);
    expect(color(b, "R").patterns[0]).toMatchObject({ pattern: "1C", copies: 2 });
  });

  it("takes Karsten's hardest published figure over every pattern, not only the ones shown", () => {
    // Six patterns of five or more pips (no row in the table) fill the list; the plain {G} below them is pattern C: 19.
    const heavy = [0, 1, 2, 3, 4, 5].map((g) => spell(`heavy${g}`, `{${g || ""}}{G}{G}{G}{G}{G}`.replace("{}", "")));
    const b = read([...heavy, spell("plain", "{G}")]);
    const g = color(b, "G");
    expect(g.patterns).toHaveLength(PATTERNS_SHOWN);
    expect(g.patterns.every((p) => p.karsten.kind === "unknown")).toBe(true);
    expect(g.patterns.some((p) => p.pattern === "C")).toBe(false);
    expect(g.karstenHardest).toBe(19);
  });

  it("has no hardest figure for a color whose patterns are all ceilings or unknown, or that has none", () => {
    expect(color(read([spell("big", "{6}{G}")]), "G").karstenHardest).toBe(0);
    expect(color(read([spell("a", "{G}")]), "U").karstenHardest).toBe(0);
  });

  it("shows only the hardest PATTERNS_SHOWN", () => {
    const many = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => spell(`c${n}`, `{${n}}{G}`));
    expect(color(read(many), "G").patterns).toHaveLength(PATTERNS_SHOWN);
  });
});

describe("readManaBalance: lands", () => {
  it("reports the land count, the tapped counts, the average mana value and Karsten's figure", () => {
    const t = { always: 3, unless: 2, fetch: 1, lands: 10, names: { always: [{ name: "A", copies: 3 }], unless: [{ name: "B", copies: 2 }], fetch: [{ name: "C", copies: 1 }] } };
    const b = read([spell("a", "{3}{G}", 4), commander(0, "{4}{G}"), rock("sig", "{2}", 2, ["G"]), land("forest", 10, ["G"])], t);
    // (4 + 4 + 4 + 4 + 5 + ...) nonland: 4 x 4 + 5 (commander) + 2 x 2 = 25 over 7 cards.
    expect(b.lands.count).toBe(10);
    expect(b.lands.tapped).toEqual(t);
    expect(b.lands.averageManaValue).toBeCloseTo(25 / 7);
    expect(b.lands.cheapRamp).toBe(2);
    expect(b.lands.karstenLands).toBeCloseTo(31.42 + 3.13 * (25 / 7) - 0.28 * 2);
  });

  it("takes mana value from the row's Scryfall figure, whatever the stored cost sums to", () => {
    // A split card {1}{R} // {1}{U} has mana value 4 on Scryfall; its front face alone is 2, and a sum of the
    // stored cost is 4 only by coincidence (an adventure {2}{R} // {1}{R} sums to 5 against a mana value of 3).
    const split: ManaSupplyCardRow = { id: "split", typeLine: "Instant // Instant", manaCost: "{1}{R} // {1}{U}", cmc: 4, quantity: 1 };
    const adventure: ManaSupplyCardRow = { id: "adv", typeLine: "Creature", manaCost: "{2}{R} // {1}{R}", cmc: 3, quantity: 1 };
    expect(read([split, { ...spell("one", "{R}"), cmc: 1 }, land("mountain", 3, ["R"])]).lands.averageManaValue).toBe(2.5);
    expect(read([adventure, { ...spell("one", "{R}"), cmc: 1 }, land("mountain", 3, ["R"])]).lands.averageManaValue).toBe(2);
  });

  it("without a Scryfall figure reads the FRONT face's cost", () => {
    const joined: ManaSupplyCardRow = { id: "adv", typeLine: "Creature", manaCost: "{2}{R} // {1}{R}", quantity: 1 };
    expect(read([joined, land("mountain", 3, ["R"])]).lands.averageManaValue).toBe(3);
  });

  it("counts a joined-cost mana source by its mana value, so a 3-mana adventure rock is cheap ramp", () => {
    const rockAdv: ManaSupplyCardRow = { id: "r", typeLine: "Artifact", manaCost: "{2}{G} // {1}{G}", cmc: 3, quantity: 1, produces: ["G"], ramp: true };
    expect(read([rockAdv, land("forest", 1, ["G"])]).lands.cheapRamp).toBe(1);
  });

  it("counts a cheap mana source whose color could not be read, since Karsten's ramp term is every source", () => {
    const b = read([rock("mystery", "{2}", 2, []), spell("a", "{G}"), land("forest", 1, ["G"])]);
    expect(b.unattributedNonland).toBe(2);
    expect(b.lands.cheapRamp).toBe(2);
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

describe("readManaBalance: Needed", () => {
  const neededOf = (rows: ManaSupplyCardRow[], c: ManaColor) => color(read(rows), c).needed;

  it("is the tightest published pattern two or more nonland copies share, with its cards", () => {
    // 28 green sources. 1CC x2 asks 28 (ratio 1); 2C x1 asks 18 but is one card; 1C x3 asks 19.
    const n = neededOf([spell("Archdruid", "{1}{G}{G}"), spell("Armasaur", "{1}{G}{G}"), spell("Bear", "{1}{G}", 3), spell("Lone", "{2}{G}"), land("forest", 28, ["G"])], "G");
    expect(n).toMatchObject({ pattern: "1CC", requires: 28, copies: 2, basis: "shared", ratio: 1 });
    expect(n?.cards).toEqual([{ name: "Archdruid", copies: 1 }, { name: "Armasaur", copies: 1 }]);
  });

  it("does not let a pattern one card carries decide while another is shared", () => {
    // The single-copy CC (30) is tighter than the shared 1C (19), and does not decide.
    const n = neededOf([spell("Solo", "{W}{W}"), spell("A", "{1}{W}"), spell("B", "{1}{W}"), land("plains", 24, ["W"])], "W");
    expect(n).toMatchObject({ pattern: "1C", requires: 19, basis: "shared" });
  });

  it("falls back to the worst single-copy published pattern when no pattern is shared", () => {
    const n = neededOf([spell("Solo", "{W}{W}"), spell("Duo", "{2}{W}{W}"), land("plains", 24, ["W"])], "W");
    expect(n).toMatchObject({ pattern: "CC", requires: 30, copies: 1, basis: "single" });
  });

  it("leaves the commander out of the count and the cards", () => {
    // Two copies would share 1CC only with the commander counted.
    const n = neededOf([commander(0, "{1}{G}{G}"), spell("Armasaur", "{1}{G}{G}"), spell("Bear", "{1}{G}", 2), land("forest", 28, ["G"])], "G");
    expect(n).toMatchObject({ pattern: "1C", basis: "shared", copies: 2 });
    expect(neededOf([commander(0, "{1}{G}{G}"), land("forest", 28, ["G"])], "G")).toBeNull();
  });

  it("counts only a published figure: a ceiling or an unpublished pattern gives none", () => {
    // {5}{G}{G}{G}{G}{G} has five pips: no row. 6C is a ceiling.
    expect(neededOf([spell("Big", "{G}{G}{G}{G}{G}", 3), land("forest", 20, ["G"])], "G")).toBeNull();
    expect(neededOf([spell("Huge", "{6}{G}", 3), land("forest", 20, ["G"])], "G")).toBeNull();
  });

  it("reads the ratio from the color's total sources, a dual counted for each color", () => {
    const n = neededOf([spell("A", "{1}{U}{U}"), spell("B", "{1}{U}{U}"), land("dual", 14, ["U", "G"]), land("island", 7, ["U"])], "U");
    expect(n?.ratio).toBeCloseTo(21 / 28);
  });
});

describe("readManaBalance: the order of colors for Improve my mana", () => {
  const order = (rows: ManaSupplyCardRow[], identity: string[]) => read(rows, tapped, identity).colorOrder.map((e) => `${e.color}:${e.kind}`);

  it("lists the colors tightest first, nothing preselected", () => {
    // Gishath's shape: G 28 sources against 28, R 27 against 22, W 26 against 15.
    const rows = [
      spell("g1", "{1}{G}{G}", 3), land("forest", 28, ["G"]),
      spell("r1", "{4}{R}{R}", 2), land("mountain", 27, ["R"]),
      spell("w1", "{4}{W}", 2), land("plains", 26, ["W"]),
    ];
    expect(order(rows, ["W", "R", "G"])).toEqual(["G:ranked", "R:ranked", "W:ranked"]);
  });

  it("breaks a tie on more pips with the commander, then W U B R G (Aang: green before white)", () => {
    // Both read 22 sources against 19 (1C). Green has 22 pips with the commander, white 20.
    const rows = [
      spell("w", "{1}{W}", 18), commander(0, "{1}{W}{W}"), land("plains", 22, ["W"]),
      spell("g", "{1}{G}", 21), commander(1, "{1}{G}"), land("forest", 22, ["G"]),
    ];
    const b = read(rows, tapped, ["W", "G"]);
    expect(color(b, "W").pips.withCommander).toBe(20);
    expect(color(b, "G").pips.withCommander).toBe(22);
    expect(color(b, "W").needed).toMatchObject({ requires: 19, ratio: 22 / 19 });
    expect(color(b, "G").needed).toMatchObject({ requires: 19, ratio: 22 / 19 });
    expect(b.colorOrder.map((e) => e.color)).toEqual(["G", "W"]);
  });

  it("falls to W U B R G when ratio and pips both tie", () => {
    const rows = [spell("w", "{1}{W}", 2), spell("u", "{1}{U}", 2), land("plains", 19, ["W"]), land("island", 19, ["U"])];
    expect(read(rows, tapped, ["U", "W"]).colorOrder.map((e) => e.color)).toEqual(["W", "U"]);
  });

  it("puts a white-light deck's white first (Blood Rites: white 24 against 26, black 30 against 30)", () => {
    const rows = [
      spell("kb", "{2}{W}{W}", 3), land("plains", 24, ["W"]),
      spell("bg", "{B}{B}", 3), land("swamp", 30, ["B"]),
      spell("march", "{W}{W}"),
    ];
    const o = read(rows, tapped, ["W", "B"]).colorOrder;
    expect(o.map((e) => e.color)).toEqual(["W", "B"]);
    // March of the Canonized's single CC (30) does not decide white's Needed.
    expect(o[0].needed).toMatchObject({ pattern: "2CC", requires: 26, basis: "shared" });
  });

  it("lists a one-color deck's color alone (Wizards)", () => {
    const rows = [spell("a", "{1}{U}{U}", 3), land("island", 37, ["U"])];
    expect(order(rows, ["U"])).toEqual(["U:ranked"]);
  });

  it("has no order for a colorless deck (Eldrazi): no door", () => {
    const rows = [spell("a", "{4}", 10), land("waste", 38, ["C"])];
    const b = read(rows, tapped, []);
    expect(b.state).toBe("colorless");
    expect(b.colorOrder).toEqual([]);
    expect(b.identity).toEqual([]);
  });

  it("puts a color with pips and no published pattern after every ranked color, and a pipless identity color last", () => {
    const rows = [
      spell("w", "{1}{W}", 4), land("plains", 20, ["W"]),
      spell("huge", "{6}{G}", 3), land("forest", 10, ["G"]),
    ];
    // U is in the identity with no pip; G has a pip and only a ceiling; W is ranked.
    expect(order(rows, ["W", "U", "G"])).toEqual(["W:ranked", "G:noPublished", "U:noPips"]);
  });

  it("does not list a color outside the commander's identity, however many sources it has", () => {
    const rows = [spell("g", "{1}{G}", 4), land("forest", 20, ["G"]), land("island", 3, ["U"])];
    const b = read(rows, tapped, ["G"]);
    expect(b.colorOrder.map((e) => e.color)).toEqual(["G"]);
    expect(b.identity).toEqual(["G"]);
  });

  it("orders by pips when no color has a source (every ratio is 0)", () => {
    const rows = [spell("w", "{1}{W}", 2), spell("u", "{1}{U}", 5)];
    const b = read(rows, tapped, ["W", "U"]);
    expect(b.state).toBe("noSources");
    expect(b.colorOrder.map((e) => e.color)).toEqual(["U", "W"]);
  });
});
