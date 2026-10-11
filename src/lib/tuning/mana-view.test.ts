import { describe, expect, it } from "vitest";

import { tuningHubCopy } from "../copy/tuning-hub";
import { colorRows } from "../mana/color-rows";
import { NO_TAPPED_LANDS } from "../mana/lands-tapped";
import type { ManaColor, ManaSupplyCardRow } from "../mana/supply";
import { shapeCount } from "./history";
import { readManaBalance } from "./mana-balance";
import { defaultPatternColor, hasColoredPip, isManaCountSummary, manaCountSummary, neededFor, pippedColors, toClientBalance } from "./mana-view";

const land = (id: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({ id, typeLine: "Land", manaCost: null, quantity, produces });
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });
const rock = (id: string, manaCost: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({ id, typeLine: "Artifact", manaCost, quantity, produces, ramp: true });
const read = (rows: ManaSupplyCardRow[]) => readManaBalance({ rows, nameOf: (id) => id, tapped: NO_TAPPED_LANDS, identity: ["W", "R", "G"] });

const deck = read([
  spell("Archdruid", "{1}{G}{G}", 2),
  spell("Armasaur", "{1}{G}{G}"),
  spell("Bolt", "{R}", 4),
  spell("Wrath", "{2}{W}{W}"),
  spell("Ring", "{C}{C}"),
  land("forest", 20, ["G"]),
  land("mountain", 8, ["R"]),
  rock("sol", "{1}", 2, ["C"]),
]);

describe("toClientBalance", () => {
  it("drops the per-copy source ids and keeps every figure", () => {
    const c = toClientBalance(deck);
    expect("sources" in c.supply).toBe(false);
    expect(c.supply.demand).toEqual(deck.supply.demand);
    expect(c.colors).toBe(deck.colors);
  });
});

describe("manaCountSummary", () => {
  it("is the Colors card's own totals, colorless included", () => {
    const { pipTotal, sourceTotal } = colorRows(deck.supply);
    expect(manaCountSummary(deck)).toEqual({ pips: pipTotal, sources: sourceTotal });
    // {C}{C} pips and two colorless rocks are in both figures, as on Deck stats.
    expect(manaCountSummary(deck)).toEqual({ pips: 2 * 2 + 2 + 4 + 2 + 2, sources: 20 + 8 + 2 });
  });

  it("is recognized by History, which reads it as the Colors card's denominator", () => {
    expect(isManaCountSummary({ pips: 3, sources: 4 })).toBe(true);
    expect(isManaCountSummary({ over: 3, roles: [] })).toBe(false);
    const row = shapeCount({ id: "x", tool: "mana_balance", createdAt: new Date(0), summary: { pips: 1, sources: 30 } });
    expect(row.summary).toEqual({ kind: "manaFree", pips: 1, sources: 30 });
    expect(tuningHubCopy.history.summary.manaFree(1, 30)).toBe("1 pip · 30 sources");
  });
});

describe("neededFor", () => {
  it("names the first card and counts the OTHER distinct cards, not copies", () => {
    const g = deck.colors.find((c) => c.color === "G")!;
    expect(g.needed?.pattern).toBe("1CC");
    expect(neededFor(g.needed!)).toEqual({ card: "Archdruid", more: 1, code: "1CC" });
  });
});

describe("the Hardest costs chips", () => {
  it("lists the pipped colors W U B R G, and opens on the one with the most pips", () => {
    expect(pippedColors(deck.colors)).toEqual(["W", "R", "G"]);
    expect(defaultPatternColor(deck.colors)).toBe("G");
  });

  it("breaks a tie in pips on W U B R G", () => {
    const tie = read([spell("a", "{R}{R}"), spell("b", "{W}{W}"), land("plains", 5, ["W"])]);
    expect(defaultPatternColor(tie.colors)).toBe("W");
  });

  it("has no chip color for a deck with no colored pip", () => {
    expect(defaultPatternColor(read([spell("a", "{2}"), land("wastes", 5, ["C"])]).colors)).toBeNull();
  });
});

describe("Mana Balance's counted strings", () => {
  it("say one in the singular", async () => {
    const { manaBalanceCopy: c } = await import("../copy/mana-balance");
    expect(c.table.split(1, 3)).toBe("1 land · 3 other");
    expect(c.table.colorless(1, 1, 4)).toBe("1 {C} pip · 1 source · 4%");
    expect(c.lands.averageNote("Tymna and Thrasios", 2)).toBe("counts Tymna and Thrasios as cards");
    expect(c.lands.averageNote("Gishath", 1)).toBe("counts Gishath as a card");
  });
});

describe("the source split and the tapped figure", () => {
  it("leaves a zero side out of the split", async () => {
    const { manaBalanceCopy: c } = await import("../copy/mana-balance");
    expect(c.table.split(3, 0)).toBe("3 lands");
    expect(c.table.split(0, 2)).toBe("2 other");
    expect(c.table.colorless(6, 10, null)).toBe("6 {C} pips · 10 sources");
  });

  it("counts the lands that can themselves enter tapped, never a fetcher", async () => {
    const { tappedTotal } = await import("./mana-view");
    expect(tappedTotal({ ...NO_TAPPED_LANDS, always: 2, unless: 3, fetch: 4 })).toBe(5);
  });
});

describe("hasColoredPip", () => {
  const cases: { name: string; rows: ManaSupplyCardRow[]; commander: string | null }[] = [
    { name: "a colored spell", rows: [spell("a", "{1}{G}")], commander: "{4}" },
    { name: "only a commander's pip", rows: [spell("a", "{3}")], commander: "{2}{R}" },
    { name: "colorless only", rows: [spell("a", "{C}{C}"), land("w", 9, ["C"])], commander: "{7}" },
    { name: "a Phyrexian or two-generic hybrid alone", rows: [spell("a", "{W/P}"), spell("b", "{2/U}")], commander: "{3}" },
    { name: "a land's cost never counts", rows: [{ id: "l", typeLine: "Land", manaCost: "{G}", quantity: 1, produces: ["G"] }], commander: null },
  ];
  for (const c of cases) {
    it(`agrees with the engine's colorless state: ${c.name}`, () => {
      const rows = c.commander ? [...c.rows, { id: "commander:0", typeLine: "Legendary Creature", manaCost: c.commander, quantity: 1 }] : c.rows;
      const engine = readManaBalance({ rows, nameOf: (id) => id, tapped: NO_TAPPED_LANDS, identity: [] }).state !== "colorless";
      const view = hasColoredPip(c.rows.map((r) => ({ typeLine: r.typeLine, manaCost: r.manaCost })), c.commander ? [{ manaCost: c.commander }] : []);
      expect(view).toBe(engine);
    });
  }
});
