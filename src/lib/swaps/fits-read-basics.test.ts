import { describe, expect, it } from "vitest";

import type { ManaSupplyCardRow } from "../mana/supply";
import { readManaBalance } from "../tuning/mana-balance";
import { NO_TAPPED_LANDS } from "../mana/lands-tapped";
import { fairBasicCuts } from "./fits-read-basics";

const FOREST = "forest";
const MOUNTAIN = "mountain";
const land = (id: string, sub: string, color: string, quantity: number): ManaSupplyCardRow =>
  ({ id, typeLine: `Basic Land — ${sub}`, manaCost: null, quantity, produces: [color as "G"] });
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow =>
  ({ id, typeLine: "Creature — Elf", manaCost, quantity, produces: [] });

/** A Gruul deck: easy green, hard red. */
function rows(forests: number, mountains: number): ManaSupplyCardRow[] {
  return [
    land(FOREST, "Forest", "G", forests),
    land(MOUNTAIN, "Mountain", "R", mountains),
    spell("g", "{1}{G}", 30),
    spell("r", "{R}{R}{R}", 30),
    { id: "commander:0", typeLine: "Legendary Creature", manaCost: "{R}{G}", quantity: 1 },
  ];
}
const nameOf = (id: string) => id;
const identity = ["R", "G"];

// The figures, as Mana Balance reads them: 38 lands; green 20 sources against 19 Needed, red 18
// against 36 (short).
describe("fairBasicCuts (Hugh, 2026-10-12: over the land target, and the color not short)", () => {
  const fair = (forests: number, landTarget: number, subjectIsLand = false) =>
    fairBasicCuts({ rows: rows(forests, 18), nameOf, identity, landTarget, subjectIsLand });

  it("reads the figures the cases are built on", () => {
    const b = readManaBalance({ rows: rows(20, 18), nameOf, tapped: NO_TAPPED_LANDS, identity });
    expect(b.lands.count).toBe(38);
    expect(b.colors.filter((c) => identity.includes(c.color)).map((c) => [c.color, c.sources.total, c.needed?.requires]))
      .toEqual([["R", 18, 36], ["G", 20, 19]]);
  });

  it("lets a basic go when the deck is over its land target and the color keeps its Needed", () => {
    expect(fair(20, 37)).toEqual([FOREST]);
  });

  it("never lets a short color's basic go, however many lands the deck runs", () => {
    expect(fair(20, 30)).not.toContain(MOUNTAIN);
  });

  it("refuses every basic at the land target, and lets one go there when a land comes in for it", () => {
    expect(fair(20, 38)).toEqual([]);
    expect(fair(20, 38, true)).toEqual([FOREST]);
  });

  it("never cuts Wastes, whose colorless sources Mana Balance has no Needed for", () => {
    const wastes = { id: "wastes", typeLine: "Basic Land", manaCost: null, quantity: 10, produces: ["C" as "G"] };
    expect(fairBasicCuts({ rows: [wastes, ...rows(20, 18)], nameOf, identity, landTarget: 30, subjectIsLand: false })).not.toContain("wastes");
  });

  it("never cuts the last copy of a basic, whose loss a basic-land search would also feel", () => {
    const one = [land(FOREST, "Forest", "G", 1), ...rows(0, 18).slice(1)];
    expect(fairBasicCuts({ rows: one, nameOf, identity: ["R"], landTarget: 10, subjectIsLand: true })).toEqual([]);
  });

  it("refuses a basic whose cut leaves its color under its Needed, even with lands to spare", () => {
    expect(fair(19, 30)).toEqual([]);
  });
});
