import { describe, expect, it } from "vitest";
import { preconAlternates, type AlternateRow } from "./alternates";

const row = (name: string, over: Partial<AlternateRow> = {}): AlternateRow => ({
  oracleId: `id-${name}`, name, isCommander: false, foilQuantity: 0, commanderLegal: true,
  typeLine: "Legendary Creature — Elf", oracleText: null, manaCost: "{2}{G}", layout: "normal", ...over,
});

describe("preconAlternates", () => {
  it("takes foil main-board cards that can lead a deck, sorted by name", () => {
    const rows = [row("Zed", { foilQuantity: 1 }), row("Abe", { foilQuantity: 1 }), row("Plain", { typeLine: "Creature — Elf", foilQuantity: 1 })];
    expect(preconAlternates(rows)).toEqual(["Abe", "Zed"]);
  });

  it("leaves out the face commander and its partner, even when they are foil", () => {
    const rows = [row("Face", { isCommander: true, foilQuantity: 1 }), row("Face", { foilQuantity: 1 }), row("Alt", { foilQuantity: 1 })];
    expect(preconAlternates(rows)).toEqual(["Alt"]);
  });

  it("leaves out a legendary card held only in non-foil, and one that is not commander legal", () => {
    const rows = [row("Nonfoil"), row("Banned", { foilQuantity: 1, commanderLegal: false })];
    expect(preconAlternates(rows)).toEqual([]);
  });

  it("counts a card once however many printings carry its foil copy", () => {
    const rows = [row("Alt", { foilQuantity: 1 }), row("Alt", { foilQuantity: 0 })];
    expect(preconAlternates(rows)).toEqual(["Alt"]);
  });
});
