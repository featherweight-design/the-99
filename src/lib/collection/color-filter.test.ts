import { describe, it, expect } from "vitest";
import { buildColorOptions } from "./color-filter";
import type { BrowseListCard } from "./browse";

const card = (over: Partial<BrowseListCard> = {}): BrowseListCard => ({
  oracleId: "o-1",
  name: "Sol Ring",
  typeLine: "Artifact",
  manaCost: "{1}",
  rarity: "rare",
  colorIdentity: [],
  imageUri: null,
  printedName: null,
  quantity: 1,
  setCounts: [["BLB", 1]],
  primarySetCode: "BLB",
  ...over,
});

const noFilters = { search: "", colors: [], types: [], setCodes: [] };

const cards = [
  card({ oracleId: "a", colorIdentity: ["R"], quantity: 3 }),
  card({ oracleId: "b", colorIdentity: ["G"], typeLine: "Creature — Elf", quantity: 1 }),
  card({ oracleId: "c", colorIdentity: ["W", "U"], quantity: 2 }),
  card({ oracleId: "d", colorIdentity: [], quantity: 5 }),
];

describe("buildColorOptions", () => {
  it("lists WUBRG in order, named, with the letter as the hint", () => {
    expect(buildColorOptions(cards, noFilters).map((o) => [o.code, o.label, o.hint])).toEqual([
      ["W", "White", "W"],
      ["U", "Blue", "U"],
      ["B", "Black", "B"],
      ["R", "Red", "R"],
      ["G", "Green", "G"],
    ]);
  });

  it("counts owned quantities per color, counting a multicolor card under each of its colors", () => {
    const counts = Object.fromEntries(buildColorOptions(cards, noFilters).map((o) => [o.code, o.count]));
    expect(counts).toEqual({ W: 2, U: 2, B: 0, R: 3, G: 1 });
  });

  it("disables a color with no matches rather than dropping it", () => {
    const black = buildColorOptions(cards, noFilters).find((o) => o.code === "B")!;
    expect(black).toMatchObject({ count: 0, disabled: true });
  });

  it("counts under the other filters, but ignores the color selection itself", () => {
    const withColor = buildColorOptions(cards, { ...noFilters, colors: ["R"] });
    expect(withColor).toEqual(buildColorOptions(cards, noFilters));
  });

  it("counts under an active type filter", () => {
    const counts = Object.fromEntries(
      buildColorOptions(cards, { ...noFilters, types: ["Creature"] }).map((o) => [o.code, o.count]),
    );
    expect(counts).toEqual({ W: 0, U: 0, B: 0, R: 0, G: 1 });
  });

  it("ignores the free-text search, so counts hold still while typing", () => {
    expect(buildColorOptions(cards, { ...noFilters, search: "nothing matches this" })).toEqual(
      buildColorOptions(cards, noFilters),
    );
  });
});
