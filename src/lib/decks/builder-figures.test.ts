import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { findingArtOf, ledgerAvailabilityOf, runFiguresOf } from "./builder-figures";
import type { Availability } from "../cards/availability";
import type { DeckDetailCard } from "./grouping";
import { roleCounterFor } from "./label-role-counts";
import type { RecommendedMix } from "./mix";
import type { DeckCommander } from "./read";

const avail = { owned: 2, hard: 0, soft: 0, free: 2, claims: [] } as unknown as Availability;
const row = (name: string, extra: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId: `o-${name}`, name, typeLine: "Creature", cardTypeGroup: "Creatures", role: "other", cmc: 2, owned: true, quantity: 1, auto: false,
  printedName: null, printedSetCode: null, printedCollectorNumber: null, imageUri: `img-${name}`, availability: avail, ...extra,
});
const commander = (name: string, extra: Partial<DeckCommander> = {}): DeckCommander =>
  ({ oracleId: `o-${name}`, name, typeLine: "Legendary Creature", colorIdentity: ["R"], imageUri: `img-${name}`, ...extra }) as unknown as DeckCommander;

describe("ledgerAvailabilityOf", () => {
  it("marks each row's and commander's copies, a proxied slot with none, and an absent `owned` commander as owned", () => {
    const out = ledgerAvailabilityOf(
      [row("Owned"), row("Proxied", { proxied: true }), row("Bought", { owned: false, availability: null })],
      commander("Ashling"),
      commander("Pair", { owned: false, availability: avail }),
    );
    expect([...out]).toEqual([
      ["o-Owned", { owned: true, availability: avail }],
      ["o-Proxied", { owned: false, availability: null }],
      ["o-Bought", { owned: false, availability: null }],
      ["o-Ashling", { owned: true, availability: null }],
      ["o-Pair", { owned: false, availability: avail }],
    ]);
  });
});

describe("findingArtOf", () => {
  it("names each row and commander by its printed name, with its own art", () => {
    const out = findingArtOf([row("Bolt", { printedName: "Flavor Bolt" }), row("Plain", { imageUri: null })], commander("Ashling"), null);
    expect([...out]).toEqual([
      ["o-Bolt", { name: "Flavor Bolt", imageUri: "img-Bolt" }],
      ["o-Plain", { name: "Plain", imageUri: null }],
      ["o-Ashling", { name: "Ashling", imageUri: "img-Ashling" }],
    ]);
  });
});

describe("runFiguresOf", () => {
  const cell = (target: number) => ({ label: `L${target}`, target, advisory: false });
  const mix = { cells: { ramp: cell(10), draw: cell(9), removal: cell(8), wipes: cell(3), land: cell(36) }, types: null } as unknown as RecommendedMix;
  const cards = [row("Elf", { quantity: 2, role: "ramp" }), row("Forest", { typeLine: "Basic Land — Forest", cardTypeGroup: "Lands", role: "land", quantity: 30 })];

  it("counts copies per type group, and each role's have (as the strip counts it) against the mix's target", () => {
    const { runFigures, roleFigures } = runFiguresOf(cards, null, mix);
    expect(runFigures.typeCounts).toEqual({ Creatures: 2, Lands: 30 });
    const have = roleCounterFor(null)(cards);
    expect(roleFigures.map((r) => [r.role, r.label, r.have, r.target, r.advisory])).toEqual(
      (["ramp", "draw", "removal", "wipes", "land"] as const).map((role) => [role, mix.cells[role].label, have[role], mix.cells[role].target, false]),
    );
    // One array, so the hub's role figures and the run's heads cannot disagree.
    expect(runFigures.roles).toBe(roleFigures);
  });
});

describe("the builder derives them through these functions", () => {
  const shell = readFileSync(join(process.cwd(), "src/components/decks/builder-shell.tsx"), "utf8");
  it("calls each one, and builds none of them inline again", () => {
    expect(shell).toMatch(/ledgerAvailabilityOf\(cards, deck\.commander, deck\.partner\)/);
    expect(shell).toMatch(/findingArtOf\(cards, deck\.commander, deck\.partner\)/);
    expect(shell).toMatch(/runFiguresOf\(cards, labelRows, mix\)/);
    expect(shell).not.toMatch(/typeCounts:/);
    expect(shell).not.toMatch(/owned: c\.owned && !c\.proxied/);
  });
});
