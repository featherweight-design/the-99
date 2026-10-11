import { describe, expect, it } from "vitest";

import { tuningHubCopy } from "../copy/tuning-hub";
import { colorRows } from "../mana/color-rows";
import { NO_TAPPED_LANDS } from "../mana/lands-tapped";
import type { ManaColor, ManaSupplyCardRow } from "../mana/supply";
import { shapeCount } from "./history";
import { readManaBalance } from "./mana-balance";
import { defaultPatternColor, isManaCountSummary, manaCountSummary, neededFor, pippedColors, toClientBalance } from "./mana-view";

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
